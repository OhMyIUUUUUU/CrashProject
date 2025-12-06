import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { testNotification } from '../../../../services/notificationTest';
import { useForegroundLocationService } from '../../../../services/useForegroundLocationService';

/**
 * Foreground Service Control Screen
 * 
 * Allows users to start/stop the foreground location tracking service.
 * Shows real-time status and location updates.
 */
export default function ForegroundServiceScreen() {
  const {
    status,
    lastLocation,
    start,
    stop,
    isRunning,
    isOnline,
    error,
  } = useForegroundLocationService();

  const [autoStart, setAutoStart] = useState(false);

  // Auto-start service if enabled
  useEffect(() => {
    if (autoStart && !isRunning) {
      start().catch((err) => {
        Alert.alert('Error', `Failed to start service: ${err.message}`);
      });
    } else if (!autoStart && isRunning) {
      stop();
    }
  }, [autoStart, isRunning, start, stop]);

  const handleToggle = async () => {
    if (isRunning) {
      await stop();
      Alert.alert('Service Stopped', 'Location tracking has been stopped.');
    } else {
      const success = await start();
      if (success) {
        Alert.alert('Service Started', 'Location tracking is now active.');
      } else {
        Alert.alert(
          'Failed to Start',
          error || 'Unable to start location tracking service. Please check permissions.'
        );
      }
    }
  };

  const formatLocation = (location: typeof lastLocation) => {
    if (!location) return 'No location data';
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons
          name={isRunning ? 'location' : 'location-outline'}
          size={48}
          color={isRunning ? '#4CAF50' : '#999'}
        />
        <Text style={styles.title}>Foreground Location Service</Text>
        <Text style={styles.subtitle}>
          Keep location tracking active even when the app is locked
        </Text>
      </View>

      {/* Status Card */}
      <View style={[styles.card, isRunning && styles.cardActive]}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <View style={[styles.statusBadge, isRunning ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={styles.statusText}>
              {isRunning ? '🟢 Running' : '⚪ Stopped'}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Network:</Text>
          <Text style={[styles.statusValue, isOnline ? styles.online : styles.offline]}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Updates:</Text>
          <Text style={styles.statusValue}>{status.locationUpdateCount}</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}
      </View>

      {/* Location Card */}
      {lastLocation && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last Location</Text>
          <View style={styles.locationRow}>
            <Ionicons name="navigate" size={20} color="#666" />
            <Text style={styles.locationText}>{formatLocation(lastLocation)}</Text>
          </View>
          {lastLocation.accuracy && (
            <Text style={styles.accuracyText}>
              Accuracy: ±{lastLocation.accuracy.toFixed(0)}m
            </Text>
          )}
          <Text style={styles.timestampText}>
            {formatTimestamp(lastLocation.timestamp)}
          </Text>
        </View>
      )}

      {/* Control Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Controls</Text>
        
        {/* SANITY CHECK: Test Notification Button */}
        <TouchableOpacity
          style={[styles.button, styles.buttonTest]}
          onPress={async () => {
            await testNotification();
          }}
        >
          <Ionicons name="bug" size={24} color="#fff" />
          <Text style={styles.buttonText}>🧪 Test Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isRunning ? styles.buttonStop : styles.buttonStart]}
          onPress={handleToggle}
        >
          <Ionicons
            name={isRunning ? 'stop-circle' : 'play-circle'}
            size={24}
            color="#fff"
          />
          <Text style={styles.buttonText}>
            {isRunning ? 'Stop Service' : 'Start Service'}
          </Text>
        </TouchableOpacity>

        <View style={styles.autoStartRow}>
          <Text style={styles.autoStartLabel}>Auto-start on app launch</Text>
          <Switch
            value={autoStart}
            onValueChange={setAutoStart}
            trackColor={{ false: '#ccc', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Information</Text>
        <Text style={styles.infoText}>
          • The service runs in the foreground, keeping the app alive even when locked{'\n'}
          • Location is tracked continuously and stored locally (offline-first){'\n'}
          • When online, locations are synced to the server{'\n'}
          • A persistent notification shows the current status{'\n'}
          • Battery usage may increase while the service is active
        </Text>
      </View>

      {/* Platform-specific note */}
      {Platform.OS === 'android' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Android Notes</Text>
          <Text style={styles.infoText}>
            • A persistent notification will appear in your notification tray{'\n'}
            • The notification cannot be dismissed while the service is running{'\n'}
            • Battery optimization may need to be disabled for reliable tracking
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeActive: {
    backgroundColor: '#E8F5E9',
  },
  badgeInactive: {
    backgroundColor: '#F5F5F5',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  online: {
    color: '#4CAF50',
  },
  offline: {
    color: '#F44336',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  accuracyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  timestampText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonStart: {
    backgroundColor: '#4CAF50',
  },
  buttonStop: {
    backgroundColor: '#F44336',
  },
  buttonTest: {
    backgroundColor: '#FF9800',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  autoStartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoStartLabel: {
    fontSize: 16,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});

