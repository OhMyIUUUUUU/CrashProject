# AccessPoint - Application Flow Documentation

## 📱 Application Overview
**AccessPoint** is an Emergency Response System mobile application built with React Native (Expo). It enables users to report emergencies, communicate with authorities, and access emergency services both online and offline.

---

## 🔄 Main Application Flow

### 1. App Initialization Flow

```
App Launch
    │
    ├─→ index.tsx (Entry Point)
    │   ├─→ Check Authentication Status
    │   │   ├─→ Load User from Storage
    │   │   └─→ Check Supabase Session
    │   │
    │   └─→ Route Decision:
    │       ├─→ Has Session? → /screens/Home/Home
    │       └─→ No Session? → /screens/AccessPoint/components/Login/Login
    │
    └─→ _layout.tsx (Root Layout)
        ├─→ Initialize Notifications
        ├─→ Setup Network Monitoring
        ├─→ Setup Error Boundaries
        └─→ Wrap with AuthProvider
```

**Key Components:**
- `app/index.tsx` - Entry point with auth checking
- `app/_layout.tsx` - Root layout with navigation stack
- `app/contexts/AuthContext.tsx` - Authentication state management

---

### 2. Authentication Flow

#### 2.1 Login Flow

```
Login Screen
    │
    ├─→ User Enters Credentials (Email/Phone + Password)
    │
    ├─→ Attempt Supabase Authentication
    │   ├─→ Success?
    │   │   ├─→ Fetch User Data from tbl_users
    │   │   ├─→ Save Session to AsyncStorage
    │   │   ├─→ Update AuthContext
    │   │   └─→ Navigate to Home Screen
    │   │
    │   └─→ Failure?
    │       └─→ Fallback to Local Storage Login
    │           ├─→ Verify Credentials Locally
    │           ├─→ Save Session
    │           └─→ Navigate to Home Screen
    │
    └─→ Network Monitoring
        └─→ If Offline → Show Alert
```

**Files:**
- `app/screens/AccessPoint/components/Login/Login.tsx`
- `app/contexts/AuthContext.tsx`
- `utils/storage.ts`

#### 2.2 Registration Flow

```
Registration Screen
    │
    ├─→ User Fills Registration Form:
    │   ├─→ Personal Info (Name, Age, Gender, Birthdate)
    │   ├─→ Contact Info (Email, Phone)
    │   ├─→ Emergency Contact (Name, Number)
    │   ├─→ Address (Region, City, Barangay)
    │   └─→ Password
    │
    ├─→ Form Validation
    │
    ├─→ Register with Supabase
    │   ├─→ Create Auth User
    │   ├─→ Insert into tbl_users
    │   └─→ Save Session Locally
    │
    └─→ Auto-Login → Navigate to Home
```

**Files:**
- `app/screens/AccessPoint/components/Register/Register.tsx`

---

### 3. Main Application Flow (After Login)

#### 3.1 Home Screen Flow

```
Home Screen
    │
    ├─→ Load User Data
    ├─→ Check Active Case (useActiveCase hook)
    ├─→ Check Network Connectivity
    │   └─→ If Offline → Redirect to OfflineEmergency
    │
    ├─→ Display:
    │   ├─→ User Welcome Section
    │   ├─→ Active Case Banner (if exists)
    │   │   ├─→ Show Case Details
    │   │   ├─→ Cancel Report Button (with 5s countdown)
    │   │   └─→ Chat Button (FloatingChatHead)
    │   │
    │   └─→ SOS Emergency Button (Large, Pulsing)
    │       └─→ On Press:
    │           ├─→ Request Location Permission
    │           ├─→ Get Current Location
    │           ├─→ Reverse Geocode Address
    │           ├─→ Create Emergency Report
    │           ├─→ Upload to Supabase
    │           └─→ Show Active Case Banner
    │
    ├─→ Bottom Tab Navigation:
    │   ├─→ Home Tab (Current)
    │   ├─→ Report Tab → /screens/Home/Report
    │   ├─→ Profile Tab → /screens/Home/Profile
    │   └─→ Notifications Tab → /screens/Notifications/Notifications
    │
    └─→ Real-time Updates:
        ├─→ Listen for Report Status Changes
        └─→ Update Active Case Display
```

**Key Features:**
- SOS Emergency Button (quick emergency reporting)
- Active Case Management
- Real-time Status Updates
- Network Monitoring

**Files:**
- `app/screens/Home/Home.tsx`
- `app/hooks/useActiveCase.ts`
- `app/screens/AccessPoint/components/Customtabbar/CustomTabBar.tsx`

#### 3.2 Report Screen Flow

```
Report Screen
    │
    ├─→ Check Network Connectivity
    │   └─→ If Offline → Redirect to OfflineEmergency
    │
    ├─→ Load Active Case (if exists)
    │   └─→ Pre-fill Form with Case Data
    │
    ├─→ Report Form:
    │   ├─→ Category Selection (Hexagonal Grid)
    │   │   └─→ Categories: Violence, Threat, Theft, Vandalism,
    │   │              Suspicious, Emergency, Other
    │   │
    │   ├─→ Role Selection (Victim/Witness)
    │   │
    │   ├─→ Description Input
    │   │   └─→ Pre-filled Template based on Category
    │   │
    │   ├─→ Image/Video Attachments
    │   │   ├─→ Request Media Library Permission
    │   │   ├─→ Pick from Gallery
    │   │   └─→ Upload to Supabase Storage
    │   │
    │   └─→ Location (Auto-detected)
    │       ├─→ Get Current Location
    │       └─→ Reverse Geocode to Address
    │
    ├─→ Submit Report
    │   ├─→ Validate Form
    │   ├─→ Upload Media Files
    │   ├─→ Create Report in tbl_reports
    │   ├─→ Link Media to Report in tbl_media
    │   └─→ Show Success Message
    │
    └─→ Active Case Management
        ├─→ If Active Case Exists:
        │   ├─→ Show Case Details
        │   ├─→ Cancel Button (with 5s countdown)
        │   │   └─→ Delete Report, Messages, Media
        │   └─→ Chat Button
        └─→ If No Active Case:
            └─→ Allow New Report Creation
```

**Files:**
- `app/screens/Home/Report.tsx`
- `app/screens/AccessPoint/components/HexagonalGrid/HexagonalGrid.tsx`
- `app/hooks/useActiveCase.ts`

#### 3.3 Profile Screen Flow

```
Profile Screen
    │
    ├─→ Check Network Connectivity
    │   └─→ If Offline → Redirect to OfflineEmergency
    │
    ├─→ Load User Profile
    │   ├─→ Fetch from Supabase (tbl_users)
    │   └─→ Fallback to Local Storage
    │
    ├─→ Display Profile:
    │   ├─→ Personal Information
    │   ├─→ Contact Information
    │   ├─→ Emergency Contact
    │   └─→ Address Information
    │
    ├─→ Edit Mode
    │   ├─→ Enable Editing
    │   ├─→ Update Fields
    │   ├─→ Save Changes
    │   │   ├─→ Update Supabase
    │   │   └─→ Update Local Storage
    │   └─→ Refresh Profile
    │
    └─→ Logout
        ├─→ Clear Session
        ├─→ Clear Local Storage
        └─→ Navigate to Login
```

**Files:**
- `app/screens/Home/Profile.tsx`

---

### 4. Emergency Features Flow

#### 4.1 SOS Emergency Flow

```
SOS Button Press (Home Screen)
    │
    ├─→ Start 3-Second Countdown
    │   └─→ User can cancel during countdown
    │
    ├─→ Request Location Permission
    │   └─→ If Denied → Show Alert
    │
    ├─→ Get Current Location
    │   ├─→ Latitude & Longitude
    │   └─→ Reverse Geocode to Address
    │
    ├─→ Create Emergency Report
    │   ├─→ Category: "Emergency"
    │   ├─→ Description: "SOS Emergency Alert"
    │   ├─→ Role: "victim"
    │   ├─→ Location: Current GPS Coordinates
    │   └─→ Status: "pending"
    │
    ├─→ Upload to Supabase
    │   ├─→ Insert into tbl_reports
    │   └─→ Get report_id
    │
    ├─→ Update Active Case
    │   └─→ Show Active Case Banner
    │
    └─→ Enable Chat
    └─→ Show Notifications
```

#### 4.2 Active Case Management Flow

```
Active Case Detection
    │
    ├─→ useActiveCase Hook
    │   ├─→ Check tbl_reports for user
    │   ├─→ Filter: status = "pending" OR "responding"
    │   └─→ Set as Active Case
    │
    ├─→ Display Active Case Banner
    │   ├─→ Show Case Details
    │   ├─→ Show Status
    │   ├─→ Show Assigned Office
    │   └─→ Show Actions:
    │       ├─→ Cancel Report (5s countdown)
    │       └─→ Open Chat
    │
    ├─→ Real-time Updates
    │   ├─→ Listen to tbl_reports changes
    │   ├─→ Update Status Display
    │   └─→ If Status = "resolved"/"closed"
    │       └─→ Move to Notifications
    │
    └─→ Cancel Report Flow
        ├─→ Confirm Cancellation
        ├─→ 5-Second Countdown
        ├─→ Delete Report
        │   ├─→ Delete from tbl_reports
        │   ├─→ Delete Messages (tbl_messages)
        │   └─→ Delete Media Files (Storage + tbl_media)
        └─→ Refresh Active Case
```

**Files:**
- `app/hooks/useActiveCase.ts`

---

### 5. Chat System Flow

#### 5.1 Chat Modal Flow

```
Chat Button Press
    │
    ├─→ Open ChatModal
    │   ├─→ Load Messages for Active Case
    │   │   └─→ Query tbl_messages (filter by report_id)
    │   │
    │   ├─→ Subscribe to Real-time Updates
    │   │   └─→ Listen to tbl_messages changes
    │   │
    │   └─→ Display Messages
    │       ├─→ User Messages (Right)
    │       └─→ Office Messages (Left)
    │
    ├─→ Send Message
    │   ├─→ Get Current Session
    │   ├─→ Get receiver_id (assigned_office_id)
    │   ├─→ Insert into tbl_messages
    │   │   ├─→ report_id
    │   │   ├─→ sender_id (user_id)
    │   │   ├─→ sender_type: "user"
    │   │   ├─→ receiver_id (office_id)
    │   │   ├─→ message_content
    │   │   └─→ timestamp
    │   └─→ Refresh Messages
    │
    └─→ Auto-scroll to Latest Message
```

**Files:**
- `app/screens/AccessPoint/components/Chatsystem/ChatModal.tsx`
- `app/screens/AccessPoint/components/Chatsystem/FloatingChatHead.tsx`
- `app/screens/AccessPoint/components/Chatsystem/SOSChatModal.tsx`

---

### 6. Offline Mode Flow

```
Network Disconnection Detected
    │
    └─→ Redirect to OfflineEmergency Screen
        │
        ├─→ Display Offline Mode UI
        │   ├─→ Connection Status Indicator
        │   └─→ Emergency Services Access
        │
        ├─→ Emergency Services:
        │   ├─→ Police (Call/SMS)
        │   ├─→ Fire Department (Call/SMS)
        │   ├─→ Medical Emergency (Call/SMS)
        │   └─→ Personal Emergency Contact (Call/SMS)
        │
        ├─→ Location Services:
        │   ├─→ Get Current Location
        │   └─→ Display Address
        │
        └─→ Network Monitoring
            └─→ If Connection Restored:
                ├─→ Check Auth Status
                └─→ Redirect to Home/Login
```

**Files:**
- `app/screens/AccessPoint/components/OfflineEmergency/OfflineEmergency.tsx`

---

### 7. Notifications Flow

```
Notifications Screen
    │
    ├─→ Load Notifications
    │   └─→ Query tbl_reports
    │       ├─→ Filter: status IN ["pending", "assigned", 
    │       │              "investigating", "resolved", "closed"]
    │       ├─→ Order by updated_at DESC
    │       └─→ Limit 20
    │
    ├─→ Display Notification List
    │   ├─→ Case Category
    │   ├─→ Status Badge
    │   ├─→ Timestamp
    │   └─→ Tap to View Details
    │
    └─→ Real-time Updates
        └─→ Listen to tbl_reports changes
```

**Files:**
- `app/screens/Notifications/Notifications.tsx`
- `app/screens/AccessPoint/components/Notifications/notificationService.ts`

---

### 8. Data Flow Architecture

```
User Actions
    │
    ├─→ Frontend (React Native)
    │   ├─→ AuthContext (State Management)
    │   ├─→ useActiveCase Hook (Case Management)
    │   └─→ Components (UI)
    │
    ├─→ Local Storage (AsyncStorage)
    │   ├─→ User Session
    │   ├─→ User Credentials
    │   └─→ Offline Data
    │
    └─→ Backend (Supabase)
        ├─→ Authentication (supabase.auth)
        ├─→ Database Tables:
        │   ├─→ tbl_users (User profiles)
        │   ├─→ tbl_reports (Emergency reports)
        │   ├─→ tbl_messages (Chat messages)
        │   └─→ tbl_media (Report attachments)
        │
        └─→ Storage (Supabase Storage)
            └─→ crash-media bucket (Images/Videos)
```

---

### 9. Report Status Lifecycle

```
Report Status Flow
    │
    ├─→ "pending" (Initial)
    │   └─→ User creates report
    │
    ├─→ "assigned" (Office Assigned)
    │   └─→ Admin assigns to police office
    │
    ├─→ "responding" (Active Response)
    │   └─→ Office is responding
    │
    ├─→ "investigating" (Under Investigation)
    │   └─→ Case being investigated
    │
    ├─→ "resolved" (Case Resolved)
    │   └─→ Case resolved, moves to notifications
    │
    ├─→ "closed" (Case Closed)
    │   └─→ Case closed, moves to notifications
    │
    └─→ "cancelled" (User Cancelled)
        └─→ User cancels report (deleted)
```

**Active Case:** Only "pending" and "responding" statuses
**Notifications:** All statuses except "cancelled"

---

### 10. Key User Journeys

#### Journey 1: New User Registration & First Report
```
1. App Launch → Login Screen
2. Tap "Register"
3. Fill Registration Form
4. Submit → Auto-login → Home Screen
5. Tap "Report" Tab
6. Select Category → Fill Description → Add Images
7. Submit Report → Active Case Created
8. View Active Case Banner → Open Chat
9. Communicate with Assigned Office
10. Case Resolved → Moved to Notifications
```

#### Journey 2: Emergency SOS
```
1. Home Screen → Tap SOS Button
2. 3-Second Countdown (can cancel)
3. Location Captured → Report Created
4. Active Case Banner Appears
5. Open Chat → Communicate with Office
6. Receive Updates via Notifications
```

#### Journey 3: Offline Emergency
```
1. Network Disconnection Detected
2. Auto-redirect to OfflineEmergency Screen
3. Access Emergency Services:
   - Call Police/Fire/Medical
   - Send SMS with Location
   - Call Personal Emergency Contact
4. Connection Restored → Auto-redirect to Home
```

---

## 🔑 Key Components & Their Roles

### Core Components
- **AuthContext** - Manages authentication state
- **useActiveCase** - Manages active case state and operations
- **CustomTabBar** - Bottom navigation bar
- **FloatingChatHead** - Floating chat button
- **ChatModal** - Full chat interface
- **HexagonalGrid** - Category selection UI
- **OfflineEmergency** - Offline mode screen

### Services
- **StorageService** - Local storage operations
- **notificationService** - Push notification handling
- **supabase** - Backend API client

---

## 📊 Database Schema (Key Tables)

### tbl_users
- user_id, email, phone, first_name, last_name, etc.

### tbl_reports
- report_id, reporter_id, assigned_office_id, category, description, status, latitude, longitude, etc.

### tbl_messages
- message_id, report_id, sender_id, sender_type, receiver_id, message_content, timestamp

### tbl_media
- media_id, report_id, file_url, file_type

---

## 🔔 Real-time Features

1. **Report Status Updates** - Real-time subscription to tbl_reports
2. **Chat Messages** - Real-time subscription to tbl_messages
3. **Active Case Monitoring** - Automatic refresh on status changes
4. **Network Monitoring** - Continuous connectivity checking

---

## 🛡️ Security & Permissions

- **Location Permission** - Required for emergency reports
- **Media Library Permission** - Required for image/video attachments
- **Notification Permission** - Required for push notifications
- **Session Management** - Secure storage with AsyncStorage
- **Supabase Auth** - Secure authentication with JWT tokens

---

## 📱 Navigation Structure

```
Stack Navigator (_layout.tsx)
├── index (Entry Point)
├── SplashScreen
├── Login
├── Register
├── Home (Tab Navigator)
│   ├── Home Tab
│   ├── Report Tab
│   ├── Profile Tab
│   └── Notifications Tab
├── OfflineEmergency
└── UserDataDemo
```

---

This flow documentation provides a comprehensive overview of how the AccessPoint application works from initialization to user interactions and data flow.


