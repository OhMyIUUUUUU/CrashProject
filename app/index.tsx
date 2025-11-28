import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, PermissionsAndroid, Platform, View } from 'react-native'
import { StorageService } from '../utils/storage'
import { useAuth } from './contexts/AuthContext'
import { supabase } from './lib/supabase'
import { initializeNotifications } from './screens/AccessPoint/components/Notifications/notificationService'

async function requestNotificationPermissions() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      )
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        if (__DEV__) {
          console.log('✅ Notification permission granted')
        }
        return true
      } else {
        if (__DEV__) {
          console.log('⚠️ Notification permission denied')
        }
        return false
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error requesting notification permission:', error)
      }
      return false
    }
  }
  // For Android < 33, permissions are granted by default
  // For iOS, handled by initializeNotifications
  return true
}

export default function Index() {
  const router = useRouter()
  const { loadUser } = useAuth()

  useEffect(() => {
    const initializeAuth = async () => {
      // Request Android notification permission FIRST (for Android 13+)
      try {
        await requestNotificationPermissions()
      } catch (error) {
        if (__DEV__) {
          console.error('Error requesting Android notification permission:', error)
        }
      }

      // Request notification permission and initialize notifications
      // This will show the system permission dialog if not already granted
      try {
        if (__DEV__) {
          console.log('Initializing notifications...')
        }
        await initializeNotifications()
      } catch (error) {
        if (__DEV__) {
          console.error('Error initializing notifications:', error)
        }
      }

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