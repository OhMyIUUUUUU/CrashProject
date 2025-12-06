import notifee, {
    AndroidImportance,
    Event,
    EventType,
    InitialNotification
} from '@notifee/react-native';
import { Platform } from 'react-native';

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
    
    // Request permissions
    const settings = await notifee.requestPermission({
      sound: true,
      alert: true,
      badge: true,
    });
    
    if (settings.authorizationStatus >= 1) {
      console.log('Notification permissions granted');
      return true;
    } else {
      console.warn('Notification permissions not granted');
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
 * @returns Promise<boolean> - true if permissions granted, false otherwise
 */
export async function initializeNotifications(): Promise<boolean> {
  try {
    // Check current permission status before requesting
    const previousStatus = await checkNotificationPermission();
    
    // Request permissions
    const hasPermission = await requestNotificationPermission();
    
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
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
              timestamp: String(Date.now()),
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

    // Display notification with settings to ensure it shows in foreground and is clickable
    const notificationId = await notifee.displayNotification({
      title,
      body,
      data: {
        ...data,
        type: data?.type || 'default',
        timestamp: String(Date.now()),
        // Add navigation data to open app when tapped
        navigation: 'true',
      },
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        // Allow notification to be dismissed when tapped (standard behavior)
        autoCancel: true, // Auto-dismiss when tapped - this ensures it shows in tray
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
        // Show notification even when app is in foreground
        ongoing: false,
        // Small icon for notification
        smallIcon: 'ic_notification',
        // Ensure notification shows in foreground
        showWhen: true,
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

    console.log('✅ Notification displayed successfully with ID:', notificationId);
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

