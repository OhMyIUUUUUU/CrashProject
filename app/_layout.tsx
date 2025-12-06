import { EventType } from '@notifee/react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { ErrorInfo, ReactNode, useEffect, useRef } from 'react';
import { AppState, Text, View } from 'react-native';
import { onBackgroundNotificationEvent } from '../notifications/backgroundHandler';
import { AuthProvider } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import {
    addNotificationReceivedListener,
    addNotificationResponseListener,
    displayNotification,
    getInitialNotification,
    initializeNotifications,
    registerBackgroundEventHandler
} from './screens/AccessPoint/components/Notifications/notificationService';
import { foregroundLocationService } from './services/foregroundLocationService';

// Configure expo-notifications to show alerts in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Show alert/banner in foreground (heads-up display)
    shouldPlaySound: true, // Play sound
    shouldSetBadge: true, // Update app badge
  }),
});

function RootLayoutContent() {
  const router = useRouter();
  const segments = useSegments();
  const notificationUnsubscribe = useRef<(() => void) | null>(null);
  const responseUnsubscribe = useRef<(() => void) | null>(null);
  const rejectionHandlerRef = useRef<((event: PromiseRejectionEvent | any) => void) | null>(null);
  const originalConsoleErrorRef = useRef<typeof console.error | null>(null);
  const networkUnsubscribe = useRef<(() => void) | null>(null);
  const isNavigatingToOffline = useRef(false);
  const messageChannelRef = useRef<any>(null);

  // Use useCallback to memoize handlers and prevent re-renders
  const handleNavigation = React.useCallback((notificationData: any, notification: any) => {
    try {
      // Navigate based on notification type
      if (notificationData?.type === 'navigation' || notificationData?.navigation) {
        // Navigate to notification screen with the notification data
        const params = {
          notificationData: JSON.stringify({
            title: notification?.title || notificationData?.title,
            body: notification?.body || notificationData?.body,
            data: notificationData,
            date: new Date().toLocaleString(),
          }),
        };
        
        router.push({
          pathname: '/screens/Notifications/Notifications',
          params,
        });
      } else {
        // Default: Navigate to Home or show notification details
        router.push('/screens/Home/Home');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback navigation
      try {
        router.push('/screens/Home/Home');
      } catch (fallbackError) {
        console.error('Fallback navigation also failed:', fallbackError);
      }
    }
  }, [router]);

  const handleNotificationTap = React.useCallback((event: any) => {
    try {
      console.log('Notification tapped:', event);
      
      // Get notification data
      const notification = event.detail?.notification || event.notification;
      const notificationData = notification?.data;
      
      // Navigate based on notification type
      if (notificationData?.type === 'message' && notificationData?.report_id) {
        // Navigate to chat screen for message notifications
        router.push({
          pathname: '/screens/Home/ChatScreen',
          params: { report_id: notificationData.report_id },
        });
      } else {
        // Use default navigation handler
        if (AppState.currentState !== 'active') {
          // App will be brought to foreground automatically
          // Wait a bit for app to be ready
          setTimeout(() => {
            handleNavigation(notificationData, notification);
          }, 500);
        } else {
          handleNavigation(notificationData, notification);
        }
      }
    } catch (error) {
      console.error('Error handling notification tap:', error);
    }
  }, [handleNavigation, router]);

  useEffect(() => {
    // Helper function to check if error is keep-awake related
    const isKeepAwakeError = (error: any): boolean => {
      if (!error) return false;
      const errorMessage = error?.message || error?.toString() || String(error) || '';
      const errorString = errorMessage.toLowerCase();
      const errorStack = error?.stack?.toLowerCase() || '';
      return (
        errorString.includes('keep awake') || 
        errorString.includes('keep-awake') || 
        errorString.includes('unable to activate keep awake') ||
        errorString.includes('activate keep awake') ||
        errorString.includes('keepawake') ||
        errorStack.includes('keep awake') ||
        errorStack.includes('keep-awake')
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
    const handleUnhandledRejection = (event: PromiseRejectionEvent | any) => {
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
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
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
      (global as any).__fbBatchedBridge.callNative = function(module: string, method: string, args: any[]) {
        // Intercept console.error calls
        if (module === 'RCTLog' && method === 'logIfNoNativeHook') {
          const logLevel = args?.[0];
          const message = args?.[1] || '';
          // Suppress keep-awake error logs
          if (logLevel === 'error' && typeof message === 'string') {
            const msgLower = message.toLowerCase();
            if (msgLower.includes('keep awake') || 
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

    // Override console.error to filter keep-awake errors BEFORE they're logged
    // This is critical because React Native logs errors before our handlers catch them
    if (!originalConsoleErrorRef.current) {
      originalConsoleErrorRef.current = console.error.bind(console);
    }
    
    // Only override if not already done (prevent multiple overrides)
    if (console.error === originalConsoleErrorRef.current) {
      console.error = (...args: any[]) => {
        try {
          // Check all arguments for keep-awake related content
          const errorString = args.map(arg => {
            try {
              if (arg instanceof Error) {
                return (arg.message || arg.toString() || '').toLowerCase();
              }
              return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
            } catch {
              return String(arg);
            }
          }).join(' ').toLowerCase();
          
          // Check if this is a keep-awake error
          if (errorString.includes('keep awake') || 
              errorString.includes('keep-awake') ||
              errorString.includes('unable to activate keep awake') ||
              errorString.includes('activate keep awake')) {
            // Suppress keep-awake errors from console - don't log at all
            return;
          }
          
          // Check if this is a network error (expected in offline mode)
          if (errorString.includes('network request failed') ||
              errorString.includes('networkerror') ||
              errorString.includes('failed to fetch') ||
              errorString.includes('network error') ||
              errorString.includes('fetch failed') ||
              errorString.includes('whatwg-fetch')) {
            // Suppress network errors from console - don't log at all
            return;
          }
          
          // Also check individual arguments
          for (const arg of args) {
            if (arg instanceof Error) {
              if (isKeepAwakeError(arg) || isNetworkError(arg)) {
                return; // Suppress
              }
            } else if (typeof arg === 'string') {
              if (isKeepAwakeError({ message: arg }) || isNetworkError({ message: arg })) {
                return; // Suppress
              }
            }
          }
          
          // Log other errors normally
          originalConsoleErrorRef.current(...args);
        } catch {
          // If filtering fails, log normally to avoid breaking error reporting
          originalConsoleErrorRef.current(...args);
        }
      };
    }
    
    // Also override console.warn to catch keep-awake warnings and network errors
    const originalConsoleWarn = console.warn.bind(console);
    console.warn = (...args: any[]) => {
      try {
        const errorString = args.map(arg => String(arg)).join(' ').toLowerCase();
        if (errorString.includes('keep awake') || 
            errorString.includes('keep-awake') ||
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

    // Register background notification handler
    // This must be called before any other notification code
    registerBackgroundEventHandler(onBackgroundNotificationEvent);

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
        router.replace('/screens/AccessPoint/components/OfflineEmergency/OfflineEmergency');
        // Reset flag after navigation
        setTimeout(() => {
          isNavigatingToOffline.current = false;
        }, 2000);
      } else if (isConnected && isOfflineScreen) {
        // Connection restored while on offline screen - let OfflineEmergency handle the redirect
        isNavigatingToOffline.current = false;
      }
    });

    // Initialize notification service and request permissions on app start
    // Wrap in try-catch to handle keep-awake errors
    (async () => {
      try {
        const success = await initializeNotifications();
        if (success) {
          console.log('Notifications initialized successfully');
          
          // Check if app was opened from a notification
          try {
            const initialNotification = await getInitialNotification();
            if (initialNotification) {
              console.log('App opened from notification:', initialNotification);
              handleNotificationTap(initialNotification);
            }
          } catch (error: any) {
            // Suppress keep-awake related errors
            const errorMsg = error?.message || String(error) || '';
            if (!errorMsg.toLowerCase().includes('keep awake') && 
                !errorMsg.toLowerCase().includes('unable to activate keep awake')) {
              console.error('Error getting initial notification:', error);
            }
          }
        } else {
          console.warn('Notification permissions were not granted');
        }
      } catch (error: any) {
        // Suppress keep-awake related errors
        const errorMsg = error?.message || String(error) || '';
        if (!errorMsg.toLowerCase().includes('keep awake') && 
            !errorMsg.toLowerCase().includes('unable to activate keep awake')) {
          console.error('Error initializing notifications:', error);
        }
      }
    })();

    // Set up listener for when notification is received while app is open
    notificationUnsubscribe.current = addNotificationReceivedListener((event) => {
      console.log('Notification event:', event);
      
      if (event.type === EventType.DELIVERED) {
        console.log('Notification delivered:', event.detail.notification);
      }
    });

    // Set up listener for when user taps on notification
    responseUnsubscribe.current = addNotificationResponseListener((event) => {
      handleNotificationTap(event);
    });

    // Set up global listener for new messages to show notifications in foreground
    const setupMessageNotifications = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

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
                
                // Only show notification if message is for current user (receiver_id matches)
                // and not from current user (sender_id doesn't match)
                if (newMessage.receiver_id === currentUserId && newMessage.sender_id !== currentUserId) {
                  // Show notification in foreground - always show, even if app is active
                  await displayNotification(
                    'New Message',
                    newMessage.message_content || 'You have a new message',
                    {
                      type: 'message',
                      report_id: String(newMessage.report_id),
                      message_id: String(newMessage.message_id),
                      navigation: 'true',
                    }
                  );
                }
              } catch (error) {
                console.error('Error showing message notification:', error);
              }
            }
          )
          .subscribe();

        console.log('✅ Global message notification listener set up');
      } catch (error) {
        console.error('Error setting up message notifications:', error);
      }
    };

    // Set up message notifications after a short delay to ensure auth is ready
    setTimeout(() => {
      setupMessageNotifications();
    }, 2000);

    // Cleanup listeners on unmount
    return () => {
      if (notificationUnsubscribe.current) {
        notificationUnsubscribe.current();
        notificationUnsubscribe.current = null;
      }
      if (responseUnsubscribe.current) {
        responseUnsubscribe.current();
        responseUnsubscribe.current = null;
      }
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
          if (typeof window !== 'undefined' && window.removeEventListener && rejectionHandlerRef.current) {
            window.removeEventListener('unhandledrejection', rejectionHandlerRef.current);
          }
          // Restore original console.error
          if (originalConsoleErrorRef.current && console.error !== originalConsoleErrorRef.current) {
            console.error = originalConsoleErrorRef.current;
          }
        };
      }, [router, handleNotificationTap, handleNavigation, segments]);

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
          name="screens/AccessPoint/components/SplashScreen/SplashScreen" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/AccessPoint/components/Login/Login" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/AccessPoint/components/Register/Register" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/Home/Home" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/Home/Profile" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/Home/Report" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/AccessPoint/components/OfflineEmergency/OfflineEmergency" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/Notifications/Notifications" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/AccessPoint/components/UserDataDemo/UserDataDemo" 
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
