import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const startPersistentNotification = async () => {
  // 1. Request permissions (required for Android 13+)
  await notifee.requestPermission();

  // 2. Create a channel
  const channelId = await notifee.createChannel({
    id: 'app_shortcut_channel',
    name: 'App Running Channel',
    importance: AndroidImportance.LOW, // Low importance = No sound, just the icon
  });

  // 3. Display the notification
  await notifee.displayNotification({
    id: 'persistent_notification', // ID allows us to update/cancel it later
    title: 'App is Running',
    body: 'Tap to return to application',
    android: {
      channelId,
      asForegroundService: true, // This is crucial for keeping it alive
      ongoing: true,             // Prevents user from swiping it away
      autoCancel: false,         // Notification stays when tapped
      pressAction: {
        id: 'default',           // 'default' ID opens the app automatically
      },
      // Use mipmap icon (ic_launcher is the default app icon name in Android)
      smallIcon: 'ic_launcher',
      // color: '#4caf50',
    },
  });
};

export const stopPersistentNotification = async () => {
  // Stops the service and removes the notification
  await notifee.stopForegroundService();
};

export const showMessageNotification = async (title: string, body: string, reportId?: string) => {
  await notifee.requestPermission();

  const channelId = await notifee.createChannel({
    id: 'messages_v2', // Changed ID to force update
    name: 'Messages with Sound',
    importance: AndroidImportance.HIGH,
    sound: 'alert_sound', // Matches filename in res/raw (without extension)
  });

  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
      // If you want to group notifications
      style: { type: AndroidStyle.BIGTEXT, text: body },
      smallIcon: 'ic_launcher',
      sound: 'alert_sound', // Play sound in foreground
    },
    data: {
      reportId: reportId || '',
      type: 'message'
    }
  });
};

export const getFCMToken = async () => {
  let token;
  try {
    // 1. Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // 2. Get the token (FCM for Android)
    if (Platform.OS === 'android') {
      // This returns the native FCM token
      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = tokenData.data;
    } else {
      // For iOS/Other
      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = tokenData.data;
    }

    console.log('🔥 FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error fetching FCM token:', error);
    return null;
  }
};
