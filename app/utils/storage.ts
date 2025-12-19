import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserData {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthdate: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  region: string;
  city: string;
  barangay: string;
  password: string;
  profilePicture?: string;
  user_id?: string; // Add optional IDs for compatibility
  id?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  number: string;
}

const STORAGE_KEYS = {
  USER_DATA: '@user_data',
  IS_LOGGED_IN: '@is_logged_in',
  USERS_DB: '@users_database',
  EMERGENCY_CONTACTS: '@emergency_contacts',
};

export const StorageService = {
  // Save current user session
  saveUserSession: async (userData: UserData): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      await AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
    } catch (error) {
      console.error('Error saving user session:', error);
      throw error;
    }
  },

  // Get current user session
  getUserSession: async (): Promise<UserData | null> => {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user session:', error);
      return null;
    }
  },

  // Check if user is logged in
  isLoggedIn: async (): Promise<boolean> => {
    try {
      const isLoggedIn = await AsyncStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
      return isLoggedIn === 'true';
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  },

  // Clear user session (logout)
  clearUserSession: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
    } catch (error) {
      console.error('Error clearing user session:', error);
      throw error;
    }
  },

  // Save new user to database
  registerUser: async (userData: UserData): Promise<boolean> => {
    try {
      const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: UserData[] = usersJson ? JSON.parse(usersJson) : [];

      // Check if user already exists
      const existingUser = users.find(
        (u) => u.email === userData.email || u.phone === userData.phone
      );

      if (existingUser) {
        return false; // User already exists
      }

      users.push(userData);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
      return true;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },

  // Verify login credentials
  verifyCredentials: async (emailOrPhone: string, password: string): Promise<UserData | null> => {
    try {
      const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: UserData[] = usersJson ? JSON.parse(usersJson) : [];

      const user = users.find(
        (u) => (u.email === emailOrPhone || u.phone === emailOrPhone) && u.password === password
      );

      return user || null;
    } catch (error) {
      console.error('Error verifying credentials:', error);
      return null;
    }
  },

  // Update user profile
  updateUserProfile: async (updatedUserData: UserData): Promise<boolean> => {
    try {
      // Update in users database
      const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: UserData[] = usersJson ? JSON.parse(usersJson) : [];

      const userIndex = users.findIndex(
        (u) => u.email === updatedUserData.email
      );

      if (userIndex !== -1) {
        users[userIndex] = updatedUserData;
        await AsyncStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
      }

      // Update current session
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));

      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  },

  // Emergency Contacts Management
  saveEmergencyContacts: async (contacts: EmergencyContact[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACTS, JSON.stringify(contacts));
    } catch (error) {
      console.error('Error saving emergency contacts:', error);
      throw error;
    }
  },

  getEmergencyContacts: async (): Promise<EmergencyContact[]> => {
    try {
      const contactsJson = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS);
      return contactsJson ? JSON.parse(contactsJson) : [];
    } catch (error) {
      console.error('Error getting emergency contacts:', error);
      return [];
    }
  },

  addEmergencyContact: async (contact: EmergencyContact): Promise<void> => {
    try {
      const existingContacts = await StorageService.getEmergencyContacts();
      const updatedContacts = [...existingContacts, contact];
      await StorageService.saveEmergencyContacts(updatedContacts);
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      throw error;
    }
  },

  deleteEmergencyContact: async (contactId: string): Promise<void> => {
    try {
      const existingContacts = await StorageService.getEmergencyContacts();
      const updatedContacts = existingContacts.filter(contact => contact.id !== contactId);
      await StorageService.saveEmergencyContacts(updatedContacts);
    } catch (error) {
      console.error('Error deleting emergency contact:', error);
      throw error;
    }
  },
};

