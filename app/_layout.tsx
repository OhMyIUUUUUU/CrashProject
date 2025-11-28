import { EventType } from '@notifee/react-native';
import notifee from '@notifee/react-native';
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
  registerBackgroundEventHandler,
  displayChatNotification
} from './screens/AccessPoint/components/Notifications/notificationService';
import { onBackgroundNotificationEvent } from '../notifications/backgroundHandler';
import { supabase } from './lib/supabase';

function RootLayoutContent() {
  const router = useRouter();
  const segments = useSegments();
  const notificationUnsubscribe = useRef<(() => void) | null>(null);
  const responseUnsubscribe = useRef<(() => void) | null>(null);
  const rejectionHandlerRef = useRef<((event: PromiseRejectionEvent | any) => void) | null>(null);
  const originalConsoleErrorRef = useRef<typeof console.error | null>(null);
  const networkUnsubscribe = useRef<(() => void) | null>(null);
  const isNavigatingToOffline = useRef(false);
  const globalChatChannelRef = useRef<any>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const currentRouteRef = useRef<string>('');
  const appStateSubscriptionRef = useRef<any>(null);
  const authSubscriptionRef = useRef<any>(null);
  const foregroundUnsubscribeRef = useRef<(() => void) | null>(null);

  // Use useCallback to memoize handlers and prevent re-renders
  const handleNavigation = React.useCallback((notificationData: any, notification: any) => {
    try {
      // Handle chat message notifications
      if (notificationData?.type === 'chat_message' && notificationData?.report_id) {
        // Navigate to ChatScreen with the report_id
        router.push({
          pathname: '/screens/Home/ChatScreen',
          params: { report_id: notificationData.report_id },
        });
        return;
      }
      
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

    // Check for initial notification (if app was opened from a notification)
    // Note: Notification permission is already requested in index.tsx
    // This is just to handle the case where app was opened from a notification
    (async () => {
      try {
        // Check if app was opened from a notification
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

    // Set up foreground event handler for notification taps
    // This handles when user taps a notification while app is in foreground
    foregroundUnsubscribeRef.current = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('User tapped foreground notification', detail.notification);
        
        // Navigate to home page when notification is tapped
        try {
          router.push('/screens/Home/Home');
        } catch (error) {
          console.error('Error navigating to home:', error);
        }
      }
    });

    // Update current route ref when segments change
    currentRouteRef.current = segments.join('/');

    // Function to set up global chat message listener
    // Note: Supabase real-time subscriptions work when app is in background (not killed)
    // but may not work when app is completely closed. For true background notifications
    // when app is closed, you would need a push notification service (FCM, OneSignal, etc.)
    const setupGlobalChatListener = async () => {
      try {
        // Get current user ID
        const { data: { session } } = await supabase.auth.getSession();
        currentUserIdRef.current = session?.user?.id || null;

        if (!currentUserIdRef.current) {
          if (__DEV__) {
            console.log('No user session, skipping global chat listener setup');
          }
          return;
        }

        // Remove existing channel if any
        if (globalChatChannelRef.current) {
          supabase.removeChannel(globalChatChannelRef.current);
        }

        // Listen for all new messages
        const channel = supabase
          .channel('global-chat-messages', {
            config: {
              // Enable presence for better connection management
              presence: {
                key: currentUserIdRef.current,
              },
            },
          })
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
                
                if (__DEV__) {
                  console.log('New message received in global listener:', newMessage);
                }
                
                // Check if message is from police_office or admin (not from current user)
                const isFromSupport = newMessage.sender_type === 'police_office' || newMessage.sender_type === 'admin';
                const isFromCurrentUser = newMessage.sender_id === currentUserIdRef.current;
                
                // Check if this message is for a report that belongs to the current user
                const { data: reportData } = await supabase
                  .from('tbl_reports')
                  .select('reporter_id')
                  .eq('report_id', newMessage.report_id)
                  .single();
                
                const isUserReport = reportData?.reporter_id === currentUserIdRef.current;
                
                // Check if user is currently viewing this chat screen
                const currentPath = currentRouteRef.current || segments.join('/');
                const isOnChatScreen = currentPath.includes('ChatScreen');
                
                // Check app state
                const currentAppState = AppState.currentState;
                const isAppInBackground = currentAppState !== 'active';
                
                if (__DEV__) {
                  console.log('Message notification check:', {
                    isFromSupport,
                    isFromCurrentUser,
                    isUserReport,
                    isOnChatScreen,
                    isAppInBackground,
                    appState: currentAppState,
                  });
                }
                
                // Show notification if:
                // 1. Message is from support/admin AND not from current user
                // 2. This is the user's report
                // 3. App is in background OR user is not currently viewing this chat screen
                const shouldShowNotification = 
                  isFromSupport && 
                  !isFromCurrentUser && 
                  isUserReport && 
                  (isAppInBackground || !isOnChatScreen);
                
                if (shouldShowNotification) {
                  if (__DEV__) {
                    console.log('📨 Showing chat notification for message:', newMessage.message_content);
                    console.log('📨 Report ID:', newMessage.report_id);
                    console.log('📨 Sender type:', newMessage.sender_type);
                  }
                  try {
                    const notificationId = await displayChatNotification(
                      newMessage.message_content,
                      newMessage.report_id,
                      newMessage.sender_type
                    );
                    if (__DEV__) {
                      console.log('✅ Notification sent with ID:', notificationId);
                    }
                  } catch (notifError) {
                    console.error('❌ Error displaying chat notification:', notifError);
                  }
                } else {
                  if (__DEV__) {
                    console.log('⏭️ Skipping notification:', {
                      isFromSupport,
                      isFromCurrentUser,
                      isUserReport,
                      isOnChatScreen,
                      isAppInBackground,
                    });
                  }
                }
              } catch (error) {
                // Log errors for debugging
                if (__DEV__) {
                  console.error('Error in global chat listener:', error);
                }
              }
            }
          )
          .subscribe((status) => {
            if (__DEV__) {
              console.log('Global chat channel subscription status:', status);
            }
            // Re-subscribe if connection is lost
            if (status === 'SUBSCRIBED') {
              if (__DEV__) {
                console.log('Global chat listener subscribed successfully');
              }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              if (__DEV__) {
                console.warn('Global chat channel error, attempting to re-subscribe...');
              }
              // Retry subscription after a delay
              setTimeout(() => {
                setupGlobalChatListener();
              }, 3000);
            }
          });

        globalChatChannelRef.current = channel;
      } catch (error) {
        if (__DEV__) {
          console.error('Error setting up global chat listener:', error);
        }
      }
    };

    // Set up global chat message listener
    setupGlobalChatListener();

    // Monitor AppState to re-subscribe when app comes to foreground
    appStateSubscriptionRef.current = AppState.addEventListener('change', (nextAppState) => {
      if (__DEV__) {
        console.log('App state changed:', nextAppState);
      }
      
      // When app comes to foreground, ensure subscription is active
      if (nextAppState === 'active') {
        // Re-setup listener to ensure it's connected
        setTimeout(() => {
          setupGlobalChatListener();
        }, 1000);
      }
    });

    // Listen for auth state changes to update user ID and re-setup listener
    authSubscriptionRef.current = supabase.auth.onAuthStateChange((event, session) => {
      currentUserIdRef.current = session?.user?.id || null;
      // Re-setup listener when auth state changes
      if (session?.user?.id) {
        setupGlobalChatListener();
      }
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
      // Unsubscribe from foreground events
      if (foregroundUnsubscribeRef.current) {
        foregroundUnsubscribeRef.current();
        foregroundUnsubscribeRef.current = null;
      }
      if (networkUnsubscribe.current) {
        networkUnsubscribe.current();
        networkUnsubscribe.current = null;
      }
      // Remove global chat channel
      if (globalChatChannelRef.current) {
        supabase.removeChannel(globalChatChannelRef.current);
        globalChatChannelRef.current = null;
      }
      // Remove AppState listener
      if (appStateSubscriptionRef.current) {
        appStateSubscriptionRef.current.remove();
        appStateSubscriptionRef.current = null;
      }
      // Remove auth subscription
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.data.subscription.unsubscribe();
        authSubscriptionRef.current = null;
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

  // Update route ref when segments change
  useEffect(() => {
    currentRouteRef.current = segments.join('/');
  }, [segments]);

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
