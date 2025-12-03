# Eraser Flowchart Prompt for AccessPoint Mobile App

## Complete Mobile App Flowchart Prompt

Use this prompt with Eraser.io or similar flowchart tools to generate visual flowcharts for the AccessPoint mobile application.

---

## PROMPT FOR ERASER.IO:

```
Create a comprehensive flowchart for the AccessPoint mobile application starting from App Launch and covering Authentication, Home Screen, Report Submission, Chat System, Profile Management, Offline Mode, and Notifications. Include all database interactions (Supabase) and real-time subscriptions.

## START: App Launch Flow

[Start] App Launch (index.tsx)
  |
  | Check Authentication Status
  |   - Load User from AsyncStorage
  |   - Check Supabase Session
  |
  | Decision: Has Session?
  |   |
  |   |-- YES --> [Load User Data] --> [Redirect to Home Screen]
  |   |
  |   |-- NO --> [Redirect to Login Screen]
  |
[End Launch]

## AUTHENTICATION FLOW

[Start Login] Login Screen
  |
  | User enters Email/Phone and Password
  |
  | Validate Input Fields
  |
  | Process: Submit to Supabase Auth
  |
  | Database Check: Verify credentials against tbl_users
  |
  | Decision: Authentication Success?
  |   |
  |   |-- YES --> [Save Session to AsyncStorage] --> [Load User Data from tbl_users] --> [Redirect to Home Screen]
  |   |
  |   |-- NO --> [Show Error Message] --> [Try Local Storage Fallback] --> [Stay on Login Screen]
  |
[End Login]

[Start Register] Register Screen
  |
  | Step 1: Personal Information
  |   - Enter First Name, Last Name
  |   - Enter Email, Phone Number
  |   - Select Date of Birth (DatePicker)
  |   - Select Gender (SimplePicker)
  |   - Click [Next]
  |
  | Step 2: Emergency Contact
  |   - Enter Emergency Contact Name, Phone
  |   - Select Relationship (SimplePicker)
  |   - Click [Next] or [Back]
  |
  | Step 3: Address Information
  |   - Select Province (SearchablePicker)
  |   - Select City (SearchablePicker)
  |   - Select Barangay (SearchablePicker)
  |   - Enter Street Address
  |   - Click [Next] or [Back]
  |
  | Step 4: Security
  |   - Enter Password
  |   - Confirm Password
  |   - Validate Password Match
  |   - Click [Submit]
  |
  | Process: Create Account
  |   - Create Account in Supabase Auth
  |   - Create User Record in tbl_users
  |   - Save Session to AsyncStorage
  |
  | [Redirect to Home Screen]
  |
[End Register]

## HOME SCREEN FLOW

[Start Home] Home Screen Load
  |
  | Check Network Connectivity (NetInfo)
  |   |
  |   |-- Offline --> [Redirect to OfflineEmergency Screen]
  |   |
  |   |-- Online --> Continue
  |
  | Check Active Case (useActiveCase hook)
  |   - Query tbl_reports WHERE status IN ('pending', 'responding')
  |   - Real-time Subscription to tbl_reports
  |
  | Decision: Active Case Found?
  |   |
  |   |-- YES --> [Display Active Case Banner] --> [Show FloatingChatHead]
  |   |
  |   |-- NO --> [Show Normal Home Screen]
  |
  | Load User Data
  |   - Display Welcome Message
  |   - Show User Information
  |
  | User Action: Press SOS Button
  |   |
  |   | Check for Existing Active Case
  |   |   |
  |   |   |-- Has Active Case --> [Open ChatScreen Directly]
  |   |   |
  |   |   |-- No Active Case --> Continue
  |   |
  |   | SOS Countdown (3 seconds)
  |   |   - Display Countdown Timer
  |   |   - User can Cancel
  |   |   |
  |   |   |-- Cancelled --> [Stop Process]
  |   |   |
  |   |   |-- Not Cancelled --> Continue
  |   |
  |   | Location Capture
  |   |   - Request Location Permission
  |   |   - Get GPS Coordinates
  |   |   - Reverse Geocode Address
  |   |
  |   | Create Emergency Report
  |   |   - INSERT INTO tbl_reports
  |   |     (category: "Emergency", description: "SOS Emergency", status: "pending", latitude, longitude, reporter_id)
  |   |   - Upload to Supabase
  |   |
  |   | Show Active Case Banner
  |   |
  |   | Auto-Open ChatScreen
  |   |   - Navigate to ChatScreen with report_id
  |   |   - Load Messages
  |   |   - Enable Real-time Chat
  |
  | User Action: Click Active Case Banner - Cancel Report
  |   |
  |   | 5-Second Countdown
  |   |   - User can Cancel during countdown
  |   |
  |   | Decision: Confirmed?
  |   |   |
  |   |   |-- YES --> Delete Process:
  |   |   |   - Delete Messages from tbl_messages
  |   |   |   - Delete Media Files from Supabase Storage
  |   |   |   - Delete Report from tbl_reports
  |   |   |   - Refresh Active Case Status
  |   |   |   - Hide Active Case Banner
  |   |
  | User Action: Click Active Case Banner - Chat Button
  |   |
  |   | Navigate to ChatScreen with report_id
  |
  | User Action: Tap FloatingChatHead (Draggable Message Icon)
  |   |
  |   | Visibility Check:
  |   |   - Only visible on Home Screen
  |   |   - Only visible if activeCase exists
  |
  |   | Drag Functionality:
  |   |   - PanResponder handles drag gestures
  |   |   - Edge Snapping (left/right)
  |   |   - Distinguish tap vs drag
  |
  |   | On Tap:
  |   |   - Navigate to ChatScreen with report_id
  |
[End Home]

## REPORT SCREEN FLOW

[Start Report] Report Screen Load
  |
  | Check Active Case
  |   |
  |   |-- Active Case Exists --> [Load Case Data into Form] --> [Pre-fill Category, Description, Role] --> [Disable Submit Button]
  |   |
  |   |-- No Active Case --> [Show Empty Form] --> [Enable Submit Button]
  |
  | User Action: Select Category (HexagonalGrid)
  |   - Options: Violence, Threat, Theft, Vandalism, Suspicious, Emergency, Other
  |   - Pre-fill Description Template
  |
  | User Action: Select Role
  |   - Option 1: Victim
  |   - Option 2: Witness
  |
  | User Action: Enter Description
  |   - Multi-line Text Input
  |   - Can Edit Pre-filled Template
  |   - Character Count Display
  |
  | User Action: Add Image Attachments
  |   |
  |   | Click Add Image Button
  |   |
  |   | Request Media Library Permission
  |   |   |
  |   |   |-- Denied --> [Show Alert]
  |   |   |
  |   |   |-- Granted --> Continue
  |   |
  |   | Open Image Picker
  |   |   - Select Images/Videos from Gallery
  |   |   - Can Select Multiple Files
  |   |
  |   | Upload to Supabase Storage
  |   |   - Upload to crash-media bucket
  |   |   - Store in reports/ folder
  |   |   - INSERT INTO tbl_media (file_url, report_id, file_type)
  |
  | User Action: Submit Report
  |   |
  |   | Validation Check:
  |   |   - Category Selected? (Required)
  |   |   - Description Entered? (Required)
  |   |   - Role Selected? (Required)
  |
  |   | Check Active Case
  |   |   |
  |   |   |-- Active Case Exists --> [Disable Submit]
  |   |   |
  |   |   |-- No Active Case --> Continue
  |
  |   | Submit Process:
  |   |   - Get GPS Location (if available)
  |   |   - Reverse Geocode Address
  |   |   - INSERT INTO tbl_reports
  |   |     (category, description, status: "pending", latitude, longitude, reporter_id, remarks: role)
  |   |   - Upload Media Files to Storage
  |   |   - Link Media to Report in tbl_media
  |   |   - Upload to Supabase
  |
  |   | Show Active Case Banner
  |   |   - Display Case Details
  |   |   - Show Status
  |   |   - Disable Submit Button
  |
[End Report]

## CHAT SYSTEM FLOW

[Start Chat] ChatScreen Initialization
  |
  | Receive report_id from Navigation
  |
  | Load Messages from tbl_messages
  |   - SELECT * FROM tbl_messages WHERE report_id = ?
  |   - ORDER BY timestamp ASC
  |   - Display Messages in List
  |
  | Set Up Real-time Subscription
  |   - Subscribe to tbl_messages changes
  |   - Filter by report_id
  |   - Auto-update UI on New Messages
  |
  | User Action: Send Message
  |   |
  |   | User Types Message
  |   |
  |   | Click Send Button
  |   |
  |   | Validation: Message Not Empty? (Required)
  |   |
  |   | INSERT INTO tbl_messages
  |   |   (report_id, sender_id, sender_type: "user", receiver_id: assigned_office_id, message_content, timestamp)
  |
  |   | Real-time Update:
  |   |   - Message Appears in Chat List
  |   |   - Auto-scroll to Bottom
  |   |   - Office Receives Notification
  |
  | Receive Message Flow:
  |   - Real-time Subscription Detects New Message
  |   - Check Message Type:
  |     - sender_type = "user" → Display Right-aligned (User Message)
  |     - sender_type = "police_office" or "admin" → Display Left-aligned (Office Message)
  |   - Update Chat List
  |   - Auto-scroll to Bottom
  |   - Show Timestamp
  |
  | Chat Access Points:
  |   - From SOS Button → Auto-opens ChatScreen
  |   - From FloatingChatHead → Navigate to ChatScreen
  |   - From Active Case Banner → Navigate to ChatScreen
  |   - From Notifications → Navigate to ChatScreen
  |
[End Chat]

## PROFILE SCREEN FLOW

[Start Profile] Profile Screen Load
  |
  | Load User Data from AuthContext
  |
  | Display User Information:
  |   - Name, Email, Phone
  |   - Date of Birth, Gender
  |   - Profile Picture
  |
  | Display Emergency Contact:
  |   - Emergency Contact Name, Phone
  |   - Relationship
  |
  | Display Address Information:
  |   - Province, City, Barangay
  |   - Street Address
  |
  | User Action: Edit Profile
  |   |
  |   | Click Edit Button
  |   |
  |   | Show Edit Form (pre-filled with current values)
  |   |
  |   | User Makes Changes
  |   |
  |   | Click Save
  |   |
  |   | UPDATE tbl_users Record
  |   | UPDATE AsyncStorage
  |   | Refresh User Context
  |
  |   | Show Success Message
  |   | Update Display
  |
  | User Action: Logout
  |   |
  |   | Click Logout Button
  |   |
  |   | Confirm Logout (if implemented)
  |   |
  |   | Clear Supabase Session
  |   | Clear AsyncStorage
  |   | Redirect to Login Screen
  |
[End Profile]

## OFFLINE MODE FLOW

[Start Offline] Network Monitoring (Global)
  |
  | Global Network Listener (NetInfo)
  |   - Monitor Connection Status
  |   - Detect Connection Loss
  |   - Detect Connection Restoration
  |
  | Connection Lost:
  |   - If Not on OfflineEmergency Screen → [Redirect to OfflineEmergency]
  |   - If on Login/Splash Screen → [Stay on Current Screen]
  |
  | Connection Restored:
  |   - If on OfflineEmergency Screen → [Auto-redirect to Home]
  |   - Update Connection Status Display
  |
[End Offline Monitor]

[Start OfflineEmergency] OfflineEmergency Screen
  |
  | Display Emergency Services:
  |   - Call 911 Button
  |   - Call Police Button
  |   - Call Fire Button
  |   - Call Medical Button
  |   - SMS Emergency Button
  |
  | Emergency Call Flow:
  |   - User Clicks Call Button
  |   - Open Phone Dialer (Linking.openURL)
  |   - Dial Emergency Number
  |
  | Emergency SMS Flow:
  |   - User Clicks SMS Button
  |   - Get GPS Location
  |   - Load User Profile from AsyncStorage
  |   - Format SMS Message:
  |     - User Name, Phone, Email
  |     - Emergency Contact Info
  |     - GPS Coordinates
  |     - Reverse Geocoded Address
  |   - Open SMS App (Linking.openURL)
  |   - Pre-fill Message
  |
  | Personal Emergency Contact:
  |   - Display Emergency Contact Info
  |   - Call Emergency Contact Button
  |   - SMS Emergency Contact Button
  |
  | Offline SOS Button:
  |   - Same UI as Online SOS (Neumorphic Design)
  |   - User Clicks SOS
  |   - Show Action Sheet:
  |     - Option 1: Call 911
  |     - Option 2: Message 911
  |   - Execute Selected Action
  |
  | Connection Monitor:
  |   - Display Connection Status
  |   - Show "Reconnecting..." Message
  |   - Auto-redirect when Connected
  |
[End OfflineEmergency]

## NOTIFICATION FLOW

[Start Notifications] Notification Initialization
  |
  | App Start (_layout.tsx)
  |   - Initialize Notification Service (Notifee)
  |   - Request Notification Permissions
  |   - Create Android Channel
  |   - Show Welcome Notification (if permission just granted)
  |
  | Notification Listeners:
  |   - Foreground Events: Listen while App is Open
  |   - Background Events: Listen while App is Closed
  |   - Initial Notification: Check if App Opened from Notification
  |
  | Notification Display:
  |   - Show in Notification Tray
  |   - Display Title and Body
  |   - Include Navigation Data
  |
  | User Taps Notification:
  |   - Extract Notification Data
  |   - Navigate Based on Type:
  |     - If report_id exists → Navigate to ChatScreen
  |     - If type = "navigation" → Navigate to Notifications Screen
  |     - Default → Navigate to Home Screen
  |
[End Notification Init]

[Start NotificationsScreen] Notifications Screen
  |
  | Load Case History
  |   - Query tbl_reports
  |   - Filter: status IN ('pending', 'assigned', 'investigating', 'resolved', 'closed')
  |   - Order by updated_at DESC
  |   - Limit to 20 Most Recent
  |
  | Display Case List:
  |   - Show Category
  |   - Show Status
  |   - Show Timestamp
  |   - Show Assigned Office (if assigned)
  |
  | User Taps Case Item:
  |   - Navigate to ChatScreen
  |   - Pass report_id
  |   - Load Messages
  |
  | Real-time Updates:
  |   - Subscribe to tbl_reports changes
  |   - Auto-refresh Case List
  |   - Update Status Display
  |
[End NotificationsScreen]

## ACTIVE CASE MANAGEMENT FLOW

[Start ActiveCase] Check Active Case (useActiveCase hook)
  |
  | Get Current User ID
  |   - Check Supabase Session
  |   - Get user_id from tbl_users
  |
  | Query Active Reports
  |   - Query tbl_reports
  |   - Filter: reporter_id = current user
  |   - Filter: status = "pending" OR status = "responding"
  |   - Order by created_at DESC
  |   - Get First Result
  |
  | Set Active Case State:
  |   - If Active Report Found → Set activeCase
  |   - If No Active Report → Set activeCase to null
  |
  | Real-time Subscription:
  |   - Subscribe to tbl_reports changes
  |   - Filter by reporter_id
  |   - On Any Change → Refresh Active Case
  |
  | Check Notifications:
  |   - Query tbl_reports
  |   - Filter: reporter_id = current user
  |   - Filter: status IN ('pending', 'assigned', 'investigating', 'resolved', 'closed')
  |   - Order by updated_at DESC
  |   - Limit to 20
  |   - Store in notifications array
  |
  | Cancel Report Flow:
  |   - User Clicks Cancel Button
  |   - Show Confirmation (5-second countdown)
  |   - User Confirms Cancellation
  |   - Delete Process:
  |     - Get All Media Files for Report
  |     - Delete Media Files from Supabase Storage
  |     - Delete Media Records from tbl_media
  |     - Delete Messages from tbl_messages
  |     - Delete Report from tbl_reports
  |   - Refresh Active Case
  |   - Hide Active Case Banner
  |   - Enable Submit Button (if on Report Screen)
  |
  | Case Status Flow:
  |   - "pending" → Shows in Active Case Banner, User can Cancel
  |   - "responding" → Shows in Active Case Banner, User can Chat
  |   - "assigned" → Moves to Notifications, Removed from Active Case Banner
  |   - "investigating" → Shows in Notifications
  |   - "resolved" → Moves to Notifications, Removed from Active Case Banner
  |   - "closed" → Shows in Notifications, Final Status
  |   - "cancelled" → Removed from Active Case, Not Shown in Notifications
  |
[End ActiveCase]

## DATABASE SCHEMA REFERENCE

### Tables:
- tbl_users: user_id (PK), email, phone, password_hash, first_name, last_name, birthdate, sex, emergency_contact_name, emergency_contact_number, region, city, barangay, created_at
- tbl_reports: report_id (PK), reporter_id (FK → tbl_users), assigned_office_id (FK → tbl_police_offices), category, description, status (enum), latitude, longitude, location_city, location_barangay, remarks, created_at, updated_at
- tbl_messages: message_id (PK), report_id (FK → tbl_reports, ON DELETE CASCADE), sender_id, sender_type (enum), receiver_id, message_content, timestamp
- tbl_media: media_id (PK), file_url, report_id (FK → tbl_reports, ON DELETE CASCADE), file_type (enum), sender_id, uploaded_at

### Enums:
- report_status_enum: 'pending', 'assigned', 'investigating', 'responding', 'resolved', 'closed'
- message_sender_type_enum: 'user', 'police_office', 'admin'
- media_file_type_enum: 'image', 'video', 'audio'

### Foreign Keys:
- tbl_reports.reporter_id → tbl_users.user_id
- tbl_reports.assigned_office_id → tbl_police_offices.office_id
- tbl_messages.report_id → tbl_reports.report_id (ON DELETE CASCADE)
- tbl_media.report_id → tbl_reports.report_id (ON DELETE CASCADE)

### Storage:
- Supabase Storage: crash-media bucket
- AsyncStorage: @user_data, @is_logged_in
```

---

## Additional Notes for Eraser:

1. **Use different shapes:**
   - Rectangles for processes
   - Diamonds for decisions
   - Cylinders for database operations
   - Parallelograms for input/output
   - Rounded rectangles for start/end points

2. **Color coding:**
   - Blue: Database operations (Supabase)
   - Green: Real-time subscriptions
   - Orange: User actions
   - Purple: Navigation/routing
   - Red: Emergency/SOS actions

3. **Include:**
   - All database table names in brackets [tbl_reports]
   - SQL queries in italics
   - Decision points with YES/NO branches
   - Real-time subscription indicators
   - Navigation flows between screens

4. **Group sections:**
   - App Launch (top)
   - Authentication (Login/Register)
   - Home Screen (center)
   - Report Screen (left)
   - Chat System (right)
   - Profile (bottom left)
   - Offline Mode (bottom center)
   - Notifications (bottom right)
   - Active Case Management (overlay)

5. **Key Features to Highlight:**
   - Real-time subscriptions (tbl_reports, tbl_messages)
   - Network monitoring and offline mode
   - Active case management
   - Draggable FloatingChatHead
   - SOS emergency flow
   - Multi-step registration

---

**Copy the prompt above and paste it into Eraser.io to generate the visual flowchart for the AccessPoint mobile application.**
