import { EventType } from '@notifee/react-native';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
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
  const notificationUnsubscribe = useRef<(() => void) | null>(null);
  const responseUnsubscribe = useRef<(() => void) | null>(null);
  const rejectionHandlerRef = useRef<((event: PromiseRejectionEvent | any) => void) | null>(null);

  const handleNotificationTap = (event: any) => {
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
  };

  const handleNavigation = (notificationData: any, notification: any) => {
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
  };

  useEffect(() => {
    // Handle unhandled promise rejections (e.g., expo-keep-awake errors)
    const handleUnhandledRejection = (event: PromiseRejectionEvent | any) => {
      const error = event?.reason || event;
      const errorMessage = error?.message || String(error) || '';
      const errorString = errorMessage.toLowerCase();
      
      // Suppress expo-keep-awake errors as they're typically harmless
      if (errorString.includes('keep awake') || 
          errorString.includes('keep-awake') || 
          errorString.includes('unable to activate keep awake') ||
          errorString.includes('activate keep awake')) {
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
      const errorMessage = error?.message || String(error) || '';
      const errorString = errorMessage.toLowerCase();
      
      // Suppress expo-keep-awake errors - silently ignore
      if (errorString.includes('keep awake') || 
          errorString.includes('keep-awake') || 
          errorString.includes('unable to activate keep awake') ||
          errorString.includes('activate keep awake')) {
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
        const errorMessage = error?.message || String(error) || '';
        const errorString = errorMessage.toLowerCase();
        
        // Suppress keep-awake errors
        if (errorString.includes('keep awake') || 
            errorString.includes('keep-awake') || 
            errorString.includes('unable to activate keep awake') ||
            errorString.includes('activate keep awake')) {
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

    // Register background notification handler
    // This must be called before any other notification code
    registerBackgroundEventHandler(onBackgroundNotificationEvent);

    // Initialize notification service and request permissions on app start
    initializeNotifications().then((success) => {
      if (success) {
        console.log('Notifications initialized successfully');
        
        // Check if app was opened from a notification
        getInitialNotification().then((initialNotification) => {
          if (initialNotification) {
            console.log('App opened from notification:', initialNotification);
            handleNotificationTap(initialNotification);
          }
        }).catch((error) => {
          // Suppress keep-awake related errors
          if (!error?.message?.includes('keep awake')) {
            console.error('Error getting initial notification:', error);
          }
        });
      } else {
        console.warn('Notification permissions were not granted');
      }
    }).catch((error) => {
      // Suppress keep-awake related errors
      if (!error?.message?.includes('keep awake')) {
        console.error('Error initializing notifications:', error);
      }
    });

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
      }
      if (responseUnsubscribe.current) {
        responseUnsubscribe.current();
      }
      // Remove global error handlers
      if (typeof window !== 'undefined' && window.removeEventListener && rejectionHandlerRef.current) {
        window.removeEventListener('unhandledrejection', rejectionHandlerRef.current);
      }
    };
  }, [router]);

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

export default function RootLayout() {
  return <RootLayoutContent />;
}
