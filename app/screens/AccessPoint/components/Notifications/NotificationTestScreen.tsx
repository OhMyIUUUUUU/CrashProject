import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    requestNotificationPermissions,
    scheduleNotification,
} from './expoNotificationService';

/**
 * Complete functional component example for expo-notifications
 * 
 * Features:
 * - Requests permissions on mount
 * - Button to trigger immediate notification
 * - Foreground/background listeners for notification taps
 * - High priority Android channel configuration
 */
export default function NotificationTestScreen() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Request permissions on mount
    requestNotificationPermissions().then((granted) => {
      if (granted) {
        console.log('✅ Notification permissions granted');
      } else {
        Alert.alert('Permission Required', 'Please enable notifications in settings');
      }
    });

    // Register for push notifications (optional - for remote notifications)
    Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // Replace with your Expo project ID if using EAS
    })
      .then((token) => {
        setExpoPushToken(token.data);
        console.log('Expo Push Token:', token.data);
      })
      .catch((error) => {
        console.warn('Could not get Expo push token:', error);
      });

    // Listener for notifications received while app is in FOREGROUND
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 Notification received (foreground):', notification);
      setNotification(notification);
      
      // Optional: Show an alert when notification is received in foreground
      // Alert.alert(
      //   notification.request.content.title || 'Notification',
      //   notification.request.content.body || '',
      //   [{ text: 'OK' }]
      // );
    });

    // Listener for when user TAPS on a notification
    // This works for both foreground and background notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      const data = response.notification.request.content.data;
      
      // Handle navigation based on notification data
      if (data?.screen) {
        // Navigate to specific screen
        console.log('Navigate to:', data.screen);
        // Example: router.push(data.screen);
      }
      
      // Show alert with notification data
      Alert.alert(
        'Notification Tapped',
        `You tapped on: ${response.notification.request.content.title}\n\nData: ${JSON.stringify(data, null, 2)}`,
        [{ text: 'OK' }]
      );
    });

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  /**
   * Trigger an immediate notification
   */
  const handleTriggerNotification = async () => {
    try {
      const notificationId = await scheduleNotification(
        'Test Notification',
        'This is a test notification. Tap to interact!',
        {
          screen: '/screens/Home/ChatScreen',
          report_id: '123',
          type: 'test',
        }
      );
      
      Alert.alert('Success', `Notification sent! ID: ${notificationId}`);
    } catch (error: any) {
      Alert.alert('Error', `Failed to send notification: ${error?.message || 'Unknown error'}`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Expo Notifications Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={styles.text}>
          Platform: {Platform.OS}
        </Text>
        {expoPushToken && (
          <Text style={styles.text}>
            Push Token: {expoPushToken.substring(0, 20)}...
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleTriggerNotification}
        >
          <Text style={styles.buttonText}>🔔 Trigger Notification</Text>
        </TouchableOpacity>
      </View>

      {notification && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Notification</Text>
          <Text style={styles.text}>
            Title: {notification.request.content.title}
          </Text>
          <Text style={styles.text}>
            Body: {notification.request.content.body}
          </Text>
          <Text style={styles.text}>
            Data: {JSON.stringify(notification.request.content.data, null, 2)}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.instructionText}>
          1. Tap "Trigger Notification" to send a test notification{'\n'}
          2. The notification should appear as a heads-up display even if app is open{'\n'}
          3. Tap the notification in the tray to see the interaction handler{'\n'}
          4. Check console logs for detailed event information
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  text: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

