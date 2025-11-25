import { EventType } from '@notifee/react-native';
import NetInfo from '@react-native-community/netinfo';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useRef, ErrorInfo, ReactNode } from 'react';
import { Alert, AppState, View, Text } from 'react-native';
import { AuthProvider } from './contexts/AuthContext';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getInitialNotification,
  initializeNotifications,
  registerBackgroundEventHandler
} from './screens/AccessPoint/components/Notifications/notificationService';
import { onBackgroundNotificationEvent } from '../notifications/backgroundHandler';

function RootLayoutContent() {
  const router = useRouter();
  const segments = useSegments();
  const notificationUnsubscribe = useRef<(() => void) | null>(null);
  const responseUnsubscribe = useRef<(() => void) | null>(null);
  const rejectionHandlerRef = useRef<((event: PromiseRejectionEvent | any) => void) | null>(null);
  const originalConsoleErrorRef = useRef<typeof console.error | null>(null);
  const networkUnsubscribe = useRef<(() => void) | null>(null);
  const isNavigatingToOffline = useRef(false);

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
      
      // Ensure app is in foreground
      if (AppState.currentState !== 'active') {
        // App will be brought to foreground automatically
        // Wait a bit for app to be ready
        setTimeout(() => {
          handleNavigation(notificationData, notification);
        }, 500);
      } else {
        handleNavigation(notificationData, notification);
      }
    } catch (error) {
      console.error('Error handling notification tap:', error);
    }
  }, [handleNavigation]);

  useEffect(() => {
    // Helper function to check if error is keep-awake related
    const isKeepAwakeError = (error: any): boolean => {
      const errorMessage = error?.message || String(error) || '';
      const errorString = errorMessage.toLowerCase();
      return (
        errorString.includes('keep awake') || 
        errorString.includes('keep-awake') || 
        errorString.includes('unable to activate keep awake') ||
        errorString.includes('activate keep awake') ||
        errorString.includes('keepawake')
      );
    };

    // Handle unhandled promise rejections (e.g., expo-keep-awake errors)
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
    const originalRejectionHandler = (global as any).__onUnhandledRejection;
    (global as any).__onUnhandledRejection = (id: number, error: Error) => {
      // Suppress expo-keep-awake errors - silently ignore
      if (isKeepAwakeError(error)) {
        // Silently suppress - don't log
        return;
      }
      
      // Call original handler for other errors
      if (originalRejectionHandler) {
        originalRejectionHandler(id, error);
      } else {
        console.error('Unhandled promise rejection:', error);
      }
    };

    // Also catch errors at the ErrorUtils level (React Native)
    const originalErrorHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
    if ((global as any).ErrorUtils) {
      (global as any).ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        // Suppress keep-awake errors
        if (isKeepAwakeError(error)) {
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

    // Also override console.error temporarily to filter keep-awake errors
    // Only override if not already overridden to prevent issues
    if (!originalConsoleErrorRef.current) {
      originalConsoleErrorRef.current = console.error.bind(console);
    }
    
    // Only override if not already done (prevent multiple overrides)
    if (console.error === originalConsoleErrorRef.current) {
      console.error = (...args: any[]) => {
        try {
          const errorString = args.map(arg => {
            try {
              return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
            } catch {
              return String(arg);
            }
          }).join(' ').toLowerCase();
          
          if (isKeepAwakeError({ message: errorString })) {
            // Suppress keep-awake errors from console
            return;
          }
          
          // Call original console.error for other errors
          if (originalConsoleErrorRef.current) {
            originalConsoleErrorRef.current.apply(console, args);
          }
        } catch (overrideError) {
          // If override fails, just log normally
          if (originalConsoleErrorRef.current) {
            originalConsoleErrorRef.current.apply(console, args);
          }
        }
      };
    }

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
    if (errorMsg.toLowerCase().includes('keep awake') || 
        errorMsg.toLowerCase().includes('keep-awake')) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Suppress keep-awake errors
    const errorMsg = error?.message || String(error) || '';
    if (errorMsg.toLowerCase().includes('keep awake') || 
        errorMsg.toLowerCase().includes('keep-awake')) {
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
