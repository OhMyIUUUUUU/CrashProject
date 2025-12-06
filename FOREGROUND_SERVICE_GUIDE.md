# Foreground Location Service Guide

## Overview

The **Foreground Location Service** is an offline-first service that keeps AccessPoint alive even when the device is locked, continuously tracking the user's location. It intelligently handles network connectivity changes and stores locations locally for offline scenarios.

## Features

✅ **Keeps app alive** - Runs in foreground even when device is locked  
✅ **Continuous location tracking** - Updates every 5 seconds or 10 meters  
✅ **Offline-first** - Stores locations locally, syncs when online  
✅ **Network-aware** - Automatically handles online/offline transitions  
✅ **Battery-optimized** - Uses balanced accuracy for efficient tracking  
✅ **Persistent notification** - Shows status in notification tray (Android)

---

## Architecture

### Core Components

1. **`foregroundLocationService.ts`** - Main service class
   - Singleton pattern
   - Handles location tracking
   - Manages network state
   - Stores locations locally

2. **`useForegroundLocationService.ts`** - React Hook
   - Easy integration in React components
   - Provides status and location updates
   - Handles initialization

3. **`ForegroundServiceScreen.tsx`** - Control UI
   - Start/stop service
   - View real-time status
   - Monitor location updates

---

## Usage

### Basic Usage in a Component

```typescript
import { useForegroundLocationService } from '../../services/useForegroundLocationService';

function MyComponent() {
  const { status, lastLocation, start, stop, isRunning, isOnline } = 
    useForegroundLocationService();

  return (
    <View>
      <Text>Status: {isRunning ? 'Running' : 'Stopped'}</Text>
      <Text>Network: {isOnline ? 'Online' : 'Offline'}</Text>
      {lastLocation && (
        <Text>
          Location: {lastLocation.latitude}, {lastLocation.longitude}
        </Text>
      )}
      <Button title="Start" onPress={start} />
      <Button title="Stop" onPress={stop} />
    </View>
  );
}
```

### Direct Service Usage

```typescript
import { foregroundLocationService } from './services/foregroundLocationService';

// Initialize
await foregroundLocationService.initialize();

// Start service
await foregroundLocationService.start();

// Subscribe to location updates
const unsubscribe = foregroundLocationService.subscribeToLocation((location) => {
  console.log('New location:', location);
});

// Subscribe to status changes
const unsubscribeStatus = foregroundLocationService.subscribeToStatus((status) => {
  console.log('Service status:', status);
});

// Stop service
await foregroundLocationService.stop();
```

---

## Service Status

The service provides a `ServiceStatus` object:

```typescript
interface ServiceStatus {
  isRunning: boolean;           // Is service active?
  isOnline: boolean;             // Network connectivity
  lastLocation: LocationData | null;  // Last known location
  locationUpdateCount: number;   // Total updates received
  error: string | null;           // Any errors
}
```

### Location Data

```typescript
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;        // Accuracy in meters
  altitude: number | null;
  heading: number | null;        // Compass heading
  speed: number | null;          // Speed in m/s
  timestamp: number;              // Unix timestamp
}
```

---

## Configuration

### Location Settings

Edit `foregroundLocationService.ts`:

```typescript
private readonly LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
private readonly LOCATION_ACCURACY = Location.Accuracy.Balanced;
```

**Accuracy Options:**
- `Location.Accuracy.Lowest` - Fastest, least accurate
- `Location.Accuracy.Low` - Fast, less accurate
- `Location.Accuracy.Balanced` - Good balance (default)
- `Location.Accuracy.High` - More accurate, slower
- `Location.Accuracy.Highest` - Most accurate, slowest
- `Location.Accuracy.BestForNavigation` - Best for navigation

### Notification Channel

The service creates a notification channel on Android:

```typescript
await notifee.createChannel({
  id: 'location-tracking',
  name: 'Location Tracking',
  importance: AndroidImportance.LOW, // Low to avoid being intrusive
});
```

---

## Permissions

### Required Permissions

1. **Foreground Location** - Required
2. **Background Location** - Recommended (Android)
   - Without it, service stops when app goes to background

### Requesting Permissions

The service automatically requests permissions on initialization:

```typescript
await foregroundLocationService.initialize();
```

If permissions are denied, the service will not start and will report an error.

---

## Offline-First Architecture

### How It Works

1. **Location Updates**
   - Continuously tracks location every 5 seconds or 10 meters
   - Stores each update locally in AsyncStorage
   - Works offline and online

2. **Network State Changes**
   - Monitors connectivity with NetInfo
   - When going **offline**: Continues tracking, stores locally
   - When going **online**: Syncs stored locations to server

3. **Data Storage**
   - Last location stored in AsyncStorage
   - Timestamp stored separately
   - Can be extended to queue multiple locations

### Sync Implementation

The `syncLocationToServer()` method is a placeholder. Implement your sync logic:

```typescript
private async syncLocationToServer(location: LocationData): Promise<void> {
  // TODO: Implement server sync
  // Example:
  // await supabase.from('user_locations').insert({
  //   latitude: location.latitude,
  //   longitude: location.longitude,
  //   timestamp: new Date(location.timestamp).toISOString(),
  // });
}
```

---

## Android Foreground Service

### How It Works

- Uses `notifee.startForegroundService()` to start Android foreground service
- Displays a persistent notification (cannot be dismissed)
- Keeps the app process alive even when locked
- Notification shows current status (online/offline, location)

### Notification Behavior

- **Ongoing**: Cannot be dismissed while service is running
- **Low Importance**: Doesn't make sound or vibrate (less intrusive)
- **Auto-updates**: Shows current location and network status

---

## iOS Considerations

iOS doesn't require a foreground notification, but:

- Background location requires "Always" permission
- App must have `UIBackgroundModes` with `location` in `app.json`
- Battery usage may be higher

### app.json Configuration

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationAlwaysAndWhenInUseUsageDescription": "AccessPoint needs your location to provide emergency services.",
        "NSLocationAlwaysUsageDescription": "AccessPoint needs your location to provide emergency services.",
        "UIBackgroundModes": ["location"]
      }
    }
  }
}
```

---

## Battery Optimization

### Android

Users may need to disable battery optimization:

1. Settings → Apps → AccessPoint
2. Battery → Unrestricted
3. Or: Settings → Battery → Battery Optimization → AccessPoint → Don't optimize

### Tips

- Use `Location.Accuracy.Balanced` (default) for better battery life
- Increase `LOCATION_UPDATE_INTERVAL` for less frequent updates
- Increase `distanceInterval` in `watchPositionAsync` for less updates

---

## Error Handling

The service handles errors gracefully:

- **Permission denied**: Service won't start, error reported in status
- **Location unavailable**: Continues trying, error reported
- **Network errors**: Service continues, locations stored locally

Check for errors:

```typescript
const { status, error } = useForegroundLocationService();

if (error) {
  console.error('Service error:', error);
  // Show error to user
}
```

---

## Testing

### Test Scenarios

1. **Start Service**
   - Service should start, notification appears
   - Location updates begin

2. **Lock Device**
   - Service continues running
   - Notification remains visible
   - Location continues updating

3. **Go Offline**
   - Service continues tracking
   - Locations stored locally
   - Status shows "Offline"

4. **Go Online**
   - Service syncs stored locations
   - Status shows "Online"
   - New locations sync immediately

5. **Stop Service**
   - Notification disappears
   - Location tracking stops
   - Resources cleaned up

---

## Integration with Existing Code

### In Home Screen

```typescript
import { useForegroundLocationService } from '../../services/useForegroundLocationService';

const Home: React.FC = () => {
  const { isRunning, lastLocation } = useForegroundLocationService();
  
  // Use lastLocation for SOS button
  const handleSOS = async () => {
    if (lastLocation) {
      // Use tracked location instead of fetching new one
      sendSOS(lastLocation);
    }
  };
  
  // ...
};
```

### In Report Screen

```typescript
const Report: React.FC = () => {
  const { lastLocation } = useForegroundLocationService();
  
  // Pre-fill location from service
  useEffect(() => {
    if (lastLocation) {
      setLatitude(lastLocation.latitude);
      setLongitude(lastLocation.longitude);
    }
  }, [lastLocation]);
  
  // ...
};
```

---

## Troubleshooting

### Service Won't Start

1. Check permissions: Settings → Apps → AccessPoint → Permissions
2. Check location services: Settings → Location
3. Check battery optimization: Settings → Battery

### Location Not Updating

1. Check GPS signal (go outside)
2. Check location accuracy setting
3. Check device location services enabled

### Notification Not Showing

1. Check notification permissions
2. Check notification channel settings
3. Check Do Not Disturb mode

### Battery Drain

1. Increase `LOCATION_UPDATE_INTERVAL`
2. Use lower accuracy setting
3. Increase `distanceInterval`

---

## Best Practices

1. **Start service only when needed** - Don't run 24/7 unless required
2. **Stop service when not needed** - Saves battery
3. **Handle errors gracefully** - Show user-friendly messages
4. **Respect user privacy** - Only track when necessary
5. **Test offline scenarios** - Ensure service works without internet
6. **Monitor battery usage** - Check device battery settings

---

## Next Steps

1. **Implement server sync** - Add your backend integration
2. **Add location queue** - Store multiple locations for offline sync
3. **Add geofencing** - Trigger actions based on location
4. **Add analytics** - Track service usage and performance
5. **Add user preferences** - Let users configure update intervals

---

## Support

For issues or questions:
- Check service status: `foregroundLocationService.getStatus()`
- Check logs: Console output shows detailed information
- Test with `ForegroundServiceScreen` component

