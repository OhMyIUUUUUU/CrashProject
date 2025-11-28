# Background Notifications Implementation Guide

## Current Situation
- ✅ You have `@react-native-firebase/messaging` installed
- ✅ You have `@notifee/react-native` for displaying notifications
- ✅ You have `expo-notifications` installed
- ❌ Supabase real-time subscriptions don't work when app is closed

## Recommended Solution: Firebase Cloud Messaging (FCM)

### Why FCM?
1. **Already installed** - You have the dependencies
2. **Works when app is closed** - True background notifications
3. **Free** - No cost for reasonable usage
4. **Reliable** - Google's infrastructure
5. **Works with Supabase** - Can trigger from database webhooks

### Implementation Steps

#### Step 1: Set up Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Add Android/iOS apps to the project
4. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
5. Place them in your project root

#### Step 2: Configure Expo for FCM
Update `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "@react-native-firebase/app",
        {
          "android": {
            "googleServicesFile": "./google-services.json"
          },
          "ios": {
            "googleServicesFile": "./GoogleService-Info.plist"
          }
        }
      ]
    ]
  }
}
```

#### Step 3: Get FCM Token and Store in Supabase
Create a service to:
- Get FCM token when user logs in
- Store token in Supabase (create a `user_tokens` table)
- Update token when it refreshes

#### Step 4: Set up Supabase Database Webhook
Create a webhook that:
- Triggers on `tbl_messages` INSERT
- Sends FCM notification to the user's device
- Uses Supabase Edge Functions or external service

#### Step 5: Handle FCM Messages in App
- Listen for FCM messages in foreground/background
- Display notifications using notifee
- Navigate to chat screen when tapped

---

## Alternative Solutions

### Option 2: Supabase Database Webhooks + External Service
- Use Supabase webhooks to trigger notifications
- Send to a service like OneSignal, Pusher, or custom backend
- More complex but gives you full control

### Option 3: Polling (Not Recommended)
- Periodically check for new messages
- Battery intensive
- Not real-time
- Only works when app is in background (not closed)

### Option 4: Hybrid Approach
- Use Supabase real-time for foreground/background
- Use FCM for when app is closed
- Best of both worlds

---

## Quick Implementation: FCM Setup

### 1. Install/Verify Dependencies
```bash
# Already installed, but verify:
npm list @react-native-firebase/app
npm list @react-native-firebase/messaging
```

### 2. Create FCM Service
Create `app/services/fcmService.ts`:
- Get FCM token
- Store in Supabase
- Handle foreground/background messages
- Display notifications with notifee

### 3. Update Supabase Schema
Add table to store FCM tokens:
```sql
CREATE TABLE user_fcm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  token TEXT NOT NULL,
  device_type TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Create Supabase Edge Function
- Triggered by database webhook on `tbl_messages` INSERT
- Fetches user's FCM token
- Sends FCM notification
- Or use external service like OneSignal

---

## Recommendation

**Go with Option 1 (FCM)** because:
1. ✅ You already have the dependencies
2. ✅ Works when app is completely closed
3. ✅ Free and reliable
4. ✅ Industry standard
5. ✅ Integrates well with Supabase

**Next Steps:**
1. Set up Firebase project
2. Configure FCM in your app
3. Create FCM service to handle tokens and messages
4. Set up Supabase webhook to send FCM notifications
5. Test with app closed

Would you like me to implement the FCM solution for you?

