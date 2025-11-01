# AccessPoint - Emergency Response Mobile App

A modern React Native (Expo) mobile application designed for emergency response and safety management. Built with a focus on offline functionality, intuitive design, and comprehensive emergency features.

## 📋 Features

### 🔐 Authentication System
- **Secure Login** - Email/phone and password authentication
- **Complete Registration** - Multi-step registration process:
  - Personal information (name, email, phone, age, gender)
  - Emergency contact details
  - Address with Philippine barangay selection (region → city → barangay)
  - Password protection with validation
- **Session Persistence** - Automatic login using AsyncStorage
- **Local Storage** - All data stored securely on device (no external backend required)

### 🌐 Connection Management
- **Real-time Monitoring** - Automatic detection of online/offline status
- **Smart Routing** - Intelligent screen redirection based on connectivity
- **Offline Mode** - Full emergency functionality without internet connection
- **Auto-reconnect** - Seamless transition when connection is restored

### 🚨 Emergency Features
- **SOS Button** - Quick access emergency dialer (911)
- **Emergency Contacts** - Manage and quickly contact multiple emergency contacts
- **Direct Call/SMS** - One-tap calling and messaging for emergencies
- **Incident Reporting** - Comprehensive incident reporting with:
  - Multiple report types (Emergency, Medical, Fire, Crime, Accident, Other)
  - Reporter role selection (Witness/Victim)
  - Detailed description field
  - Location input with auto-fill capability
  - Image and video attachments
- **Offline Emergency Screen** - Access to emergency services without internet

### 📱 User Experience
- **Modern UI** - Clean, minimalist design with light red theme (#ff6b6b)
- **Responsive Design** - Optimized for all screen sizes (small, medium, large)
- **Bottom Tab Navigation** - Easy navigation between Home, Report, and Profile
- **Profile Management** - View and manage user information with profile picture support
- **Smooth Animations** - Polished interactions and transitions

## 🎨 Design & Theme

### Color Scheme
- **Primary Theme**: `#ff6b6b` (Light Red)
- **Success**: `#34C759` (Green)
- **Danger**: `#ff3b30` (Red)
- **Warning**: `#ff3b30` (Red)
- **Background**: `#fff` (White)
- **Text Primary**: `#1a1a1a` (Dark Gray)
- **Text Secondary**: `#666` (Medium Gray)

### Design Principles
- **Clean & Modern** - Minimalist design focused on usability
- **Consistent** - Uniform styling across all screens
- **Accessible** - Clear labels, error messages, and intuitive navigation
- **Responsive** - Optimized for various screen sizes and orientations
- **User-Friendly** - Easy-to-understand interface for emergency situations

## 🚀 Performance Optimizations

### Implemented Optimizations
1. **React.memo()** - All components are memoized to prevent unnecessary re-renders
2. **useCallback()** - All event handlers and functions are memoized
3. **useMemo()** - Computed values and expensive calculations are cached
4. **Stable References** - No inline objects or arrays in props
5. **Optimized Context** - AuthContext uses memoized values
6. **Modular Components** - Small, focused components for better performance

## 📁 Project Structure

```
app/
├── contexts/
│   └── AuthContext.tsx          # Authentication context and state management
├── utils/
│   ├── storage.ts              # AsyncStorage utilities for data persistence
│   └── validation.ts           # Form validation rules
├── features/
│   └── [feature modules]       # Feature-specific code
├── screens/
│   ├── AccessPoint/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── AuthHeader/
│   │   │   ├── InputField/
│   │   │   ├── PrimaryButton/
│   │   │   ├── LoaderOverlay/
│   │   │   ├── ErrorText/
│   │   │   ├── SearchablePicker/
│   │   │   └── [other components]
│   │   ├── Login/             # Login screen
│   │   └── Register/          # Registration screen
│   ├── Home/
│   │   ├── Home.tsx           # Home dashboard with SOS button
│   │   ├── Profile.tsx        # User profile with photo support
│   │   ├── Report.tsx         # Incident reporting with attachments
│   │   └── styles.ts          # Shared styles
│   ├── OfflineEmergency/      # Offline emergency features
│   └── SplashScreen/          # App initialization and routing
├── _layout.tsx                # Root layout with navigation
└── index.tsx                  # Entry point
```

## 🔧 Installation

### Prerequisites
- Node.js (v16 or higher recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator (optional)
- Expo Go app (for physical device testing)

### Setup Instructions

1. **Clone the repository**
```bash
git clone <repository-url>
cd CrashProject
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm start
```

4. **Run on a device/emulator**
```bash
# iOS
npm run ios

# Android
npm run android

# Web (limited functionality)
npm run web
```

5. **For physical device testing**
   - Install Expo Go from App Store (iOS) or Google Play (Android)
   - Scan QR code from terminal
   - App will load on your device

## 📦 Key Dependencies

### Core
- `expo` (~54.0.13) - Expo framework
- `react-native` (0.81.4) - React Native framework
- `expo-router` (~6.0.11) - File-based routing
- `react` (19.1.0) - React library

### Storage & State
- `@react-native-async-storage/async-storage` - Local data persistence
- `@react-native-community/netinfo` - Internet connectivity detection

### UI & Navigation
- `@expo/vector-icons` - Icon library (Ionicons)
- `@react-navigation/native` - Navigation library
- `@react-navigation/bottom-tabs` - Bottom tab navigation
- `expo-image-picker` - Image and video selection

### Utilities
- `barangay` - Philippine barangay data
- `expo-location` - Location services
- `expo-image-picker` - Media file selection

## 📱 Screens Overview

### 🎬 SplashScreen
- App initialization and loading
- Internet connectivity check
- Authentication status verification
- Smart routing based on connection and auth status
- Automatic redirection to appropriate screen

### 🔑 Login
- Email/phone and password authentication
- Real-time form validation
- Comprehensive error handling
- Link to registration screen
- Network connectivity monitoring

### 📝 Register
- **Personal Information**
  - Email and phone number
  - First and last name
  - Gender selection
  - Age input
- **Emergency Contact**
  - Emergency contact name and number
- **Address Information**
  - Cascading dropdowns: Region → City → Barangay
  - Real-time filtering based on selections
- **Security**
  - Password creation with validation
  - Password confirmation
- Auto-login after successful registration

### 🏠 Home
- **Welcome Card** - Personalized greeting with theme color
- **SOS Button** - Large, prominent emergency button (press to call 911)
- **Emergency Contacts Section**
  - Add, view, and manage emergency contacts
  - Quick call and SMS buttons for each contact
  - Delete functionality
- **Bottom Tab Navigation**
  - Home (current)
  - Report
  - Profile

### 👤 Profile
- **Profile Header**
  - Avatar with initials or profile picture
  - Full name and email display
  - Profile picture upload capability
- **Personal Information Card**
  - Email, phone, gender, age
- **Emergency Contact Card**
  - Contact name and number
- **Address Information Card**
  - Region, city, barangay
- **Logout Button** - With confirmation dialog

### 📋 Report
- **Report Type Selection**
  - Six incident types with icons and colors:
    - Emergency (Red)
    - Medical (Green)
    - Fire (Light Red - theme color)
    - Crime (Purple)
    - Accident (Pink)
    - Other (Gray)
  - Visual selection with checkmark
- **Reporter Role Selection**
  - Witness or Victim toggle buttons
  - Clear active/inactive states
- **Description Field**
  - Multi-line text input
  - Detailed incident description
- **Location Field**
  - Text input with auto-fill capability
  - GPS location integration
- **Attachments**
  - Image and video support
  - Multiple file selection
  - Thumbnail preview
  - Remove functionality
- **Submit Button** - Form validation before submission

### 📴 Offline Emergency
- **Connection Status Indicator** - Clear offline mode notification
- **Notice Card** - Information about offline capabilities
- **SOS Button** - Emergency dialer access
- **Emergency Contact Card** (if available)
  - Personal emergency contact information
  - Call and SMS buttons
- **Emergency Tips** - Helpful guidance for emergency situations
- **Auto-redirect** - Returns to home when connection restored

## 🔒 Data Storage

### AsyncStorage Keys
- `@user_data` - Current user session data
- `@is_logged_in` - Login status flag
- `@users_database` - All registered users
- `@emergency_contacts` - User's emergency contacts list

### Data Structure
```typescript
interface UserData {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  gender: string;
  age: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  region: string;
  city: string;
  barangay: string;
  password: string;
  profilePicture?: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  number: string;
}

interface Attachment {
  uri: string;
  type: 'image' | 'video';
}
```

## 🎯 Key Features

### Incident Reporting
- **Multiple Report Types** - Categorized incident types for better organization
- **Reporter Role** - Specify if you're a witness or victim
- **Rich Attachments** - Support for both images and videos
- **Location Integration** - Auto-fill location using GPS
- **Comprehensive Forms** - All necessary fields for complete reporting

### Emergency Management
- **Multiple Emergency Contacts** - Add and manage multiple contacts
- **Quick Actions** - One-tap calling and messaging
- **SOS Button** - Always-accessible emergency dialer
- **Offline Functionality** - Full emergency features without internet

### User Experience
- **Profile Pictures** - Upload and manage profile photos
- **Smooth Animations** - Polished interactions throughout
- **Responsive Layout** - Adapts to different screen sizes
- **Error Handling** - Clear error messages and validation

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration with all fields
- [ ] Form validation (email, phone, password)
- [ ] Login with correct/incorrect credentials
- [ ] Session persistence (close and reopen app)
- [ ] Internet connection detection
- [ ] Offline mode functionality
- [ ] Report submission with all fields
- [ ] Image/video attachment selection
- [ ] Emergency contact management
- [ ] Profile picture upload
- [ ] Navigation between screens
- [ ] SOS button functionality
- [ ] Emergency call/SMS features

## 🚧 Future Enhancements

### Planned Features
- [ ] Forgot password functionality
- [ ] Biometric authentication (fingerprint/face ID)
- [ ] Push notifications for emergency alerts
- [ ] Real-time location sharing during emergencies
- [ ] Emergency history and report tracking
- [ ] Multi-language support (Filipino/English)
- [ ] Dark mode theme option
- [ ] Backend integration option
- [ ] Community safety features
- [ ] Emergency alert broadcasting
- [ ] Integration with emergency services

## 🔧 Development

### Code Quality Standards
- TypeScript for type safety
- ESLint configuration for code quality
- Consistent code formatting
- Comprehensive error handling
- Meaningful variable and function names
- Component memoization for performance
- Proper React hooks usage

### Debugging
```bash
# View logs with development client
npx expo start --dev-client

# Clear cache and restart
npx expo start -c

# Run linting
npm run lint
```

### Performance Monitoring
- Use React DevTools Profiler to monitor:
  - Component re-render frequency
  - Render duration
  - Performance bottlenecks
- Check AsyncStorage usage
- Monitor network requests

## 📞 Support & Contributing

### Getting Help
For issues or questions:
1. Check existing issues in the repository
2. Create a new issue with detailed description
3. Include device/platform information
4. Provide steps to reproduce

### Contributing
This is a personal project, but suggestions and improvements are welcome! When contributing:
- Follow existing code style
- Add comments for complex logic
- Test on both iOS and Android
- Update documentation as needed

## 📄 License

This project is for educational and demonstration purposes.

## 👨‍💻 Developer Notes

### Architecture Decisions
- **Local Storage Only** - No backend required for core functionality
- **Expo Managed Workflow** - Simplified development and deployment
- **File-based Routing** - Using Expo Router for navigation
- **Context API** - For global state management (AuthContext)
- **TypeScript** - For type safety and better developer experience

### Known Limitations
- No cloud backup (data stored locally only)
- No real-time sync between devices
- Limited offline map functionality
- No backend integration (can be added)

---

**Built with ❤️ using React Native and Expo**

**Version:** 1.0.0  
**Last Updated:** 2024
