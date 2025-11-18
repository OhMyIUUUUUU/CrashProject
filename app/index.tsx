import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { supabase } from './lib/supabase'
import { useAuth } from './contexts/AuthContext'

export default function Index() {
  const router = useRouter()
  const { loadUser, isAuthenticated } = useAuth()

  useEffect(() => {
    const initializeAuth = async () => {
      // Load user from local storage
      await loadUser()

      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession()

      // Navigate based on auth status
      if (session && isAuthenticated) {
        // User is logged in - navigate to Home
        router.replace('/screens/Home/Home')
      } else {
        // User is not logged in - navigate to Login
        router.replace('/screens/AccessPoint/Login/Login')
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      await loadUser()
      
      if (session && isAuthenticated) {
        router.replace('/screens/Home/Home')
      } else {
        router.replace('/screens/AccessPoint/Login/Login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, isAuthenticated, loadUser])

  // Show loading while checking auth
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FF6B6B" />
    </View>
  )
}