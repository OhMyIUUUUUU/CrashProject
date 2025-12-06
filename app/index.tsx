import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from './contexts/AuthContext'
import { supabase } from './lib/supabase'
import { checkActiveReport, hasInternetConnection } from './utils/sessionRestoration'

/**
 * Navigation helper that checks for active reports and routes accordingly
 * - If active report exists: Navigate to Report screen (Active Report Mode)
 * - If no active report: Navigate to Home/Dashboard
 */
const navigateAfterSessionCheck = async (router: any) => {
  try {
    // Small delay to ensure session is fully established
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check internet connection first
    const isConnected = await hasInternetConnection();
    
    if (!isConnected) {
      // No internet - go to dashboard (will handle offline mode there)
      console.log('📡 No internet - navigating to Home');
      router.replace('/screens/Home/Home');
      return;
    }

    // Verify session is still valid before checking reports
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('🔐 No session found - navigating to Login');
      router.replace('/screens/AccessPoint/components/Login/Login');
      return;
    }

    // Check for active report
    console.log('🔍 Checking for active reports...');
    const activeReport = await checkActiveReport();
    
    if (activeReport) {
      // Active report found - navigate to Report screen (Active Report Mode)
      console.log(`🎯 Session restored: Navigating to Report screen for active case ${activeReport.report_id} (status: ${activeReport.status})`);
      router.replace('/screens/Home/Report');
    } else {
      // No active report - navigate to Home/Dashboard
      console.log('🏠 No active report - navigating to Home/Dashboard');
      router.replace('/screens/Home/Home');
    }
  } catch (error) {
    console.error('❌ Error in session restoration navigation:', error);
    // Fallback to Home on error
    router.replace('/screens/Home/Home');
  }
};

export default function Index() {
  const router = useRouter()
  const { loadUser } = useAuth()

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await loadUser()

        // Check Supabase session only - no local storage
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && !error) {
          // User is logged in - check for active report and navigate accordingly
          await navigateAfterSessionCheck(router);
        } else {
          router.replace('/screens/AccessPoint/components/Login/Login')
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // On error, check Supabase session
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // User is logged in - check for active report and navigate accordingly
            await navigateAfterSessionCheck(router);
          } else {
            router.replace('/screens/AccessPoint/components/Login/Login')
          }
        } catch (fallbackError) {
          // Last resort - go to login
          router.replace('/screens/AccessPoint/components/Login/Login')
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      try {
        await loadUser()

        if (session) {
          // User logged in - check for active report and navigate accordingly
          await navigateAfterSessionCheck(router);
        } else {
          router.replace('/screens/AccessPoint/components/Login/Login')
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
        // Check Supabase session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          // User is logged in - check for active report and navigate accordingly
          await navigateAfterSessionCheck(router);
        } else {
          router.replace('/screens/AccessPoint/components/Login/Login')
        }
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