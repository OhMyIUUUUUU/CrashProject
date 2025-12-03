# AccessPoint - Text-Based Feature Flowchart

## APP LAUNCH FLOW

1. **App Launch (index.tsx)**
   - Check Authentication Status
   - Load User from Storage
   - Check Supabase Session
   - Decision Point:
     - If Has Session → Go to Home Screen
     - If No Session → Go to Login Screen

## AUTHENTICATION FLOW

### Login Process
1. User enters Email/Phone and Password
2. Validate Input Fields
3. Submit to Supabase Auth
4. Decision Point:
   - If Success:
     - Save Session to AsyncStorage
     - Load User Data from tbl_users
     - Redirect to Home Screen
   - If Failure:
     - Show Error Message
     - Try Local Storage Fallback
     - Stay on Login Screen

### Registration Process
1. **Step 1: Personal Information**
   - Enter First Name
   - Enter Last Name
   - Enter Email
   - Enter Phone Number
   - Select Date of Birth
   - Select Gender
   - Click Next

2. **Step 2: Emergency Contact**
   - Enter Emergency Contact Name
   - Enter Emergency Contact Phone
   - Select Relationship
   - Click Next

3. **Step 3: Address Information**
   - Select Province (SearchablePicker)
   - Select City (SearchablePicker)
   - Select Barangay (SearchablePicker)
   - Enter Street Address
   - Click Next

4. **Step 4: Security**
   - Enter Password
   - Confirm Password
   - Validate Password Match
   - Click Submit

5. **Registration Submission**
   - Create Account in Supabase Auth
   - Create User Record in tbl_users
   - Save Session to AsyncStorage
   - Redirect to Home Screen

### Logout Process
1. User clicks Logout Button
2. Clear Supabase Session
3. Clear AsyncStorage Data
4. Redirect to Login Screen

## HOME SCREEN FLOW

### Initial Load
1. Check Network Connectivity (NetInfo)
   - If Offline → Redirect to OfflineEmergency Screen
   - If Online → Continue

2. Check Active Case (useActiveCase hook)
   - Query tbl_reports for status: pending or responding
   - If Active Case Found → Display Active Case Banner
   - If No Active Case → Show Normal Home Screen

3. Load User Data
   - Display Welcome Message
   - Show User Information

### SOS Button Flow
1. User Presses SOS Button
2. Check for Existing Active Case
   - If Active Case Exists → Open ChatScreen Directly
   - If No Active Case → Continue to SOS Process

3. SOS Countdown (3 seconds)
   - Display Countdown Timer
   - User can Cancel during countdown
   - If Cancelled → Stop Process
   - If Not Cancelled → Continue

4. Location Capture
   - Request Location Permission
   - Get GPS Coordinates (latitude, longitude)
   - Reverse Geocode to Get Address

5. Create Emergency Report
   - Insert into tbl_reports:
     - category: "Emergency"
     - description: "SOS Emergency"
     - status: "pending"
     - latitude: GPS latitude
     - longitude: GPS longitude
     - reporter_id: Current user ID
   - Upload to Supabase

6. Show Active Case Banner
   - Display Case Details
   - Show Status
   - Show Assigned Office (if assigned)

7. Auto-Open ChatScreen
   - Navigate to ChatScreen with report_id
   - Load Messages
   - Enable Real-time Chat

### Active Case Banner Flow
1. Banner Display (only if activeCase exists)
   - Show Category
   - Show Status (pending/responding)
   - Show Assigned Office Name (if assigned)
   - Show Timestamp

2. Cancel Report Button
   - User clicks Cancel
   - 5-Second Countdown
   - User can Cancel during countdown
   - If Confirmed:
     - Delete Messages from tbl_messages
     - Delete Media Files from Storage
     - Delete Report from tbl_reports
     - Refresh Active Case Status
     - Hide Active Case Banner

3. Chat Button
   - User clicks Chat Button
   - Navigate to ChatScreen with report_id
   - Load Messages
   - Enable Real-time Chat

### FloatingChatHead Flow (Draggable Message Icon)
1. Visibility Check
   - Only visible on Home Screen
   - Only visible if activeCase exists
   - Hidden on Report and Profile Screens

2. Drag Functionality
   - User can drag icon across screen
   - PanResponder handles drag gestures
   - Edge Snapping (left/right edges)
   - Distinguish between tap and drag

3. Tap to Open Chat
   - User taps icon (not drag)
   - Navigate to ChatScreen with report_id
   - Load Messages
   - Enable Real-time Chat

## REPORT SCREEN FLOW

### Form Initialization
1. Check Active Case
   - If Active Case Exists:
     - Load Case Data into Form
     - Pre-fill Category
     - Pre-fill Description
     - Pre-fill Role
     - Disable Submit Button
   - If No Active Case:
     - Show Empty Form
     - Enable Submit Button

### Category Selection
1. User Selects Category from HexagonalGrid
   - Options: Violence, Threat, Theft, Vandalism, Suspicious, Emergency, Other
2. Pre-fill Description Template
   - Show Category-specific Description Template
   - User can Edit Template

### Role Selection
1. User Selects Role
   - Option 1: Victim
   - Option 2: Witness
   - Default: Victim

### Description Input
1. User Enters Description
   - Multi-line Text Input
   - Can Edit Pre-filled Template
   - Character Count Display

### Image Attachments
1. User Clicks Add Image Button
2. Request Media Library Permission
   - If Permission Denied → Show Alert
   - If Permission Granted → Continue

3. Open Image Picker
   - Select Images/Videos from Gallery
   - Can Select Multiple Files

4. Upload to Supabase Storage
   - Upload to crash-media bucket
   - Store in reports/ folder
   - Save file_url to tbl_media
   - Link media to report_id

### Submit Report
1. Validation Check
   - Category Selected? → Required
   - Description Entered? → Required
   - Role Selected? → Required

2. Check Active Case
   - If Active Case Exists → Disable Submit (Button Disabled)
   - If No Active Case → Enable Submit

3. Submit Process
   - Get GPS Location (if available)
   - Reverse Geocode Address
   - Insert Report into tbl_reports:
     - category: Selected Category
     - description: User Description
     - status: "pending"
     - latitude: GPS latitude (if available)
     - longitude: GPS longitude (if available)
     - reporter_id: Current user ID
     - remarks: Role information
   - Upload Media Files to Storage
   - Link Media to Report in tbl_media
   - Upload to Supabase

4. Show Active Case Banner
   - Display Case Details
   - Show Status
   - Disable Submit Button

## CHAT SYSTEM FLOW

### ChatScreen Initialization
1. Receive report_id from Navigation
2. Load Messages from tbl_messages
   - Filter by report_id
   - Order by timestamp (ascending)
   - Display Messages in List

3. Set Up Real-time Subscription
   - Subscribe to tbl_messages changes
   - Filter by report_id
   - Auto-update UI on New Messages

### Send Message Flow
1. User Types Message
   - Text Input Field
   - Character Count

2. User Clicks Send Button
3. Validation
   - Message Not Empty? → Required

4. Insert Message into tbl_messages
   - report_id: Current report ID
   - sender_id: Current user ID
   - sender_type: "user"
   - receiver_id: assigned_office_id
   - message_content: User Message
   - timestamp: Current Time

5. Real-time Update
   - Message Appears in Chat List
   - Auto-scroll to Bottom
   - Office Receives Notification

### Receive Message Flow
1. Real-time Subscription Detects New Message
2. Check Message Type
   - If sender_type = "user" → Display Right-aligned (User Message)
   - If sender_type = "police_office" or "admin" → Display Left-aligned (Office Message)

3. Update Chat List
   - Add Message to List
   - Auto-scroll to Bottom
   - Show Timestamp

### Chat Access Points
1. **From SOS Button**
   - SOS Report Created
   - Auto-navigate to ChatScreen
   - Pass report_id

2. **From FloatingChatHead**
   - User Taps Message Icon
   - Navigate to ChatScreen
   - Pass activeCase.report_id

3. **From Active Case Banner**
   - User Clicks Chat Button
   - Navigate to ChatScreen
   - Pass activeCase.report_id

4. **From Notifications**
   - User Taps Notification Item
   - Navigate to ChatScreen
   - Pass notification.report_id

## PROFILE SCREEN FLOW

### Profile Display
1. Load User Data
   - Get User from AuthContext
   - Display User Information:
     - Name, Email, Phone
     - Date of Birth, Gender
     - Profile Picture

2. Display Emergency Contact
   - Emergency Contact Name
   - Emergency Contact Phone
   - Relationship

3. Display Address Information
   - Province, City, Barangay
   - Street Address

### Edit Profile Flow
1. User Clicks Edit Button
2. Show Edit Form
   - Pre-fill Current Values
   - Allow Editing All Fields

3. User Makes Changes
4. User Clicks Save
5. Update in Supabase
   - Update tbl_users Record
   - Update AsyncStorage
   - Refresh User Context

6. Show Success Message
7. Update Display

### Logout Flow
1. User Clicks Logout Button
2. Confirm Logout
3. Clear Supabase Session
4. Clear AsyncStorage
5. Redirect to Login Screen

## OFFLINE MODE FLOW

### Network Monitoring
1. Global Network Listener (NetInfo)
   - Monitor Connection Status
   - Detect Connection Loss
   - Detect Connection Restoration

2. Connection Lost
   - If Not on OfflineEmergency Screen → Redirect to OfflineEmergency
   - If on Login/Splash Screen → Stay on Current Screen

3. Connection Restored
   - If on OfflineEmergency Screen → Auto-redirect to Home
   - Update Connection Status Display

### OfflineEmergency Screen Flow
1. Display Emergency Services
   - Show Call Buttons: 911, Police, Fire, Medical
   - Show SMS Button

2. Emergency Call Flow
   - User Clicks Call Button
   - Open Phone Dialer (Linking.openURL)
   - Dial Emergency Number

3. Emergency SMS Flow
   - User Clicks SMS Button
   - Get GPS Location
   - Load User Profile from AsyncStorage
   - Format SMS Message:
     - User Name, Phone, Email
     - Emergency Contact Info
     - GPS Coordinates
     - Reverse Geocoded Address
   - Open SMS App (Linking.openURL)
   - Pre-fill Message

4. Personal Emergency Contact
   - Display Emergency Contact Info
   - Call Emergency Contact Button
   - SMS Emergency Contact Button

5. Offline SOS Button
   - Same UI as Online SOS (Neumorphic Design)
   - User Clicks SOS
   - Show Action Sheet:
     - Option 1: Call 911
     - Option 2: Message 911
   - Execute Selected Action

6. Connection Monitor
   - Display Connection Status
   - Show "Reconnecting..." Message
   - Auto-redirect when Connected

## NOTIFICATION FLOW

### Notification Initialization
1. App Start (_layout.tsx)
   - Initialize Notification Service
   - Request Notification Permissions
   - Create Android Channel
   - Show Welcome Notification (if permission just granted)

### Notification Listeners
1. Foreground Events
   - Listen for Notifications while App is Open
   - Handle Notification Tap
   - Navigate to Appropriate Screen

2. Background Events
   - Listen for Notifications while App is Closed
   - Handle Notification Tap
   - Open App and Navigate

3. Initial Notification
   - Check if App Opened from Notification
   - Navigate to Appropriate Screen

### Notification Display
1. Notification Received
   - Show in Notification Tray
   - Display Title and Body
   - Include Navigation Data

2. User Taps Notification
   - Extract Notification Data
   - Navigate Based on Type:
     - If report_id exists → Navigate to ChatScreen
     - If type = "navigation" → Navigate to Notifications Screen
     - Default → Navigate to Home Screen

### Notifications Screen Flow
1. Load Case History
   - Query tbl_reports
   - Filter: status in [pending, assigned, investigating, resolved, closed]
   - Order by updated_at (descending)
   - Limit to 20 Most Recent

2. Display Case List
   - Show Category
   - Show Status
   - Show Timestamp
   - Show Assigned Office (if assigned)

3. User Taps Case Item
   - Navigate to ChatScreen
   - Pass report_id
   - Load Messages

4. Real-time Updates
   - Subscribe to tbl_reports changes
   - Auto-refresh Case List
   - Update Status Display

## ACTIVE CASE MANAGEMENT FLOW

### Check Active Case (useActiveCase hook)
1. Get Current User ID
   - Check Supabase Session
   - Get user_id from tbl_users

2. Query Active Reports
   - Query tbl_reports
   - Filter: reporter_id = current user
   - Filter: status = "pending" OR status = "responding"
   - Order by created_at (descending)
   - Get First Result

3. Set Active Case State
   - If Active Report Found → Set activeCase
   - If No Active Report → Set activeCase to null

4. Real-time Subscription
   - Subscribe to tbl_reports changes
   - Filter by reporter_id
   - On Any Change → Refresh Active Case

### Check Notifications (useActiveCase hook)
1. Get Current User ID
   - Check Supabase Session
   - Get user_id from tbl_users

2. Query Notification Cases
   - Query tbl_reports
   - Filter: reporter_id = current user
   - Filter: status in [pending, assigned, investigating, resolved, closed]
   - Order by updated_at (descending)
   - Limit to 20

3. Set Notifications State
   - Store in notifications array
   - Display in Notifications Screen

### Cancel Report Flow
1. User Clicks Cancel Button
2. Show Confirmation (5-second countdown)
3. User Confirms Cancellation
4. Delete Process:
   - Get All Media Files for Report
   - Delete Media Files from Supabase Storage
   - Delete Media Records from tbl_media
   - Delete Messages from tbl_messages
   - Delete Report from tbl_reports
5. Refresh Active Case
   - Call checkActiveCase()
   - Hide Active Case Banner
   - Enable Submit Button (if on Report Screen)

### Case Status Flow
1. **Pending Status**
   - Report Created
   - Status: "pending"
   - Shows in Active Case Banner
   - User can Cancel

2. **Responding Status**
   - Office Assigned
   - Status: "responding"
   - Shows in Active Case Banner
   - User can Chat with Office

3. **Assigned Status**
   - Office Formally Assigned
   - Status: "assigned"
   - Moves to Notifications
   - Removed from Active Case Banner

4. **Investigating Status**
   - Office Investigating
   - Status: "investigating"
   - Shows in Notifications
   - User can View in Notifications

5. **Resolved Status**
   - Case Resolved
   - Status: "resolved"
   - Moves to Notifications
   - Removed from Active Case Banner

6. **Closed Status**
   - Case Closed
   - Status: "closed"
   - Shows in Notifications
   - Final Status

7. **Cancelled Status**
   - User Cancelled Report
   - Status: "cancelled" (or deleted)
   - Removed from Active Case
   - Not Shown in Notifications

## DATA STORAGE FLOW

### Supabase Database
1. **tbl_users**
   - User Profile Data
   - Authentication Info
   - Emergency Contact
   - Address Information

2. **tbl_reports**
   - Emergency Reports
   - Status Tracking
   - Location Data
   - Assigned Office

3. **tbl_messages**
   - Chat Messages
   - Sender/Receiver Info
   - Timestamps
   - Message Content

4. **tbl_media**
   - Report Attachments
   - File URLs
   - File Types
   - Linked to Reports

### AsyncStorage (Local)
1. **@user_data**
   - User Session Data
   - Profile Information
   - Offline Fallback

2. **@is_logged_in**
   - Authentication Status
   - Session Persistence

### Supabase Storage
1. **crash-media Bucket**
   - Report Images
   - Report Videos
   - Organized in reports/ Folder

## REAL-TIME FEATURES

### Report Status Updates
1. Subscribe to tbl_reports
2. Listen for Status Changes
3. Auto-refresh Active Case
4. Update UI Immediately

### Chat Messages
1. Subscribe to tbl_messages
2. Listen for New Messages
3. Auto-update Chat List
4. Show New Messages Instantly

### Network Monitoring
1. Global NetInfo Listener
2. Detect Connection Changes
3. Auto-redirect to Offline Mode
4. Auto-redirect Back to Home

## USER JOURNEYS

### Journey 1: Emergency SOS
1. User opens app → Home Screen
2. User presses SOS Button
3. 3-second countdown (can cancel)
4. Location captured → Report created
5. Active Case Banner appears
6. Auto-opens ChatScreen
7. User communicates with assigned office
8. Case resolved → Moved to Notifications

### Journey 2: Detailed Report
1. User navigates to Report Tab
2. Selects Category → Fills Description → Adds Images
3. Submits Report → Active Case Created
4. View Active Case Banner → Open Chat
5. Communicate with Assigned Office
6. Case Resolved → Moved to Notifications

### Journey 3: Offline Emergency
1. Network disconnection detected
2. Auto-redirect to OfflineEmergency Screen
3. Access Emergency Services:
   - Call Police/Fire/Medical
   - Send SMS with Location
   - Call Personal Emergency Contact
4. Connection restored → Auto-redirect to Home

### Journey 4: Profile Management
1. User navigates to Profile Tab
2. Views Profile Information
3. Clicks Edit Button
4. Updates Information
5. Saves Changes
6. Profile Updated in Database

### Journey 5: Case Cancellation
1. User has Active Case
2. Views Active Case Banner
3. Clicks Cancel Button
4. 5-second countdown
5. Confirms Cancellation
6. Report Deleted
7. Active Case Banner Disappears
8. Submit Button Enabled (if on Report Screen)

---

**This text-based flowchart documents all features and flows in the AccessPoint mobile application without visual diagrams.**
