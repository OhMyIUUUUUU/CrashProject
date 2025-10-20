
# AccessPoint - Emergency Response Mobile App

A comprehensive React Native (Expo) mobile application featuring authentication, internet connection detection, and optimized performance for emergency response and safety management.

## 📋 Features

### Authentication System
- **Login** - Secure login with email/phone and password
- **Registration** - Complete user registration with:
  - Personal information (name, age, gender)
  - Emergency contact details
  - Address with barangay selection
  - Password protection
- **Session Persistence** - Automatic login using AsyncStorage
- **No External Backend** - All data stored locally

### Internet Connection Detection
- **Real-time Monitoring** - Automatic detection of online/offline status
- **Smart Routing** - Redirects to appropriate screens based on connectivity
- **Offline Mode** - Full emergency features available without internet

### Emergency Features
- **Quick Action Cards** - Fast access to emergency services
- **Emergency Contacts** - Direct call and SMS to emergency services
- **Personal Emergency Contact** - Quick access to saved emergency contact
- **Incident Reporting** - Submit detailed incident reports
- **Offline Emergency** - Make calls and send SMS without internet

### User Experience
- **Beautiful UI** - Modern, clean interface with intuitive navigation
- **Bottom Tab Navigation** - Easy navigation between Home, Report, and Profile
- **Profile Management** - View and manage user information
- **Activity Tracking** - Monitor emergency-related activities

## 🚀 Performance Optimizations

### Implemented Optimizations

1. **React.memo()** - All components are memoized to prevent unnecessary re-renders
2. **useCallback()** - All event handlers and functions are memoized
3. **useMemo()** - Computed values and expensive calculations are cached
4. **Stable References** - No inline objects or arrays in props
5. **Optimized Context** - AuthContext uses memoized values
6. **Modular Components** - Small, focused components for better performance

### Performance Best Practices

```typescript
// ✅ Good - Memoized component
const MyComponent = React.memo(({ data }) => {
  return <View>{data}</View>;
});

// ✅ Good - Memoized callback
const handlePress = useCallback(() => {
  // handle press
}, [dependencies]);

// ✅ Good - Memoized computed value
const filteredData = useMemo(() => {
  return data.filter(item => item.active);
}, [data]);

// ❌ Avoid - Inline objects
<Component style={{ margin: 10 }} /> // Creates new object each render

// ✅ Better - Defined outside or in StyleSheet
<Component style={styles.container} />
```

## 📁 Project Structure

```
app/
├── contexts/
│   └── AuthContext.tsx          # Authentication context and state management
├── utils/
│   ├── storage.ts              # AsyncStorage utilities for data persistence
│   └── validation.ts           # Form validation rules
├── types/
│   └── barangay.d.ts           # TypeScript declarations for barangay package
├── screens/
│   ├── AccessPoint/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── AuthHeader/
│   │   │   ├── InputField/
│   │   │   ├── PrimaryButton/
│   │   │   ├── LoaderOverlay/
│   │   │   └── ErrorText/
│   │   ├── Login/             # Login screen
│   │   └── Register/          # Registration screen
│   ├── Home/
│   │   ├── Home.tsx           # Home dashboard
│   │   ├── Profile.tsx        # User profile
│   │   ├── Report.tsx         # Incident reporting
│   │   └── styles.ts          # Shared styles
│   ├── OfflineEmergency/      # Offline emergency features
│   └── SplashScreen/          # App initialization and routing
├── _layout.tsx                # Root layout with navigation
└── index.tsx                  # Entry point
```

## 🔧 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (optional)

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd AccessPoint
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

# Web
npm run web
```

## 📦 Dependencies

### Core Dependencies
- `expo` - Expo framework
- `react-native` - React Native framework
- `expo-router` - File-based routing
- `@react-native-async-storage/async-storage` - Local data storage
- `@react-native-community/netinfo` - Internet connectivity detection
- `barangay` - Philippine barangay data
- `@react-native-picker/picker` - Native picker component
- `@expo/vector-icons` - Icon library

### Navigation
- `@react-navigation/native` - Navigation library
- `@react-navigation/bottom-tabs` - Bottom tab navigation

## 🔐 Authentication Flow

### Login Process
1. User enters email/phone and password
2. Credentials are verified against local database
3. On success, user data is saved to AsyncStorage
4. User is redirected to Home screen

### Registration Process
1. User fills comprehensive registration form
2. Barangay selection based on region and city
3. Form validation ensures data quality
4. User data is saved to local database
5. Auto-login after successful registration

### Session Management
- Sessions persist across app restarts
- Automatic login on app launch if session exists
- Logout clears session data

## 🌐 Internet Connection Handling

### Online Mode
1. Check authentication status
2. Redirect to Home if logged in
3. Redirect to Login if not logged in

### Offline Mode
1. Display Offline Emergency screen
2. Provide access to emergency calling/SMS
3. Monitor connection status
4. Auto-redirect when connection restored

## 📱 Screens Overview

### SplashScreen
- App initialization
- Internet connectivity check
- Authentication status check
- Smart routing based on status

### Login
- Email/phone and password input
- Form validation
- Error handling
- Link to registration

### Register
- Multi-section form (Personal Info, Emergency Contact, Address, Security)
- Barangay integration with cascading dropdowns
- Real-time validation
- Gender and age selection

### Home
- Welcome card
- Quick action buttons for emergencies
- Recent activity display
- Emergency contact information
- Bottom tab navigation

### Profile
- User information display
- Personal details
- Emergency contact
- Address information
- Logout functionality

### Report
- Incident type selection
- Description input
- Optional location field
- Submit functionality

### Offline Emergency
- Emergency service contacts (911, Police, Fire, Medical)
- Personal emergency contact
- Direct call/SMS functionality
- Tips for offline emergencies
- Connection status monitoring

## 🎨 UI/UX Features

### Design Principles
- **Clean & Modern** - Minimalist design with focus on usability
- **Consistent** - Uniform styling across all screens
- **Accessible** - Clear labels and error messages
- **Responsive** - Optimized for various screen sizes
- **Intuitive** - Easy-to-understand navigation and actions

### Color Scheme
- Primary: `#007AFF` (Blue)
- Success: `#34C759` (Green)
- Warning: `#ff9500` (Orange)
- Danger: `#ff3b30` (Red)
- Background: `#f8f9fa` (Light Gray)

### Typography
- Titles: Bold, 24-36px
- Headers: Semi-bold, 18-20px
- Body: Regular, 14-16px
- Small: Regular, 12px

## 🔒 Data Storage

### AsyncStorage Keys
- `@user_data` - Current user session data
- `@is_logged_in` - Login status flag
- `@users_database` - All registered users

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
}
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Registration with valid data
- [ ] Registration with invalid data (validation)
- [ ] Login with correct credentials
- [ ] Login with incorrect credentials
- [ ] Logout functionality
- [ ] Session persistence (close and reopen app)
- [ ] Internet connection detection
- [ ] Offline mode features
- [ ] Navigation between screens
- [ ] Form validations
- [ ] Emergency call/SMS functionality

## 🚧 Future Enhancements

- [ ] Forgot password functionality
- [ ] Biometric authentication (fingerprint/face ID)
- [ ] Push notifications for emergencies
- [ ] GPS location tracking
- [ ] Real-time emergency alerts
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Backend integration option
- [ ] Emergency history and analytics
- [ ] Community safety features

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

## 📄 License

This project is for educational and demonstration purposes.

## 👨‍💻 Developer Notes

### Code Quality
- All components use TypeScript for type safety
- ESLint configured for code quality
- Consistent code formatting
- Comprehensive error handling
- Meaningful variable and function names

### Performance Monitoring
Use React DevTools Profiler to monitor:
- Component re-render frequency
- Render duration
- Performance bottlenecks

### Debugging
```bash
# View logs
npx expo start --dev-client

# Clear cache
npx expo start -c
```

## 📞 Support

For issues or questions, please create an issue in the repository.

---

**Built with ❤️ using React Native and Expo**
#