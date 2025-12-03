# AccessPoint Mobile App - Complete UI Components List

## PAGES

### 1. Login Page
- **Path**: `/screens/AccessPoint/components/Login/Login`
- **Purpose**: User authentication entry point

### 2. Register Page
- **Path**: `/screens/AccessPoint/components/Register/Register`
- **Purpose**: New user registration

### 3. Splash Screen
- **Path**: `/screens/AccessPoint/components/SplashScreen/SplashScreen`
- **Purpose**: App initialization and routing

### 4. Home Page
- **Path**: `/screens/Home/Home`
- **Purpose**: Main dashboard with SOS button and active case display

### 5. Report Page
- **Path**: `/screens/Home/Report`
- **Purpose**: Submit detailed incident reports

### 6. Profile Page
- **Path**: `/screens/Home/Profile`
- **Purpose**: View and edit user profile

### 7. Chat Screen
- **Path**: `/screens/Home/ChatScreen`
- **Purpose**: Real-time messaging with assigned office

### 8. Notifications Screen
- **Path**: `/screens/Notifications/Notifications`
- **Purpose**: View case history and notifications

### 9. Offline Emergency Screen
- **Path**: `/screens/AccessPoint/components/OfflineEmergency/OfflineEmergency`
- **Purpose**: Emergency services when offline

---

## SUB-PAGES / SECTIONS

### Register Page Sections (Multi-step Form)

#### Step 1: Personal Information Section
- First Name Input Field
- Last Name Input Field
- Email Input Field
- Phone Number Input Field
- Date of Birth Picker (DatePicker Component)
- Gender Selection (SimplePicker Component)
- Next Button

#### Step 2: Emergency Contact Section
- Emergency Contact Name Input Field
- Emergency Contact Phone Input Field
- Relationship Selection (SimplePicker Component)
- Next Button
- Back Button

#### Step 3: Address Information Section
- Province Selection (SearchablePicker Component)
- City Selection (SearchablePicker Component)
- Barangay Selection (SearchablePicker Component)
- Street Address Input Field
- Next Button
- Back Button

#### Step 4: Security Section
- Password Input Field
- Confirm Password Input Field
- Submit Button
- Back Button

### Home Page Sections

#### Welcome Section
- User Welcome Card
- User Name Display
- User Information Display

#### Active Case Banner Section (Conditional - Only if activeCase exists)
- Case Details Display
- Category Badge
- Status Badge
- Assigned Office Name
- Timestamp Display
- Cancel Report Button (with 5-second countdown)
- Chat Button

#### SOS Button Section
- Large SOS Emergency Button (Neumorphic Design)
- Pulsing Animation
- SOS Text
- Emergency Subtext

#### Bottom Tab Navigation Section
- Home Tab Button
- Report Tab Button
- Profile Tab Button
- Notifications Tab Button

### Report Page Sections

#### Category Selection Section
- HexagonalGrid Component
- Category Options:
  - Violence
  - Threat
  - Theft
  - Vandalism
  - Suspicious
  - Emergency
  - Other

#### Role Selection Section
- Victim Radio Button
- Witness Radio Button

#### Description Section
- Description TextArea
- Character Count Display
- Pre-filled Template (based on category)

#### Image Attachments Section
- Add Image Button
- Image Preview Grid
- Remove Image Buttons (per image)

#### Submit Section
- Submit Button (LinearGradient)
- Disabled State (when activeCase exists)

#### Active Case Display Section (Conditional - Only if activeCase exists)
- Case Details Card
- Status Display
- Disabled Submit Button

### Profile Page Sections

#### Personal Information Section
- Profile Picture Display
- First Name Display
- Last Name Display
- Email Display
- Phone Number Display
- Date of Birth Display
- Gender Display

#### Emergency Contact Section
- Emergency Contact Name Display
- Emergency Contact Phone Display
- Relationship Display

#### Address Information Section
- Region Display
- City Display
- Barangay Display
- Street Address Display

#### Actions Section
- Edit Profile Button
- Logout Button

### Chat Screen Sections

#### Messages List Section
- Scrollable Messages Container
- User Messages (Right-aligned)
- Office Messages (Left-aligned)
- Timestamp Display (per message)
- Loading Indicator

#### Input Section
- Message Text Input Field
- Send Button
- Character Count (optional)

### Notifications Screen Sections

#### Case History List Section
- Scrollable List of Cases
- Case Cards:
  - Category Badge
  - Status Badge
  - Description Preview
  - Timestamp Display
  - Tap to Open Chat

#### Filter Section (if implemented)
- Date Range Filter
- Category Filter

### Offline Emergency Screen Sections

#### Emergency Services Section
- Call 911 Button
- Call Police Button
- Call Fire Button
- Call Medical Button
- SMS Emergency Button

#### Personal Emergency Contact Section
- Emergency Contact Name Display
- Emergency Contact Phone Display
- Call Emergency Contact Button
- SMS Emergency Contact Button

#### SOS Button Section
- SOS Emergency Button (Neumorphic Design - matches online SOS)
- Same size and styling as online SOS

#### Connection Status Section
- Connection Status Indicator
- Reconnecting Message (when offline)
- Connection Restored Message (when online)

---

## ELEMENTS

### Input Elements

#### Text Input Fields
- Email Input (Login, Register)
- Phone Input (Register)
- First Name Input (Register)
- Last Name Input (Register)
- Password Input (Login, Register)
- Confirm Password Input (Register)
- Emergency Contact Name Input (Register)
- Emergency Contact Phone Input (Register)
- Street Address Input (Register)
- Description TextArea (Report)
- Message Text Input (Chat Screen)
- Remarks TextArea (if implemented)

#### Selection Elements
- Date Picker (DatePicker Component - Register)
- Gender Picker (SimplePicker Component - Register)
- Relationship Picker (SimplePicker Component - Register)
- Province Picker (SearchablePicker Component - Register)
- City Picker (SearchablePicker Component - Register)
- Barangay Picker (SearchablePicker Component - Register)
- Category Selection (HexagonalGrid - Report)
- Role Selection (Radio Buttons - Report)

#### Image/Media Elements
- Image Picker Button (Report)
- Image Preview (Report)
- Media Gallery (Chat Screen - if media messages supported)
- Profile Picture Display (Profile)

### Display Elements

#### Text Displays
- User Name Display
- User Email Display
- User Phone Display
- Case Category Display
- Case Status Display
- Case Description Display
- Assigned Office Name Display
- Timestamp Displays (various)
- Character Count Display
- Error Messages
- Success Messages
- Loading Messages

#### Badges/Labels
- Category Badge
- Status Badge
- Active Case Badge

#### Cards/Containers
- Welcome Card (Home)
- Active Case Banner Card (Home)
- Case Details Card (Report)
- Profile Information Cards (Profile)
- Case History Cards (Notifications)
- Emergency Service Cards (Offline Emergency)

### Button Elements

#### Primary Buttons
- Login Button
- Register Button
- Submit Report Button
- Send Message Button
- Update Profile Button
- Logout Button

#### Secondary Buttons
- Cancel Button (various)
- Back Button (Register steps)
- Next Button (Register steps)
- Edit Button (Profile)
- Close Button (Modals/Popups)

#### Action Buttons
- SOS Button (Home, Offline Emergency)
- Cancel Report Button (Home - with countdown)
- Chat Button (Home - Active Case Banner)
- Add Image Button (Report)
- Remove Image Button (Report)
- Call Buttons (Offline Emergency)
- SMS Buttons (Offline Emergency)

#### Navigation Buttons
- Home Tab Button
- Report Tab Button
- Profile Tab Button
- Notifications Tab Button

### Floating Elements

#### FloatingChatHead (Floating Message Icon)
- Draggable Message Icon
- Only visible on Home Screen
- Only visible if activeCase exists
- Position: Absolute (draggable)
- Edge Snapping (left/right)
- Tap to Open Chat

---

## TOGGLES

### Visibility Toggles

#### Active Case Banner Toggle
- **Location**: Home Page
- **Condition**: Only visible if activeCase exists
- **States**: Visible / Hidden

#### FloatingChatHead Toggle
- **Location**: Home Page
- **Condition**: Only visible if activeCase exists
- **States**: Visible / Hidden

#### Submit Button Toggle
- **Location**: Report Page
- **Condition**: Disabled if activeCase exists, Enabled if no activeCase
- **States**: Enabled / Disabled

#### ChatBox Toggle (if still used)
- **Location**: Various Pages
- **Condition**: Only visible if activeCase exists
- **States**: Visible / Hidden

### State Toggles

#### Network Connectivity Toggle
- **Location**: Global (all pages)
- **Condition**: Monitors network status
- **States**: Online / Offline
- **Action**: Auto-redirects to OfflineEmergency when offline

#### Loading State Toggle
- **Location**: Various pages
- **Condition**: During async operations
- **States**: Loading / Loaded / Error

#### Countdown Toggle (SOS)
- **Location**: Home Page
- **Condition**: When SOS button is pressed
- **States**: Countdown Active / Cancelled / Completed
- **Duration**: 3 seconds

#### Countdown Toggle (Cancel Report)
- **Location**: Home Page (Active Case Banner)
- **Condition**: When Cancel Report button is pressed
- **States**: Countdown Active / Cancelled / Completed
- **Duration**: 5 seconds

---

## POPUP WINDOWS / MODALS

### ChatModal
- **Location**: Home Page, Profile Page (if used)
- **Trigger**: Click FloatingChatHead or Chat Button
- **Content**:
  - Chat Messages List
  - Message Input Field
  - Send Button
  - Close Button
- **Features**: Real-time updates, Auto-scroll

### SOSChatModal
- **Location**: Home Page
- **Trigger**: After SOS report is created
- **Content**:
  - Chat Messages List
  - Message Input Field
  - Send Button
  - Close Button
- **Features**: Auto-opens after SOS, Real-time updates

### Report Details Modal (if implemented)
- **Location**: Notifications Screen
- **Trigger**: Tap on Case History Item
- **Content**:
  - Report Details
  - Media Gallery
  - Open Chat Button
  - Close Button

### Image Picker Modal
- **Location**: Report Page
- **Trigger**: Click Add Image Button
- **Content**:
  - Gallery Option
  - Camera Option (if available)
  - Cancel Button

### Confirmation Modals

#### Cancel Report Confirmation
- **Location**: Home Page
- **Trigger**: Click Cancel Report Button
- **Content**:
  - Confirmation Message
  - Countdown Timer (5 seconds)
  - Confirm Button
  - Cancel Button

#### Logout Confirmation (if implemented)
- **Location**: Profile Page
- **Trigger**: Click Logout Button
- **Content**:
  - Confirmation Message
  - Confirm Button
  - Cancel Button

### Alert Modals

#### Error Alerts
- **Location**: Various pages
- **Trigger**: On errors
- **Content**:
  - Error Message
  - OK Button

#### Success Alerts
- **Location**: Various pages
- **Trigger**: On successful operations
- **Content**:
  - Success Message
  - OK Button

#### Permission Alerts
- **Location**: Various pages
- **Trigger**: When permissions are denied
- **Content**:
  - Permission Request Message
  - Open Settings Button
  - Cancel Button

### Action Sheet Modals

#### Offline SOS Action Sheet
- **Location**: Offline Emergency Screen
- **Trigger**: Click SOS Button
- **Content**:
  - Call 911 Option
  - Message 911 Option
  - Cancel Button

---

## NAVIGATION ELEMENTS

### Custom Tab Bar
- **Location**: Bottom of Home, Report, Profile, Notifications screens
- **Components**:
  - Home Tab Icon + Label
  - Report Tab Icon + Label
  - Profile Tab Icon + Label
  - Notifications Tab Icon + Label
- **Features**: Active state highlighting, Navigation routing

### Stack Navigation
- **Location**: App-wide
- **Screens**:
  - Login Screen
  - Register Screen
  - Splash Screen
  - Home Screen
  - Report Screen
  - Profile Screen
  - Chat Screen
  - Notifications Screen
  - Offline Emergency Screen

---

## ANIMATION ELEMENTS

### SOS Button Animations
- **Type**: Pulsing Animation
- **Location**: Home Page, Offline Emergency Screen
- **Effect**: Continuous pulse/scale animation

### Countdown Animations
- **Type**: Timer Animation
- **Location**: Home Page (SOS countdown, Cancel countdown)
- **Effect**: Visual countdown display

### Loading Animations
- **Type**: Spinner/Activity Indicator
- **Location**: Various pages during data loading
- **Effect**: Rotating spinner

### Drag Animations
- **Type**: Pan Gesture Animation
- **Location**: FloatingChatHead
- **Effect**: Smooth drag with edge snapping

---

## FORM VALIDATION ELEMENTS

### Error Text Components
- **Location**: All input forms
- **Display**: Below input fields
- **Content**: Validation error messages

### Input Field States
- **States**: Default / Focused / Error / Disabled
- **Visual Indicators**: Border color changes, Error icons

---

## REAL-TIME ELEMENTS

### Active Case Status Updates
- **Location**: Home Page
- **Trigger**: Real-time subscription to tbl_reports
- **Update**: Automatic refresh on status changes

### Chat Message Updates
- **Location**: Chat Screen
- **Trigger**: Real-time subscription to tbl_messages
- **Update**: New messages appear instantly

### Notification Updates
- **Location**: Notifications Screen
- **Trigger**: Real-time subscription to tbl_reports
- **Update**: Case list refreshes automatically

---

## STYLING ELEMENTS

### Neumorphic Design Elements
- SOS Button (Home, Offline Emergency)
- Active Case Banner
- Submit Button (when enabled)

### Gradient Elements
- Submit Button (LinearGradient)
- Background gradients (various)

### Blur Effects
- Active Case Banner background (if implemented)
- Modal backgrounds (if implemented)

---

## ICON ELEMENTS

### Ionicons Used
- Home icon
- Report icon
- Profile icon
- Notifications icon
- Chat/Message icon
- SOS/Emergency icon
- Call icon
- SMS icon
- Close icon
- Edit icon
- Delete icon
- Add icon
- Camera icon
- Gallery icon

---

## SUMMARY

### Total Pages: 9
1. Login
2. Register (4 steps)
3. Splash Screen
4. Home
5. Report
6. Profile
7. Chat Screen
8. Notifications
9. Offline Emergency

### Total Sections: 20+
- Register: 4 steps
- Home: 4 main sections
- Report: 6 sections
- Profile: 4 sections
- Chat: 2 sections
- Notifications: 2 sections
- Offline Emergency: 4 sections

### Total Modals/Popups: 8+
- ChatModal
- SOSChatModal
- Image Picker Modal
- Cancel Report Confirmation
- Error Alerts
- Success Alerts
- Permission Alerts
- Offline SOS Action Sheet

### Total Toggles: 6+
- Active Case Banner visibility
- FloatingChatHead visibility
- Submit Button state
- Network connectivity
- Loading states
- Countdown timers

### Total Input Elements: 15+
- Text inputs
- Pickers/Selectors
- TextAreas
- Image pickers

### Total Button Elements: 20+
- Primary buttons
- Secondary buttons
- Action buttons
- Navigation buttons

---

**This document lists all UI components, pages, sections, elements, toggles, and popup windows in the AccessPoint mobile application.**


