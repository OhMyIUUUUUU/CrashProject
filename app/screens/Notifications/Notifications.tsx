import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const NotificationsScreen = () => {
  const router = useRouter();
  const { notificationData } = useLocalSearchParams<{ notificationData?: string }>();

  const parsedData = useMemo(() => {
    if (!notificationData) return null;
    try {
      return JSON.parse(notificationData);
    } catch {
      return null;
    }
  }, [notificationData]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Notification Details</Text>
        {parsedData ? (
          <>
            <Text style={styles.label}>Title</Text>
            <Text style={styles.value}>{parsedData.title || 'No title'}</Text>

            <Text style={styles.label}>Message</Text>
            <Text style={styles.value}>{parsedData.body || 'No message'}</Text>

            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{parsedData.date || 'Unknown'}</Text>
          </>
        ) : (
          <Text style={styles.value}>No notification data found.</Text>
        )}
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f1f1f',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    color: '#1f1f1f',
    marginTop: 4,
  },
  button: {
    marginTop: 30,
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});




