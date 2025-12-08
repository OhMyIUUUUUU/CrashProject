import notifee, { AndroidImportance } from '@notifee/react-native';

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
      // Optional: Add an icon if you have one in your android/app/src/main/res/drawable folder
      // smallIcon: 'ic_notification', 
      // color: '#4caf50',
    },
  });
};

export const stopPersistentNotification = async () => {
  // Stops the service and removes the notification
  await notifee.stopForegroundService();
};

