import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

export interface ActiveReport {
  report_id: string;
  reporter_id: string;
  status: string;
  category: string;
  description: string;
  created_at: string;
}

/**
 * Session Restoration Utility
 * 
 * Checks for active reports on app startup to restore user's session state.
 * An active report is defined as any report with status NOT 'resolved' AND NOT 'cancelled'.
 * 
 * @returns {Promise<ActiveReport | null>} Active report if found, null otherwise
 */
export const checkActiveReport = async (): Promise<ActiveReport | null> => {
  try {
    // Step 1: Verify internet connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('📡 No internet connection - skipping session restoration');
      return null;
    }

    // Step 2: Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.log('🔐 No active session - skipping session restoration');
      return null;
    }

    const authUserId = session.user.id;
    const userEmail = session.user.email;

    // Step 3: Get reporter_id from tbl_users
    let reporterId: string | null = null;

    if (authUserId) {
      const { data: userData, error: userError } = await supabase
        .from('tbl_users')
        .select('user_id')
        .eq('user_id', authUserId)
        .single();

      if (userData && !userError) {
        reporterId = userData.user_id;
      }
    }

    // Fallback: Try by email if user_id lookup failed
    if (!reporterId && userEmail) {
      const { data: userData, error: userError } = await supabase
        .from('tbl_users')
        .select('user_id')
        .eq('email', userEmail)
        .single();

      if (userData && !userError) {
        reporterId = userData.user_id;
      }
    }

    if (!reporterId) {
      console.log('👤 User not found in database - skipping session restoration');
      return null;
    }

    // Step 4: Query tbl_reports for active cases
    // Active = status NOT 'resolved' AND NOT 'cancelled'
    console.log('🔍 Checking for active reports for user:', reporterId);
    
    const { data: reports, error: reportsError } = await supabase
      .from('tbl_reports')
      .select('report_id, reporter_id, status, category, description, created_at')
      .eq('reporter_id', reporterId)
      .order('created_at', { ascending: false });

    if (reportsError) {
      console.error('❌ Error querying reports:', reportsError);
      return null;
    }

    if (!reports || reports.length === 0) {
      console.log('📋 No reports found for user');
      return null;
    }

    // Step 5: Filter for active reports (only 'pending' and 'responding' are active)
    // This matches the logic in useActiveCase hook
    const activeReports = reports.filter(report => {
      const status = report.status?.toLowerCase().trim();
      const isActive = status === 'pending' || status === 'responding';
      
      if (isActive) {
        console.log(`✅ Found active report: ${report.report_id} (status: ${report.status})`);
      }
      
      return isActive;
    });

    // Step 6: Return the most recent active report
    if (activeReports.length > 0) {
      const activeReport = activeReports[0] as ActiveReport;
      console.log(`🎯 Session restoration: Active report found - ${activeReport.report_id}`);
      return activeReport;
    }

    console.log('📋 No active reports found - user can proceed to dashboard');
    return null;

  } catch (error) {
    console.error('❌ Error in session restoration:', error);
    // Fail gracefully - don't block app startup
    return null;
  }
};

/**
 * Check if user has internet connection
 * @returns {Promise<boolean>} True if connected, false otherwise
 */
export const hasInternetConnection = async (): Promise<boolean> => {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected ?? false;
  } catch (error) {
    console.error('Error checking network connection:', error);
    return false;
  }
};


