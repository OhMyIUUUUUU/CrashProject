import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

const supabaseUrl = 'https://phawtlidroatfpzboxhi.supabase.co'
const supabasePublishableKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoYXd0bGlkcm9hdGZwemJveGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMTAzNDcsImV4cCI6MjA3ODg4NjM0N30.DXnEZatmlNLBh2YVnKGMyw4s5r34lhkFWioZupRQNAQ'

// Create a storage adapter that uses AsyncStorage but handles errors gracefully
// We'll use a factory function that loads AsyncStorage only when actually needed
const createStorageAdapter = () => {
  let AsyncStorage: any = null;
  let loadAttempted = false;

  const loadAsyncStorage = () => {
    if (loadAttempted) {
      return AsyncStorage;
    }
    loadAttempted = true;

    // Don't try on web
    if (Platform.OS === 'web') {
      return null;
    }

    // Try to load AsyncStorage using a safe method
    // We'll use a function that delays the require
    try {
      // Create a function that will be called later, not during module init
      const loadModule = () => {
        try {
          // @ts-ignore - We're dynamically requiring this
          const module = require('@react-native-async-storage/async-storage');
          return module?.default || module;
        } catch (e) {
          return null;
        }
      };

      // Only call it when storage methods are actually used
      // For now, we'll set it to the loader function
      AsyncStorage = loadModule;
      return AsyncStorage;
    } catch {
      return null;
    }
  };

  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        const storage = loadAsyncStorage();
        if (!storage || typeof storage !== 'object' || typeof storage.getItem !== 'function') {
          return null;
        }
        return await storage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        const storage = loadAsyncStorage();
        if (!storage || typeof storage !== 'object' || typeof storage.setItem !== 'function') {
          return;
        }
        await storage.setItem(key, value);
      } catch {
        // Silently fail
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        const storage = loadAsyncStorage();
        if (!storage || typeof storage !== 'object' || typeof storage.removeItem !== 'function') {
          return;
        }
        await storage.removeItem(key);
      } catch {
        // Silently fail
      }
    },
  };
};

// For now, don't use AsyncStorage at all to avoid the initialization error
// The app can still work, sessions just won't persist across restarts
// Users can rebuild the app to properly link AsyncStorage
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // Don't provide storage adapter to avoid AsyncStorage errors
    // This means sessions won't persist, but the app will work
    storage: undefined,
    autoRefreshToken: true,
    persistSession: false, // Disable session persistence to avoid AsyncStorage issues
    detectSessionInUrl: false,
  },
})