import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { ErrorInfo, ReactNode, useEffect, useRef } from 'react';
import { LogBox, Text, View } from 'react-native';
import { getFCMToken, showMessageNotification, startPersistentNotification } from './components/Notifications/NotificationService';
import { AuthProvider } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { foregroundLocationService } from './services/foregroundLocationService';

// Configure foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Suppress keep-awake errors in LogBox (React Native's error overlay)
if (LogBox) {
  LogBox.ignoreLogs([
    /keep awake/i,
    /keep-awake/i,
    /unable to activate keep awake/i,
    /activate keep awake/i,
    /uncaught.*in promise.*keep awake/i,
    /id:.*keep awake/i,
  ]);
}

// Type declarations for web APIs (used in web platform)
declare const window: any;

// Set up global error handlers early to catch keep-awake errors
// This runs before any components mount to catch errors as early as possible
if (typeof console !== 'undefined' && console.error) {
  const originalConsoleError = console.error.bind(console);
  // Store reference for potential restoration
  (console as any).__originalError = originalConsoleError;

  console.error = (...args: any[]) => {
    try {
      // Convert all args to string and combine, handling Error objects, arrays, and nested structures
      const errorString = args.map(arg => {
        try {
          if (arg instanceof Error) {
            // Get full error details including message, name, stack
            return (arg.message || arg.name || arg.toString() || '').toLowerCase();
          }
          if (Array.isArray(arg)) {
            return arg.map(item => String(item)).join(' ').toLowerCase();
          }
          if (typeof arg === 'object' && arg !== null) {
            // Try to extract error message from nested objects
            const msg = (arg as any)?.message || (arg as any)?.reason?.message || (arg as any)?.error?.message;
            if (msg) return String(msg).toLowerCase();
            return JSON.stringify(arg).toLowerCase();
          }
          return String(arg).toLowerCase();
        } catch {
          return String(arg).toLowerCase();
        }
      }).join(' ').toLowerCase();

      // Suppress keep-awake errors (including expo-modules-core format and "in promise" format)
      // Check for various formats including "[Error: Uncaught (in promise, id: X) Error: Unable to activate keep awake]"
      if (errorString.includes('keep awake') ||
        errorString.includes('keep-awake') ||
        errorString.includes('keepawake') ||
        errorString.includes('unable to activate keep awake') ||
        errorString.includes('activate keep awake') ||
        errorString.includes('unable to activate') && errorString.includes('keep') ||
        (errorString.includes('uncaught') && (errorString.includes('keep awake') || errorString.includes('keep-awake') || errorString.includes('keepawake'))) ||
        (errorString.includes('in promise') && (errorString.includes('keep awake') || errorString.includes('keep-awake') || errorString.includes('keepawake'))) ||
        (errorString.includes('uncaught (in promise') && (errorString.includes('keep awake') || errorString.includes('keep-awake') || errorString.includes('keepawake'))) ||
        (errorString.includes('expo-modules-core') && (errorString.includes('keep awake') || errorString.includes('keep-awake') || errorString.includes('keepawake'))) ||
        (errorString.includes('id:') && (errorString.includes('keep awake') || errorString.includes('keep-awake') || errorString.includes('keepawake'))) ||
        (errorString.includes('[error:') && (errorString.includes('keep awake') || errorString.includes('keep-awake') || errorString.includes('keepawake')))) {
        return; // Suppress - don't log
      }

      // Suppress network errors
      if (errorString.includes('network request failed') ||
        errorString.includes('networkerror') ||
        errorString.includes('failed to fetch')) {
        return; // Suppress
      }

      originalConsoleError(...args);
    } catch {
      originalConsoleError(...args);
    }
  };
}

function RootLayoutContent() {
  const router = useRouter();
  const segments = useSegments();
  const rejectionHandlerRef = useRef<((event: any) => void) | null>(null);
  const originalConsoleErrorRef = useRef<typeof console.error | null>(null);
  const networkUnsubscribe = useRef<(() => void) | null>(null);
  const isNavigatingToOffline = useRef(false);
  const messageChannelRef = useRef<any>(null);


  useEffect(() => {
    // Helper function to check if error is keep-awake related
    const isKeepAwakeError = (error: any): boolean => {
      if (!error) return false;

      // Get error message from various possible locations
      const errorMessage = error?.message || error?.reason?.message || error?.toString() || String(error) || '';
      const errorString = errorMessage.toLowerCase();
      const errorStack = error?.stack?.toLowerCase() || error?.reason?.stack?.toLowerCase() || '';
      const errorName = error?.name?.toLowerCase() || error?.reason?.name?.toLowerCase() || '';
      const errorCode = error?.code?.toLowerCase() || error?.reason?.code?.toLowerCase() || '';

      // Check nested error if present
      const nestedError = error?.reason || error?.error;
      const nestedErrorString = nestedError ? (nestedError?.message || nestedError?.toString() || String(nestedError) || '').toLowerCase() : '';

      // Combine all error strings for comprehensive checking
      const allErrorText = (errorString + ' ' + nestedErrorString + ' ' + errorStack + ' ' + errorName + ' ' + errorCode).toLowerCase();

      // Check for keep-awake errors in various formats
      // Including "Uncaught (in promise, id: X) Error: Unable to activate keep awake"
      return (
        errorString.includes('keep awake') ||
        errorString.includes('keep-awake') ||
        errorString.includes('unable to activate keep awake') ||
        errorString.includes('activate keep awake') ||
        errorString.includes('keepawake') ||
        nestedErrorString.includes('keep awake') ||
        nestedErrorString.includes('keep-awake') ||
        nestedErrorString.includes('unable to activate keep awake') ||
        (errorString.includes('uncaught') && (errorString.includes('keep awake') || errorString.includes('keep-awake'))) ||
        (errorString.includes('in promise') && (errorString.includes('keep awake') || errorString.includes('keep-awake'))) ||
        (errorString.includes('uncaught (in promise') && (errorString.includes('keep awake') || errorString.includes('keep-awake'))) ||
        (errorString.includes('id:') && (errorString.includes('keep awake') || errorString.includes('keep-awake'))) ||
        errorStack.includes('keep awake') ||
        errorStack.includes('keep-awake') ||
        errorStack.includes('expo-keep-awake') ||
        (errorStack.includes('expo-modules-core') && (errorString.includes('keep awake') || errorString.includes('keep-awake'))) ||
        errorName.includes('keepawake') ||
        errorCode.includes('keepawake') ||
        // Check combined text for any keep-awake mentions
        allErrorText.includes('keep awake') ||
        allErrorText.includes('keep-awake') ||
        // Also check the full error object string representation
        JSON.stringify(error || {}).toLowerCase().includes('keep awake') ||
        JSON.stringify(error || {}).toLowerCase().includes('keep-awake')
      );
    };

    // Helper function to check if error is network-related (expected in offline mode)
    const isNetworkError = (error: any): boolean => {
      if (!error) return false;
      const errorMessage = error?.message || error?.toString() || String(error) || '';
      const errorString = errorMessage.toLowerCase();
      const errorStack = error?.stack?.toLowerCase() || '';
      return (
        errorString.includes('network request failed') ||
        errorString.includes('networkerror') ||
        errorString.includes('failed to fetch') ||
        errorString.includes('network error') ||
        errorString.includes('fetch failed') ||
        error?.name === 'TypeError' && errorString.includes('network') ||
        error?.name === 'NetworkError' ||
        errorStack.includes('whatwg-fetch') ||
        errorStack.includes('fetch.umd.js')
      );
    };

    // Handle unhandled promise rejections (e.g., expo-keep-awake errors, network errors)
    const handleUnhandledRejection = (event: any) => {
      const error = event?.reason || event;

      // Suppress expo-keep-awake errors as they're typically harmless
      if (isKeepAwakeError(error)) {
        // Silently suppress - don't even log to avoid console noise
        if (event?.preventDefault) {
          event.preventDefault();
        }
        if (event?.stopPropagation) {
          event.stopPropagation();
        }
        return;
      }

      // Suppress network errors (expected in offline mode)
      if (isNetworkError(error)) {
        // Silently suppress - network errors are expected when offline
        if (event?.preventDefault) {
          event.preventDefault();
        }
        if (event?.stopPropagation) {
          event.stopPropagation();
        }
        return;
      }

      // Log other unhandled rejections for debugging
      console.error('Unhandled promise rejection:', error);
    };

    // Store handler in ref for cleanup
    rejectionHandlerRef.current = handleUnhandledRejection;

    // Add global error handlers for web (only if window.addEventListener exists)
    if (typeof window !== 'undefined' && (window as any)?.addEventListener) {
      (window as any).addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    // Handle React Native promise rejections (using global handler)
    // React Native doesn't have window, but we can catch at the global level
    // This is the key handler for React Native's native promise rejection system
    const originalRejectionHandler = (global as any).__onUnhandledRejection;
    (global as any).__onUnhandledRejection = (id: number, error: Error | any) => {
      // Suppress expo-keep-awake errors - silently ignore
      if (isKeepAwakeError(error)) {
        // Silently suppress - don't log, don't call original handler
        return;
      }

      // Suppress network errors (expected in offline mode)
      if (isNetworkError(error)) {
        // Silently suppress - network errors are expected when offline
        return;
      }

      // Call original handler for other errors
      if (originalRejectionHandler) {
        originalRejectionHandler(id, error);
      } else {
        console.error('Unhandled promise rejection:', error);
      }
    };

    // Also intercept React Native's console.error for promise rejections
    // React Native logs "ERROR [Error: ...]" before our handlers catch it
    const originalRNLog = (global as any).__fbBatchedBridge?.callNative;
    if ((global as any).__fbBatchedBridge) {
      const originalCallNative = (global as any).__fbBatchedBridge.callNative;
      (global as any).__fbBatchedBridge.callNative = function (module: string, method: string, args: any[]) {
        // Intercept console.error calls
        if (module === 'RCTLog' && method === 'logIfNoNativeHook') {
          const logLevel = args?.[0];
          const message = args?.[1] || '';
          // Suppress keep-awake error logs (including "Uncaught (in promise, id: X)" format)
          if (logLevel === 'error' && typeof message === 'string') {
            const msgLower = message.toLowerCase();
            // Check for keep-awake errors in various formats
            if (msgLower.includes('keep awake') ||
              msgLower.includes('keep-awake') ||
              msgLower.includes('keepawake') ||
              msgLower.includes('unable to activate keep awake') ||
              msgLower.includes('activate keep awake') ||
              msgLower.includes('unable to activate') && msgLower.includes('keep') ||
              (msgLower.includes('uncaught') && (msgLower.includes('keep awake') || msgLower.includes('keep-awake') || msgLower.includes('keepawake'))) ||
              (msgLower.includes('in promise') && (msgLower.includes('keep awake') || msgLower.includes('keep-awake') || msgLower.includes('keepawake'))) ||
              (msgLower.includes('uncaught (in promise') && (msgLower.includes('keep awake') || msgLower.includes('keep-awake') || msgLower.includes('keepawake'))) ||
              (msgLower.includes('id:') && (msgLower.includes('keep awake') || msgLower.includes('keep-awake') || msgLower.includes('keepawake'))) ||
              (msgLower.includes('[error:') && (msgLower.includes('keep awake') || msgLower.includes('keep-awake') || msgLower.includes('keepawake'))) ||
              (msgLower.includes('expo-modules-core') && (msgLower.includes('keep awake') || msgLower.includes('keep-awake') || msgLower.includes('keepawake'))) ||
              msgLower.includes('network request failed') ||
              msgLower.includes('networkerror') ||
              msgLower.includes('failed to fetch')) {
              return; // Don't log this error
            }
          }
        }
        return originalCallNative.apply(this, arguments);
      };
    }

    // Also catch errors at the ErrorUtils level (React Native)
    // This catches errors before they reach the console
    const originalErrorHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
    if ((global as any).ErrorUtils) {
      (global as any).ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        // Suppress keep-awake errors
        if (isKeepAwakeError(error)) {
          // Silently suppress
          return;
        }

        // Suppress network errors (expected in offline mode)
        if (isNetworkError(error)) {
          // Silently suppress
          return;
        }

        // Call original handler for other errors
        if (originalErrorHandler) {
          originalErrorHandler(error, isFatal);
        } else {
          console.error('Global error:', error);
        }
      });
    }

    // Store reference to the original console.error (already overridden at module level)
    // This ensures we can restore it if needed during cleanup
    if (!originalConsoleErrorRef.current) {
      originalConsoleErrorRef.current = (console as any).__originalError || console.error.bind(console);
    }

    // Also override console.warn to catch keep-awake warnings and network errors
    const originalConsoleWarn = console.warn.bind(console);
    console.warn = (...args: any[]) => {
      try {
        const errorString = args.map(arg => String(arg)).join(' ').toLowerCase();
        if (errorString.includes('keep awake') ||
          errorString.includes('keep-awake') ||
          errorString.includes('keepawake') ||
          errorString.includes('unable to activate keep awake') ||
          (errorString.includes('id:') && (errorString.includes('keep awake') || errorString.includes('keep-awake'))) ||
          errorString.includes('network request failed') ||
          errorString.includes('networkerror') ||
          errorString.includes('failed to fetch')) {
          return; // Suppress
        }
        originalConsoleWarn(...args);
      } catch {
        originalConsoleWarn(...args);
      }
    };

    // Monitor network connectivity globally
    // Redirect to offline mode if connection is lost
    networkUnsubscribe.current = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;

      // Get current route path from segments
      const currentPath = segments.join('/');
      const isOfflineScreen = currentPath.includes('OfflineEmergency');
      const isSplashScreen = currentPath.includes('SplashScreen');
      const isLoginScreen = currentPath.includes('Login');

      if (!isConnected && !isOfflineScreen && !isSplashScreen && !isLoginScreen && !isNavigatingToOffline.current) {
        isNavigatingToOffline.current = true;
        router.replace('/components/OfflineEmergency/OfflineEmergency');
        // Reset flag after navigation
        setTimeout(() => {
          isNavigatingToOffline.current = false;
        }, 2000);
      } else if (isConnected && isOfflineScreen) {
        // Connection restored while on offline screen - let OfflineEmergency handle the redirect
        isNavigatingToOffline.current = false;
      }
    });

    // Set up global listener for new messages
    const setupMessageNotifications = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        // Fetch and save FCM token
        const token = await getFCMToken();
        if (token) {
          const { error } = await supabase
            .from('tbl_users')
            .update({ fcm_token: token })
            .eq('user_id', session.user.id);

          if (error) {
            console.error('Error saving FCM token to database:', error);
          } else {
            console.log('✅ FCM Token saved to database');
          }
        }

        // Remove existing channel if any
        if (messageChannelRef.current) {
          supabase.removeChannel(messageChannelRef.current);
        }

        // Subscribe to all messages for the current user
        messageChannelRef.current = supabase
          .channel('global-messages')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'tbl_messages',
            },
            async (payload) => {
              try {
                const newMessage = payload.new as any;
                const currentUserId = session.user.id;

                // Only process if message is for current user (receiver_id matches)
                // and not from current user (sender_id doesn't match)
                if (newMessage.receiver_id === currentUserId && newMessage.sender_id !== currentUserId) {
                  // Message received - show notification
                  console.log('New message received:', newMessage);
                  if (newMessage.message_content) {
                    await showMessageNotification(
                      'New Message', // You might want to fetch sender name ideally
                      newMessage.message_content,
                      newMessage.report_id
                    );
                  }
                }
              } catch (error) {
                console.error('Error processing new message:', error);
              }
            }
          )
          .subscribe();

        console.log('✅ Global message listener set up');
      } catch (error) {
        console.error('Error setting up message listener:', error);
      }
    };

    // Set up message listener after a short delay to ensure auth is ready
    setTimeout(() => {
      setupMessageNotifications();
    }, 2000);

    // Start persistent notification after app initialization
    setTimeout(() => {
      startPersistentNotification().catch((error) => {
        console.error('Error starting persistent notification:', error);
      });
    }, 3000);

    // Cleanup listeners on unmount
    return () => {
      if (networkUnsubscribe.current) {
        networkUnsubscribe.current();
        networkUnsubscribe.current = null;
      }
      // Cleanup message channel
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
      // Cleanup foreground location service
      foregroundLocationService.cleanup().catch((error) => {
        console.error('Error cleaning up foreground service:', error);
      });
      // Remove global error handlers
      if (typeof window !== 'undefined' && (window as any)?.removeEventListener && rejectionHandlerRef.current) {
        (window as any).removeEventListener('unhandledrejection', rejectionHandlerRef.current);
      }
      // Restore original console.error
      if (originalConsoleErrorRef.current && console.error !== originalConsoleErrorRef.current) {
        console.error = originalConsoleErrorRef.current;
      }
    };
  }, [router, segments]);

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/SplashScreen/SplashScreen"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/Login/Login"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/Register/Register"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="screens/Home"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="screens/Profile"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="screens/Report"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/OfflineEmergency/OfflineEmergency"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/UserDataDemo/UserDataDemo"
          options={{ headerShown: false }}
        />
      </Stack>
    </AuthProvider>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Suppress keep-awake errors
    const errorMsg = error?.message || String(error) || '';
    const errorLower = errorMsg.toLowerCase();
    if (errorLower.includes('keep awake') ||
      errorLower.includes('keep-awake') ||
      errorLower.includes('network request failed') ||
      errorLower.includes('networkerror') ||
      errorLower.includes('failed to fetch')) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Suppress keep-awake errors and network errors
    const errorMsg = error?.message || String(error) || '';
    const errorLower = errorMsg.toLowerCase();
    if (errorLower.includes('keep awake') ||
      errorLower.includes('keep-awake') ||
      errorLower.includes('network request failed') ||
      errorLower.includes('networkerror') ||
      errorLower.includes('failed to fetch')) {
      return;
    }
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootLayoutContent />
    </ErrorBoundary>
  );
}
