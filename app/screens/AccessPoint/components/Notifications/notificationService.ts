import { Platform } from 'react-native';
import notifee, { 
  EventType, 
  AndroidImportance,
  Event,
  InitialNotification
} from '@notifee/react-native';

/**
 * Check current notification permission status
 * @returns Promise<number> - Authorization status (0 = not determined, 1 = authorized, -1 = denied)
 */
export async function checkNotificationPermission(): Promise<number> {
  try {
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus;
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return 0;
  }
}

/**
 * Request notification permissions with user-friendly prompt
 * Always requests permission if not already granted
 * @returns Promise<boolean> - true if permissions granted, false otherwise
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // Check current permission status
    const currentStatus = await checkNotificationPermission();
    
    // If already authorized, return true
    if (currentStatus === 1) {
      return true;
    }
    
    // If denied, we can't request again (user must go to settings)
    if (currentStatus === -1) {
      console.warn('Notification permissions were previously denied. User must enable in settings.');
      return false;
    }
    
    // Request permissions (status is 0 = not determined)
    // This will show the system permission dialog
    const settings = await notifee.requestPermission({
      sound: true,
      alert: true,
      badge: true,
    });
    
    if (settings.authorizationStatus >= 1) {
      console.log('Notification permissions granted');
      return true;
    } else {
      console.warn('Notification permissions not granted. Status:', settings.authorizationStatus);
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Initialize notification permissions and settings
 * Automatically shows a welcome notification when permission is granted
 * This will prompt the user for notification permission on first app launch
 * @returns Promise<boolean> - true if permissions granted, false otherwise
 */
export async function initializeNotifications(): Promise<boolean> {
  try {
    // Check current permission status before requesting
    const previousStatus = await checkNotificationPermission();
    
    // Always request permissions - this will show the system dialog if not already granted
    // If already granted (status === 1), requestNotificationPermission will return early
    const hasPermission = await requestNotificationPermission();
    
    if (!hasPermission) {
      console.warn('Notification permissions not granted. User may need to enable in device settings.');
      return false;
    }

    // Create a default channel for Android
    if (Platform.OS === 'android') {
      try {
        await notifee.createChannel({
          id: 'default',
          name: 'Default',
          importance: AndroidImportance.HIGH,
          vibration: true,
          vibrationPattern: [300, 500],
          lights: true,
          lightColor: '#FF231F7C',
          sound: 'default',
          showBadge: true,
        });
      } catch (channelError: any) {
        // Suppress keep-awake errors
        const errorMsg = channelError?.message || String(channelError) || '';
        if (!errorMsg.toLowerCase().includes('keep awake')) {
          console.error('Error creating notification channel:', channelError);
        }
      }
    }

    // If permission was just granted (wasn't granted before), show welcome notification
    if (previousStatus < 1 && hasPermission) {
      // Show notification automatically when permission is granted
      setTimeout(async () => {
        try {
          await displayNotification(
            'AccessPoint Notifications Enabled',
            'You will now receive important notifications from AccessPoint in your notification tray.',
            {
              type: 'welcome',
              timestamp: Date.now(),
            }
          );
        } catch (error: any) {
          // Suppress keep-awake errors
          const errorMsg = error?.message || String(error) || '';
          if (!errorMsg.toLowerCase().includes('keep awake')) {
            console.error('Error showing welcome notification:', error);
          }
        }
      }, 500); // Small delay to ensure channel is ready
    }

    return true;
  } catch (error: any) {
    // Suppress keep-awake errors
    const errorMsg = error?.message || String(error) || '';
    if (!errorMsg.toLowerCase().includes('keep awake')) {
      console.error('Error initializing notifications:', error);
    }
    return false;
  }
}

/**
 * Add a listener for when notifications are received or interacted with while app is in foreground
 * @param callback - Function to call when notification event occurs
 * @returns Function to unsubscribe from events
 */
export function addNotificationReceivedListener(
  callback: (event: Event) => void
): () => void {
  return notifee.onForegroundEvent(callback);
}

/**
 * Add a listener for when user taps on a notification
 * This handles foreground notification taps
 * Note: Background events should be registered separately using registerBackgroundEventHandler
 * @param callback - Function to call when notification is tapped
 * @returns Function to unsubscribe from events
 */
export function addNotificationResponseListener(
  callback: (event: Event) => void
): () => void {
  // Handle foreground events (including taps)
  return notifee.onForegroundEvent((event) => {
    if (event.type === EventType.PRESS || event.type === EventType.ACTION_PRESS) {
      callback(event);
    }
  });
}

/**
 * Register a background event handler
 * This must be called at the app entry point (index.js/tsx), not inside a component
 * @param handler - Function to handle background events
 */
export function registerBackgroundEventHandler(
  handler: (event: Event) => Promise<void>
): void {
  notifee.onBackgroundEvent(handler);
}

/**
 * Get the initial notification if app was opened from a notification
 * @returns Promise<InitialNotification | null>
 */
export async function getInitialNotification(): Promise<InitialNotification | null> {
  return await notifee.getInitialNotification();
}

/**
 * Display a notification using Notifee
 * Notifications will always show in the notification tray
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Additional data to attach to the notification
 * @returns Promise<string> - Notification ID
 */
export async function displayNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<string> {
  try {
    // Ensure we have permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    // Create or get the channel
    let channelId: string;
    try {
      channelId = await notifee.createChannel({
        id: 'default',
        name: 'Default',
        importance: AndroidImportance.HIGH,
        vibration: true,
        vibrationPattern: [300, 500],
        lights: true,
        lightColor: '#FF231F7C',
        sound: 'default',
        showBadge: true,
      });
    } catch (channelError: any) {
      // Suppress keep-awake errors, but still try to use default channel
      const errorMsg = channelError?.message || String(channelError) || '';
      if (!errorMsg.toLowerCase().includes('keep awake')) {
        console.error('Error creating channel:', channelError);
      }
      channelId = 'default'; // Fallback to default channel ID
    }

    // Display notification with settings to ensure it shows in tray
    return await notifee.displayNotification({
    title,
    body,
    data: {
      ...data,
      type: data?.type || 'default',
      timestamp: Date.now(),
      // Add navigation data to open app when tapped
      navigation: true,
    },
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      // Notification will stay in tray even after being tapped
      autoCancel: false, // Don't auto-dismiss when tapped - stays in tray
      showTimestamp: true, // Show timestamp
      timestamp: Date.now(),
      // Make it visible
      visibility: 1, // Public visibility (shows on lock screen)
      pressAction: {
        id: 'default',
        launchActivity: 'default', // Opens the app when tapped
      },
      // Style for better visibility (BigText for longer messages)
      style: {
        type: 1, // BigText style
        text: body, // The text to display
      },
      // Wake up device and show notification
      wakeUp: true,
      // Show notification even when app is in background
      ongoing: false,
    },
    ios: {
      // iOS specific settings
      sound: 'default',
      badge: true,
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
      },
    },
  });
  } catch (error: any) {
    // Suppress keep-awake errors
    const errorMsg = error?.message || String(error) || '';
    if (errorMsg.toLowerCase().includes('keep awake')) {
      // Silently handle keep-awake errors - they're harmless
      console.warn('Keep-awake error suppressed (harmless)');
      // Return a dummy ID so the app doesn't break
      return 'notification-' + Date.now();
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Display a chat message notification
 * Specifically designed for chat messages with report_id navigation
 * @param messageContent - The message content to display
 * @param reportId - The report ID to navigate to when notification is tapped
 * @param senderType - The type of sender (police_office, admin, user)
 * @returns Promise<string> - Notification ID
 */
export async function displayChatNotification(
  messageContent: string,
  reportId: string,
  senderType: 'user' | 'police_office' | 'admin' = 'police_office'
): Promise<string> {
  try {
    // Ensure we have permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    // Create or get the chat channel for Android
    let channelId: string = 'chat';
    if (Platform.OS === 'android') {
      try {
        channelId = await notifee.createChannel({
          id: 'chat',
          name: 'Chat Messages',
          description: 'Notifications for new chat messages',
          importance: AndroidImportance.HIGH,
          vibration: true,
          vibrationPattern: [300, 500],
          lights: true,
          lightColor: '#FF6666',
          sound: 'default',
          showBadge: true,
        });
      } catch (channelError: any) {
        // Suppress keep-awake errors, but still try to use chat channel
        const errorMsg = channelError?.message || String(channelError) || '';
        if (!errorMsg.toLowerCase().includes('keep awake')) {
          console.error('Error creating chat channel:', channelError);
        }
        channelId = 'chat'; // Fallback to chat channel ID
      }
    }

    // Determine notification title based on sender type
    const title = senderType === 'police_office' 
      ? 'New Message from Support' 
      : senderType === 'admin' 
      ? 'New Message from Admin'
      : 'New Message';

    // Truncate message if too long
    const truncatedMessage = messageContent.length > 100 
      ? messageContent.substring(0, 100) + '...' 
      : messageContent;

    // Display notification with settings to ensure it shows in tray
    const notificationId = await notifee.displayNotification({
      title,
      body: truncatedMessage,
      data: {
        type: 'chat_message',
        report_id: reportId,
        sender_type: senderType,
        timestamp: Date.now(),
        navigation: true,
      },
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        // Notification will stay in tray even after being tapped
        autoCancel: true, // Auto-dismiss when tapped (standard behavior)
        showTimestamp: true, // Show timestamp
        timestamp: Date.now(),
        // Make it visible
        visibility: 1, // Public visibility (shows on lock screen)
        pressAction: {
          id: 'open_chat',
          launchActivity: 'default', // Opens the app when tapped
        },
        // Style for better visibility (BigText for longer messages)
        style: {
          type: 1, // BigText style
          text: messageContent, // The full text to display
        },
        // Wake up device and show notification
        wakeUp: true,
        // Show notification even when app is in background
        ongoing: false,
        // Small icon for notification
        smallIcon: 'ic_notification',
      },
      ios: {
        // iOS specific settings
        sound: 'default',
        badge: true,
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
        categoryId: 'chat',
      },
    });

    // Verify notification was displayed
    if (__DEV__) {
      try {
        const displayedNotifications = await notifee.getDisplayedNotifications();
        const isDisplayed = displayedNotifications.some(n => n.id === notificationId);
        if (isDisplayed) {
          console.log('✅ Chat notification displayed successfully in tray:', notificationId);
        } else {
          console.warn('⚠️ Chat notification may not be visible in tray:', notificationId);
        }
      } catch (checkError) {
        console.warn('Could not verify notification display:', checkError);
      }
    }

    return notificationId;
  } catch (error: any) {
    // Suppress keep-awake errors
    const errorMsg = error?.message || String(error) || '';
    if (errorMsg.toLowerCase().includes('keep awake')) {
      // Silently handle keep-awake errors - they're harmless
      console.warn('Keep-awake error suppressed (harmless)');
      // Return a dummy ID so the app doesn't break
      return 'notification-' + Date.now();
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Display a prompt notification using Notifee
 * This creates a prominent notification that appears in the notification tray
 * Useful for important alerts, prompts, or messages
 * @param title - Notification title
 * @param body - Notification body/message
 * @param data - Additional data to attach to the notification
 * @returns Promise<string> - Notification ID
 */
export async function promptNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<string> {
  try {
    // Ensure we have permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    // Create or get the prompt channel for Android
    let channelId: string = 'prompt';
    if (Platform.OS === 'android') {
      try {
        channelId = await notifee.createChannel({
          id: 'prompt',
          name: 'Prompts & Alerts',
          description: 'Important prompts and alerts',
          importance: AndroidImportance.HIGH,
          vibration: true,
          vibrationPattern: [300, 500],
          lights: true,
          lightColor: '#FF6666',
          sound: 'default',
          showBadge: true,
        });
      } catch (channelError: any) {
        const errorMsg = channelError?.message || String(channelError) || '';
        if (!errorMsg.toLowerCase().includes('keep awake')) {
          console.error('Error creating prompt channel:', channelError);
        }
        channelId = 'prompt'; // Fallback
      }
    }

    // Display prompt notification with prominent settings
    const notificationId = await notifee.displayNotification({
      title,
      body,
      data: {
        ...data,
        type: data?.type || 'prompt',
        timestamp: Date.now(),
        navigation: true,
      },
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        // Make it prominent and visible
        autoCancel: true, // Auto-dismiss when tapped
        showTimestamp: true,
        timestamp: Date.now(),
        visibility: 1, // Public visibility (shows on lock screen)
        pressAction: {
          id: 'open_app',
          launchActivity: 'default', // Opens the app when tapped
        },
        // Style for better visibility
        style: {
          type: 1, // BigText style
          text: body, // The full text to display
        },
        // Wake up device and show notification
        wakeUp: true,
        // Small icon
        smallIcon: 'ic_notification',
        // Color for notification
        color: '#FF6666',
      },
      ios: {
        sound: 'default',
        badge: true,
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
        categoryId: 'prompt',
      },
    });

    if (__DEV__) {
      console.log('✅ Prompt notification displayed:', notificationId);
    }

    return notificationId;
  } catch (error: any) {
    const errorMsg = error?.message || String(error) || '';
    if (errorMsg.toLowerCase().includes('keep awake')) {
      console.warn('Keep-awake error suppressed (harmless)');
      return 'prompt-' + Date.now();
    }
    console.error('Error displaying prompt notification:', error);
    throw error;
  }
}

/**
 * Test notification - Use this to verify notifications are working
 * Call this function to manually trigger a test notification
 * @returns Promise<string> - Notification ID
 */
export async function testNotification(): Promise<string> {
  try {
    console.log('🧪 Testing notification display...');
    const notificationId = await displayNotification(
      'Test Notification',
      'If you see this, notifications are working!',
      {
        type: 'test',
        timestamp: Date.now(),
      }
    );
    console.log('✅ Test notification sent with ID:', notificationId);
    
    // Verify it's displayed
    try {
      const displayed = await notifee.getDisplayedNotifications();
      console.log('📋 Currently displayed notifications:', displayed.length);
      if (displayed.length > 0) {
        console.log('✅ Notification is in tray!');
      } else {
        console.warn('⚠️ Notification not found in tray');
      }
    } catch (checkError) {
      console.warn('Could not check displayed notifications:', checkError);
    }
    
    return notificationId;
  } catch (error) {
    console.error('❌ Test notification failed:', error);
    throw error;
  }
}

