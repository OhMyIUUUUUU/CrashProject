import notifee, { AndroidImportance } from '@notifee/react-native';
import { Alert, Platform } from 'react-native';

/**
 * SANITY CHECK: Test Notification Function
 * 
 * This function strictly:
 * 1. Requests notification permission
 * 2. Creates a channel
 * 3. Displays a basic notification
 * 
 * Use this to verify Notifee is installed correctly.
 */
export async function testNotification(): Promise<void> {
  try {
    console.log('🧪 Starting notification test...');

    if (Platform.OS !== 'android') {
      Alert.alert('Test', 'This test is for Android only');
      return;
    }

    // Step 1: Request notification permission (Android 13+ requires POST_NOTIFICATIONS)
    console.log('📱 Step 1: Checking notification permissions...');
    const settings = await notifee.getNotificationSettings();
    console.log('📱 Current permission status:', settings.authorizationStatus);

    if (settings.authorizationStatus < 1) {
      console.log('📱 Requesting notification permission...');
      const permissionResult = await notifee.requestPermission({
        sound: true,
        alert: true,
        badge: true,
      });
      console.log('📱 Permission result:', permissionResult);

      if (permissionResult.authorizationStatus < 1) {
        Alert.alert(
          'Permission Denied',
          'Notification permission is required. Please enable it in Settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // Step 2: Create notification channel
    console.log('📱 Step 2: Creating notification channel...');
    const channelId = 'test-channel';
    try {
      await notifee.createChannel({
        id: channelId,
        name: 'Test Channel',
        description: 'Channel for testing notifications',
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
        showBadge: true,
      });
      console.log('✅ Channel created:', channelId);
    } catch (error: any) {
      console.warn('⚠️ Channel might already exist:', error.message);
    }

    // Step 3: Display notification
    console.log('📱 Step 3: Displaying notification...');
    const notificationId = await notifee.displayNotification({
      id: 'test-notification-' + Date.now(),
      title: '🧪 Test Notification',
      body: 'If you see this, Notifee is working correctly!',
      android: {
        channelId: channelId, // Must match the channel created above
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        smallIcon: 'ic_launcher',
        showTimestamp: true,
        timestamp: Date.now(),
      },
    });

    console.log('✅ Notification displayed with ID:', notificationId);
    Alert.alert(
      'Success',
      `Notification sent! ID: ${notificationId}\n\nCheck your notification tray.`,
      [{ text: 'OK' }]
    );
  } catch (error: any) {
    console.error('❌ Test notification failed:', error);
    Alert.alert(
      'Error',
      `Failed to show notification:\n${error.message || 'Unknown error'}`,
      [{ text: 'OK' }]
    );
  }
}

