import notifee, { AndroidImportance } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

/**
 * Foreground Location Service for AccessPoint
 * 
 * Keeps the app alive even when locked to continuously track user location.
 * Handles network connectivity changes intelligently.
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface ServiceStatus {
  isRunning: boolean;
  isOnline: boolean;
  lastLocation: LocationData | null;
  locationUpdateCount: number;
  error: string | null;
}

class ForegroundLocationService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private networkUnsubscribe: (() => void) | null = null;
  private notificationId: string | null = null;
  private isServiceRunning = false;
  private isOnline = false;
  private lastLocation: LocationData | null = null;
  private locationUpdateCount = 0;
  private error: string | null = null;
  private statusCallbacks: Set<(status: ServiceStatus) => void> = new Set();
  private locationCallbacks: Set<(location: LocationData) => void> = new Set();

  // Configuration
  private readonly LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
  private readonly LOCATION_ACCURACY = Location.Accuracy.Balanced;
  private readonly NOTIFICATION_CHANNEL_ID = 'location-tracking';
  private readonly NOTIFICATION_ID = 'foreground-location-service';

  /**
   * Initialize the service
   */
  async initialize(): Promise<boolean> {
    try {
      // Request location permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        throw new Error('Foreground location permission not granted');
      }

      // Request background location permissions (Android)
      if (Platform.OS === 'android') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission not granted. Service will work in foreground only.');
        }
      }

      // Create notification channel for Android
      if (Platform.OS === 'android') {
        try {
          await notifee.createChannel({
            id: this.NOTIFICATION_CHANNEL_ID,
            name: 'Location Tracking',
            description: 'AccessPoint is tracking your location for emergency services',
            importance: AndroidImportance.HIGH, // HIGH to ensure it shows in tray
            vibration: false,
            sound: false,
            showBadge: true,
          });
          console.log('✅ Notification channel created:', this.NOTIFICATION_CHANNEL_ID);
        } catch (error) {
          console.error('Error creating notification channel:', error);
        }
      }

      // Monitor network connectivity
      this.setupNetworkMonitoring();

      return true;
    } catch (error: any) {
      console.error('Failed to initialize foreground service:', error);
      this.error = error.message || 'Initialization failed';
      this.notifyStatusChange();
      return false;
    }
  }

  /**
   * Start the foreground service
   */
  async start(): Promise<boolean> {
    if (this.isServiceRunning) {
      console.log('Service is already running');
      return true;
    }

    try {
      // Check network status
      const networkState = await NetInfo.fetch();
      this.isOnline = networkState.isConnected ?? false;

      // Start foreground service notification
      await this.startForegroundNotification();

      // Start location tracking
      await this.startLocationTracking();

      this.isServiceRunning = true;
      this.error = null;
      this.notifyStatusChange();

      console.log('✅ Foreground location service started');
      return true;
    } catch (error: any) {
      console.error('Failed to start foreground service:', error);
      this.error = error.message || 'Failed to start service';
      this.isServiceRunning = false;
      this.notifyStatusChange();
      return false;
    }
  }

  /**
   * Stop the foreground service
   */
  async stop(): Promise<void> {
    if (!this.isServiceRunning) {
      return;
    }

    try {
      // Stop location tracking
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      // Stop foreground notification
      if (this.notificationId) {
        await notifee.stopForegroundService(this.notificationId);
        this.notificationId = null;
      }

      // Unsubscribe from network monitoring
      if (this.networkUnsubscribe) {
        this.networkUnsubscribe();
        this.networkUnsubscribe = null;
      }

      this.isServiceRunning = false;
      this.error = null;
      this.notifyStatusChange();

      console.log('✅ Foreground location service stopped');
    } catch (error: any) {
      console.error('Error stopping foreground service:', error);
      this.error = error.message || 'Error stopping service';
      this.notifyStatusChange();
    }
  }

  /**
   * Start foreground notification (required for Android foreground service)
   */
  private async startForegroundNotification(): Promise<void> {
    if (Platform.OS !== 'android') {
      return; // iOS doesn't require foreground notification
    }

    // CRITICAL: Request POST_NOTIFICATIONS permission (Android 13+ / SDK 33+)
    try {
      const settings = await notifee.getNotificationSettings();
      console.log('📱 Notification settings:', settings);
      
      if (settings.authorizationStatus < 1) {
        console.warn('⚠️ Notification permission not granted, requesting POST_NOTIFICATIONS...');
        const permissionResult = await notifee.requestPermission({
          sound: true,
          alert: true,
          badge: true,
        });
        console.log('📱 Permission request result:', permissionResult);
        
        if (permissionResult.authorizationStatus < 1) {
          throw new Error('POST_NOTIFICATIONS permission denied. Please enable in Settings.');
        }
      } else {
        console.log('✅ POST_NOTIFICATIONS permission already granted');
      }
    } catch (error) {
      console.error('❌ Error with notification permission:', error);
      throw error;
    }

    // CRITICAL: Ensure channel exists with EXACT matching ID
    try {
      const channelId = await notifee.createChannel({
        id: this.NOTIFICATION_CHANNEL_ID, // Must match channelId in displayNotification
        name: 'Location Tracking',
        description: 'AccessPoint is tracking your location for emergency services',
        importance: AndroidImportance.HIGH, // HIGH to ensure it shows in tray
        vibration: false,
        sound: false,
        showBadge: true,
      });
      console.log('✅ Channel created/verified:', channelId, '(matches:', this.NOTIFICATION_CHANNEL_ID, ')');
    } catch (error: any) {
      console.warn('⚠️ Channel might already exist:', error.message);
      // Channel exists is OK, continue
    }

    const networkStatus = this.isOnline ? 'Online' : 'Offline';
    const locationStatus = this.lastLocation
      ? `${this.lastLocation.latitude.toFixed(6)}, ${this.lastLocation.longitude.toFixed(6)}`
      : 'Acquiring...';

    try {
      // CRITICAL: Display notification with EXACT channelId match
      this.notificationId = await notifee.displayNotification({
        id: this.NOTIFICATION_ID,
        title: 'AccessPoint Location Tracking',
        body: `${networkStatus} • ${locationStatus}`,
        android: {
          channelId: this.NOTIFICATION_CHANNEL_ID, // MUST match createChannel id exactly
          importance: AndroidImportance.HIGH, // HIGH ensures it shows in tray
          ongoing: true, // Makes it non-dismissible
          autoCancel: false,
          showTimestamp: true,
          timestamp: Date.now(),
          visibility: 1, // Public visibility (shows on lock screen)
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          smallIcon: 'ic_launcher', // Use default app icon
          progress: {
            indeterminate: true,
          },
          showWhen: true, // Show timestamp
        },
      });

      console.log('✅ Notification displayed with ID:', this.notificationId);

      // Start foreground service (this keeps the notification visible)
      await notifee.startForegroundService({
        id: this.NOTIFICATION_ID,
      });

      console.log('✅ Foreground service started');
    } catch (error: any) {
      console.error('❌ Error starting foreground notification:', error);
      throw error;
    }
  }

  /**
   * Update the foreground notification with current status
   */
  private async updateForegroundNotification(): Promise<void> {
    if (!this.notificationId || Platform.OS !== 'android') {
      return;
    }

    const networkStatus = this.isOnline ? '🟢 Online' : '🔴 Offline';
    const locationStatus = this.lastLocation
      ? `📍 ${this.lastLocation.latitude.toFixed(6)}, ${this.lastLocation.longitude.toFixed(6)}`
      : '📍 Acquiring location...';
    const updateCount = `Updates: ${this.locationUpdateCount}`;

    try {
      await notifee.displayNotification({
        id: this.NOTIFICATION_ID,
        title: 'AccessPoint Location Tracking',
        body: `${networkStatus} • ${locationStatus} • ${updateCount}`,
        android: {
          channelId: this.NOTIFICATION_CHANNEL_ID,
          importance: AndroidImportance.HIGH, // HIGH ensures it shows in tray
          ongoing: true,
          autoCancel: false,
          showTimestamp: true,
          timestamp: Date.now(),
          visibility: 1, // Public visibility (shows on lock screen)
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          smallIcon: 'ic_launcher', // Use default app icon
          progress: {
            indeterminate: true,
          },
          showWhen: true, // Show timestamp
        },
      });
    } catch (error) {
      console.error('Error updating foreground notification:', error);
    }
  }

  /**
   * Start continuous location tracking
   */
  private async startLocationTracking(): Promise<void> {
    try {
      // Check permissions
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Start watching position
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: this.LOCATION_ACCURACY,
          timeInterval: this.LOCATION_UPDATE_INTERVAL,
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      console.log('✅ Location tracking started');
    } catch (error: any) {
      console.error('Failed to start location tracking:', error);
      this.error = error.message || 'Location tracking failed';
      this.notifyStatusChange();
      throw error;
    }
  }

  /**
   * Handle location update
   */
  private async handleLocationUpdate(location: Location.LocationObject): Promise<void> {
    const locationData: LocationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    };

    this.lastLocation = locationData;
    this.locationUpdateCount++;
    this.error = null;

    // Store last location locally (offline-first)
    await this.storeLocationLocally(locationData);

    // Update notification
    await this.updateForegroundNotification();

    // Notify callbacks
    this.notifyLocationChange(locationData);
    this.notifyStatusChange();

    // If online, optionally sync to server
    if (this.isOnline) {
      await this.syncLocationToServer(locationData);
    }
  }

  /**
   * Store location locally (offline-first approach)
   */
  private async storeLocationLocally(location: LocationData): Promise<void> {
    try {
      await AsyncStorage.setItem('last_location', JSON.stringify(location));
      await AsyncStorage.setItem('location_timestamp', location.timestamp.toString());
    } catch (error) {
      console.error('Failed to store location locally:', error);
    }
  }

  /**
   * Sync location to server (when online)
   */
  private async syncLocationToServer(location: LocationData): Promise<void> {
    // TODO: Implement server sync logic
    // This would typically send location to your backend/Supabase
    // For now, we just log it
    console.log('📍 Location sync (online):', {
      lat: location.latitude,
      lng: location.longitude,
      timestamp: new Date(location.timestamp).toISOString(),
    });
  }

  /**
   * Setup network connectivity monitoring
   */
  private setupNetworkMonitoring(): void {
    this.networkUnsubscribe = NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOnline !== this.isOnline) {
        console.log(`🌐 Network status changed: ${this.isOnline ? 'Online' : 'Offline'}`);
        this.notifyStatusChange();
        this.updateForegroundNotification();

        // Handle network state change
        if (this.isOnline) {
          this.handleOnlineState();
        } else {
          this.handleOfflineState();
        }
      }
    });
  }

  /**
   * Handle transition to online state
   */
  private async handleOnlineState(): Promise<void> {
    console.log('🟢 Online: Syncing stored locations...');
    
    // Sync any stored offline locations
    if (this.lastLocation) {
      await this.syncLocationToServer(this.lastLocation);
    }

    // Load any queued locations from local storage
    try {
      const storedLocation = await AsyncStorage.getItem('last_location');
      if (storedLocation) {
        const location: LocationData = JSON.parse(storedLocation);
        await this.syncLocationToServer(location);
      }
    } catch (error) {
      console.error('Failed to sync stored locations:', error);
    }
  }

  /**
   * Handle transition to offline state
   */
  private handleOfflineState(): void {
    console.log('🔴 Offline: Storing locations locally...');
    // Location will continue to be stored locally via storeLocationLocally
    // Service continues to work normally
  }

  /**
   * Subscribe to status changes
   */
  subscribeToStatus(callback: (status: ServiceStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    
    // Immediately call with current status
    callback(this.getStatus());

    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to location updates
   */
  subscribeToLocation(callback: (location: LocationData) => void): () => void {
    this.locationCallbacks.add(callback);
    
    // Immediately call with last location if available
    if (this.lastLocation) {
      callback(this.lastLocation);
    }

    // Return unsubscribe function
    return () => {
      this.locationCallbacks.delete(callback);
    };
  }

  /**
   * Get current service status
   */
  getStatus(): ServiceStatus {
    return {
      isRunning: this.isServiceRunning,
      isOnline: this.isOnline,
      lastLocation: this.lastLocation,
      locationUpdateCount: this.locationUpdateCount,
      error: this.error,
    };
  }

  /**
   * Get last known location
   */
  getLastLocation(): LocationData | null {
    return this.lastLocation;
  }

  /**
   * Notify status change to all subscribers
   */
  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusCallbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status callback:', error);
      }
    });
  }

  /**
   * Notify location change to all subscribers
   */
  private notifyLocationChange(location: LocationData): void {
    this.locationCallbacks.forEach((callback) => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error in location callback:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
    this.statusCallbacks.clear();
    this.locationCallbacks.clear();
  }
}

// Singleton instance
export const foregroundLocationService = new ForegroundLocationService();

