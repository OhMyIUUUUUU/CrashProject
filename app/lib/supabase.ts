import { createClient } from '@supabase/supabase-js'

// Lazy load AsyncStorage to handle cases where native module isn't available
let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (error) {
  console.warn('AsyncStorage not available:', error);
}

const supabaseUrl = 'https://phawtlidroatfpzboxhi.supabase.co'
const supabasePublishableKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoYXd0bGlkcm9hdGZwemJveGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMTAzNDcsImV4cCI6MjA3ODg4NjM0N30.DXnEZatmlNLBh2YVnKGMyw4s5r34lhkFWioZupRQNAQ'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage || undefined,
    autoRefreshToken: true,
    persistSession: !!AsyncStorage,
    detectSessionInUrl: false,
  },
})