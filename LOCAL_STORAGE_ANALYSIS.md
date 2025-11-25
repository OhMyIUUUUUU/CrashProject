# Local Storage Analysis - Login & Register

## Overview
Both Login and Register components use **AsyncStorage** (local storage) to persist user data and sessions. The app has a dual-storage approach: Supabase (cloud) and AsyncStorage (local fallback).

---

## Storage Service (`utils/storage.ts`)

### Storage Keys Used:
- `@user_data` - Current user session data
- `@is_logged_in` - Login status flag
- `@users_database` - Local database of all registered users
- `@emergency_contacts` - Emergency contact information

### Key Functions:
1. **`saveUserSession(userData)`** - Saves current user session
2. **`getUserSession()`** - Retrieves current user session
3. **`isLoggedIn()`** - Checks if user is logged in
4. **`registerUser(userData)`** - Saves new user to local database
5. **`verifyCredentials(emailOrPhone, password)`** - Verifies login credentials from local storage
6. **`clearUserSession()`** - Clears session on logout

---

## Login Component (`app/screens/AccessPoint/components/Login/Login.tsx`)

### Local Storage Usage:

#### 1. **Primary Login Flow (Supabase)**
- Attempts Supabase authentication first
- On success:
  - Fetches user data from `tbl_users` table
  - Converts to `UserData` format
  - **Saves to local storage** via `StorageService.saveUserSession(userDataForStorage)` (Line 118)
  - Updates AuthContext

#### 2. **Fallback Login Flow (Local Storage)**
- If Supabase fails, falls back to local storage
- Uses `StorageService.verifyCredentials(email, password)` (Line 43)
  - Searches `@users_database` for matching credentials
- On match:
  - **Saves session** via `StorageService.saveUserSession(localUser)` (Line 49)
  - Updates AuthContext
  - Navigates to Home

### Code Flow:
```typescript
// Line 74-77: Try Supabase first
const { data: authData, error } = await supabase.auth.signInWithPassword({...});

// Line 118: Save to local storage after Supabase success
await StorageService.saveUserSession(userDataForStorage);

// Line 43-49: Fallback to local storage if Supabase fails
const localUser = await StorageService.verifyCredentials(email, password);
await StorageService.saveUserSession(localUser);
```

---

## Register Component (`app/screens/AccessPoint/components/Register/Register.tsx`)

### Local Storage Usage:

#### 1. **Primary Registration Flow (Supabase)**
- Validates form data
- Checks for duplicate email/phone in Supabase `tbl_users`
- Creates Supabase auth account via `supabase.auth.signUp()` (Line 499)
- Inserts user data into `tbl_users` table (Line 532-549)
- Sends OTP for email verification
- After OTP verification:
  - **Saves to local storage** via `registerUser(userData)` (Line 246)
    - Which calls `StorageService.registerUser()` → saves to `@users_database`
    - Then calls `StorageService.saveUserSession()` → saves to `@user_data`

#### 2. **Fallback Registration Flow (Local Storage Only)**
- Triggered when:
  - Email delivery fails (Line 511)
  - Network errors occur (Line 589)
- Uses `completeLocalRegistration()` function (Line 170-201):
  - Builds `UserData` object
  - **Saves to local storage** via `registerUser(userData)` (Line 174)
    - Calls `StorageService.registerUser()` → saves to `@users_database`
    - Calls `StorageService.saveUserSession()` → saves to `@user_data`
  - Saves emergency contact via `StorageService.addEmergencyContact()` (Line 147)

### Code Flow:
```typescript
// Line 499: Try Supabase registration
const { data: authData, error: authError } = await supabase.auth.signUp({...});

// Line 532-549: Save to Supabase database
await supabase.from('tbl_users').insert({...});

// Line 246: After OTP verification, save to local storage
await registerUser(userData); // Calls StorageService.registerUser() + saveUserSession()

// Line 174: Fallback - save to local storage only
const success = await registerUser(userData); // Local storage fallback
```

---

## AuthContext (`app/contexts/AuthContext.tsx`)

### Local Storage Integration:

#### `register()` function (Line 51-65):
```typescript
const register = async (userData: UserData): Promise<boolean> => {
  const success = await StorageService.registerUser(userData); // Saves to @users_database
  if (success) {
    await StorageService.saveUserSession(userData); // Saves to @user_data
    setUser(userData);
    setIsAuthenticated(true);
    return true;
  }
  return false;
};
```

#### `login()` function (Line 35-49):
```typescript
const login = async (emailOrPhone: string, password: string): Promise<boolean> => {
  const userData = await StorageService.verifyCredentials(emailOrPhone, password); // Reads from @users_database
  if (userData) {
    await StorageService.saveUserSession(userData); // Saves to @user_data
    setUser(userData);
    setIsAuthenticated(true);
    return true;
  }
  return false;
};
```

#### `loadUser()` function (Line 20-33):
```typescript
const loadUser = async () => {
  const isLoggedIn = await StorageService.isLoggedIn(); // Checks @is_logged_in
  if (isLoggedIn) {
    const userData = await StorageService.getUserSession(); // Reads from @user_data
    if (userData) {
      setUser(userData);
      setIsAuthenticated(true);
    }
  }
};
```

---

## Data Flow Summary

### Registration:
1. User fills form → Validates
2. **Primary**: Supabase signup → Database insert → OTP → **Local storage save**
3. **Fallback**: Direct **local storage save** (if Supabase fails)

### Login:
1. User enters credentials
2. **Primary**: Supabase auth → Fetch user data → **Local storage save**
3. **Fallback**: **Local storage lookup** → **Local storage save** (if Supabase fails)

### Session Persistence:
- On app restart: `loadUser()` reads from `@user_data` and `@is_logged_in`
- User stays logged in across app restarts
- Logout clears both keys

---

## Storage Structure

### `@user_data` (Current Session):
```json
{
  "email": "user@example.com",
  "phone": "1234567890",
  "firstName": "John",
  "lastName": "Doe",
  "gender": "Male",
  "birthdate": "1990-01-01",
  "emergencyContactName": "Jane Doe",
  "emergencyContactNumber": "0987654321",
  "region": "Region I",
  "city": "City Name",
  "barangay": "Barangay Name",
  "password": "hashed_password"
}
```

### `@users_database` (All Users Array):
```json
[
  {
    "email": "user1@example.com",
    "phone": "1234567890",
    "firstName": "John",
    "lastName": "Doe",
    ...
  },
  {
    "email": "user2@example.com",
    ...
  }
]
```

### `@is_logged_in`:
```
"true" or null
```

---

## Key Points

✅ **Both Login and Register use local storage**
✅ **Dual storage approach**: Supabase (cloud) + AsyncStorage (local)
✅ **Offline capability**: App works without internet using local storage
✅ **Session persistence**: Users stay logged in across app restarts
✅ **Fallback mechanism**: If Supabase fails, falls back to local storage
✅ **Emergency contacts**: Also saved to local storage separately

---

## Potential Issues

⚠️ **AsyncStorage Native Module Error**: Currently disabled in `supabase.ts` due to native module linking issues. The app uses local storage for user sessions but Supabase auth sessions won't persist until the app is rebuilt.

**Solution**: Rebuild the app with `npx expo run:android` to properly link AsyncStorage native module.



