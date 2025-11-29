import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from './contexts/AuthContext'
import { supabase } from './lib/supabase'
import { StorageService } from '../utils/storage'

export default function Index() {
  const router = useRouter()
  const { loadUser } = useAuth()

  useEffect(() => {
    const initializeAuth = async () => {
      await loadUser()

      const [hasLocalSession, { data: { session } }] = await Promise.all([
        StorageService.isLoggedIn(),
        supabase.auth.getSession(),
      ])

      if (session || hasLocalSession) {
        router.replace('/screens/Home/Home')
      } else {
        router.replace('/screens/AccessPoint/components/Login/Login')
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      await loadUser()
      const hasLocalSession = await StorageService.isLoggedIn()

      if (session || hasLocalSession) {
        router.replace('/screens/Home/Home')
      } else {
        router.replace('/screens/AccessPoint/components/Login/Login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, loadUser])

  // Show loading while checking auth
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FF6B6B" />
    </View>
  )
}