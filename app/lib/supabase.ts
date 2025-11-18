import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phawtlidroatfpzboxhi.supabase.co'
const supabasePublishableKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoYXd0bGlkcm9hdGZwemJveGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMTAzNDcsImV4cCI6MjA3ODg4NjM0N30.DXnEZatmlNLBh2YVnKGMyw4s5r34lhkFWioZupRQNAQ'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})