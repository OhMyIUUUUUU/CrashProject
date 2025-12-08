import React, { useEffect } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { startPersistentNotification, stopPersistentNotification } from './NotificationService';

const NotificationTrigger = () => {
  useEffect(() => {
    // Start the notification immediately when the component mounts
    startPersistentNotification();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Your App is Running!</Text>
      
      {/* Optional: A button to turn it off if the user wants to logout/exit */}
      <Button 
        title="Stop Notification" 
        onPress={() => stopPersistentNotification()} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
  },
});

export default NotificationTrigger;

