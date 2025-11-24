import notifee, { Event, EventType } from '@notifee/react-native';
import { Platform, AppState } from 'react-native';

/**
 * Background notification event handler
 * This handles notifications when the app is in the background or closed
 * Must be registered at the app entry point (index.js/tsx)
 */
export async function onBackgroundNotificationEvent(event: Event): Promise<void> {
  const { type, detail } = event;
  
  console.log('Background notification event:', type, detail);

  // Handle notification press/action
  if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
    const notification = detail.notification;
    const data = notification?.data;

    console.log('Background notification tapped:', notification);

    // The app will be opened automatically when notification is tapped
    // We can handle navigation here if needed
    if (data) {
      // Store notification data to be processed when app opens
      // This will be handled by getInitialNotification() in _layout.tsx
      console.log('Notification data:', data);
    }
  }

  // Dismiss the notification after handling (optional)
  if (detail.notification?.id) {
    // Don't auto-dismiss - let user see it in notification tray
    // await notifee.cancelNotification(detail.notification.id);
  }
}

