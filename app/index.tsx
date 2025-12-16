import notifee from '@notifee/react-native'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
// ✅ FIXED: Changed '..' to '.' to look inside the app folder
import { useAuth } from './contexts/AuthContext'
import { supabase } from './lib/supabase'
import { checkActiveReport, hasInternetConnection } from './utils/sessionRestoration'

// Register the foreground service
notifee.registerForegroundService((notification) => {
  return new Promise(() => {
    // The service continues to run until you specifically stop it.
  });
});

// Register background event handler
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (type === 1) { // EventType.PRESS
    if (pressAction?.id === 'default') {
      console.log('Notification pressed - opening app');
    }
  }
});

/**
 * Navigation helper that checks for active reports and routes accordingly
 */
const navigateAfterSessionCheck = async (router: any) => {
  try {
    // Small delay to ensure session is fully established
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check internet connection first
    const isConnected = await hasInternetConnection();
    
    if (!isConnected) {
      console.log('📡 No internet - navigating to Home');
      router.replace('/screens/Home');
      return;
    }

    // Verify session is still valid before checking reports
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('🔐 No session found - navigating to Login');
      router.replace('/components/Login/Login');
      return;
    }

    // Check for active report
    console.log('🔍 Checking for active reports...');
    const activeReport = await checkActiveReport();
    
    if (activeReport) {
      console.log(`🎯 Session restored: Navigating to Report screen for active case ${activeReport.report_id}`);
      router.replace('/screens/Report');
    } else {
      console.log('🏠 No active report - navigating to Home/Dashboard');
      router.replace('/screens/Home');
    }
  } catch (error) {
    console.error('❌ Error in session restoration navigation:', error);
    // Fallback to Home on error
    router.replace('/screens/Home');
  }
};

export default function Index() {
  const router = useRouter()
  const { loadUser } = useAuth()

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await loadUser()

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && !error) {
          await navigateAfterSessionCheck(router);
        } else {
          router.replace('/components/Login/Login')
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Fallback logic
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await navigateAfterSessionCheck(router);
          } else {
            router.replace('/components/Login/Login')
          }
        } catch (fallbackError) {
          router.replace('/components/Login/Login')
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session) {
          await loadUser()
          await navigateAfterSessionCheck(router);
        } else {
          // If we are signed out, go to login
          router.replace('/components/Login/Login')
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
      }
    })

    return () => subscription.unsubscribe()
  }, [router, loadUser])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FF6B6B" />
    </View>
  )
}