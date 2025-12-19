import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('Supabase credentials missing in environment variables. Check .env file.');
}

// Create a storage adapter that uses AsyncStorage but handles errors gracefully
// We'll use a factory function that loads AsyncStorage only when actually needed
const createStorageAdapter = () => {
  let AsyncStorage: any = null;
  let loadAttempted = false;

  const loadAsyncStorage = () => {
    if (loadAttempted && AsyncStorage) {
      return AsyncStorage;
    }
    if (loadAttempted) {
      return null; // Already tried and failed
    }
    loadAttempted = true;

    // Don't try on web
    if (Platform.OS === 'web') {
      return null;
    }

    // Try to load AsyncStorage using a safe method
    try {
      // @ts-ignore - We're dynamically requiring this
      const module = require('@react-native-async-storage/async-storage');
      AsyncStorage = module?.default || module;
      return AsyncStorage;
    } catch (e) {
      console.warn('AsyncStorage not available, session persistence disabled:', e);
      AsyncStorage = null;
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

// Use the storage adapter to enable session persistence across app restarts
// This allows users to stay logged in even after restarting the app or phone
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: createStorageAdapter(), // Use AsyncStorage adapter for session persistence
    autoRefreshToken: true,
    persistSession: true, // Enable session persistence - users stay logged in across restarts
    detectSessionInUrl: false,
  },
})