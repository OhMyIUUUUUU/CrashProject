# Expo Notifications Implementation Guide

## ✅ Package Installation

The package is already installed in your project:
```bash
expo-notifications ~0.32.12
```

If you need to install it fresh:
```bash
npx expo install expo-notifications
```

---

## 📋 Setup Instructions

### 1. Notification Handler Configuration

The notification handler is already configured in `app/_layout.tsx`:

```typescript
import * as Notifications from 'expo-notifications';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // ✅ Show alert/banner in foreground (heads-up display)
    shouldPlaySound: true,  // ✅ Play sound
    shouldSetBadge: true,   // ✅ Update app badge
  }),
});
```

**Key Setting:** `shouldShowAlert: true` ensures notifications appear as heads-up displays even when the app is open.

---

### 2. Service File

Created: `app/screens/AccessPoint/components/Notifications/expoNotificationService.ts`

This service provides:
- `requestNotificationPermissions()` - Request and configure permissions
- `scheduleNotification()` - Send immediate notifications
- Android channel configuration with HIGH importance

---

### 3. Complete Test Component

Created: `app/screens/AccessPoint/components/Notifications/NotificationTestScreen.tsx`

This is a complete functional component that demonstrates:
- ✅ Requesting permissions on mount
- ✅ Button to trigger immediate notification
- ✅ Foreground listener (when notification arrives)
- ✅ Response listener (when user taps notification)
- ✅ Navigation handling based on notification data

---

## 🚀 Usage Example

### Basic Usage

```typescript
import { scheduleNotification } from './expoNotificationService';

// Send an immediate notification
await scheduleNotification(
  'Notification Title',
  'This is the notification body',
  {
    screen: '/screens/Home/ChatScreen',
    report_id: '123',
    type: 'message',
  }
);
```

### In a Component

```typescript
import React, { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { scheduleNotification } from './expoNotificationService';

export default function MyComponent() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Request permissions
    requestNotificationPermissions();

    // Listen for notifications received in foreground
    notificationListener.current = 
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });

    // Listen for when user taps notification
    responseListener.current = 
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('User tapped notification:', response);
        const data = response.notification.request.content.data;
        
        // Navigate based on data
        if (data?.screen) {
          router.push(data.screen);
        }
      });

    return () => {
      // Cleanup
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const handleSendNotification = async () => {
    await scheduleNotification(
      'Test',
      'This is a test notification',
      { screen: '/screens/Home/Home' }
    );
  };

  return (
    <Button title="Send Notification" onPress={handleSendNotification} />
  );
}
```

---

## 📱 Android Channel Configuration

The service automatically creates a high-priority Android channel:

```typescript
await Notifications.setNotificationChannelAsync('default', {
  name: 'Default',
  importance: Notifications.AndroidImportance.HIGH, // ✅ High priority = heads-up display
  vibrationPattern: [300, 500],
  lightColor: '#FF231F7C',
  sound: 'default',
  enableVibrate: true,
  showBadge: true,
});
```

**Android Importance Levels:**
- `LOW` - No sound, no heads-up
- `DEFAULT` - Sound, but no heads-up
- `HIGH` - ✅ Sound + heads-up display (what we use)
- `MAX` - Highest priority (use sparingly)

---

## 🎯 Key Features

### ✅ Foreground Visibility
- `shouldShowAlert: true` in notification handler
- `AndroidImportance.HIGH` for Android channel
- Notifications appear as heads-up displays even when app is open

### ✅ Clickable Notifications
- `addNotificationResponseReceivedListener` handles taps
- Works for both foreground and background notifications
- Can navigate to specific screens based on notification data

### ✅ Immediate Notifications
- Use `trigger: null` in `scheduleNotificationAsync` for immediate display
- No delay, appears instantly

---

## 🔍 Testing

1. **Import the test screen** in your router or navigate to it:
   ```typescript
   import NotificationTestScreen from './screens/AccessPoint/components/Notifications/NotificationTestScreen';
   ```

2. **Or use the service directly** in any component:
   ```typescript
   import { scheduleNotification } from './screens/AccessPoint/components/Notifications/expoNotificationService';
   ```

3. **Test scenarios:**
   - App in foreground → Notification should appear as heads-up
   - App in background → Notification should appear in tray
   - Tap notification → Should trigger response listener and navigate

---

## 📝 Notes

- **Permissions:** Always request permissions before sending notifications
- **Android:** Channel importance must be HIGH or MAX for heads-up display
- **iOS:** Foreground notifications work automatically with `shouldShowAlert: true`
- **Data:** All notification data values must be serializable (strings, numbers, booleans)

---

## 🔄 Migration from Notifee

If you want to fully migrate from `@notifee/react-native` to `expo-notifications`:

1. Replace `displayNotification` calls with `scheduleNotification`
2. Update listeners to use `expo-notifications` API
3. Remove `@notifee/react-native` dependency (optional)

The current implementation keeps both systems working side-by-side.

