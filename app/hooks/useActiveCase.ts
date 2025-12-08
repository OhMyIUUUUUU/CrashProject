import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ActiveCase {
  report_id: string;
  reporter_id: string;
  assigned_office_id: string | null;
  category: string;
  description: string;
  status: string;
  latitude: number;
  longitude: number;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  office_name?: string;
  office_id?: string | null;
}

export const useActiveCase = () => {
  const [activeCase, setActiveCase] = useState<ActiveCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<ActiveCase[]>([]);

  const checkActiveCase = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id || null;
      const userEmail = session?.user?.email || null;

      if (!authUserId && !userEmail) {
        setActiveCase(null);
        setLoading(false);
        return;
      }

      // Get user_id from tbl_users
      let reporterId = null;
      if (authUserId) {
        const { data: userData } = await supabase
          .from('tbl_users')
          .select('user_id')
          .eq('user_id', authUserId)
          .single();
        if (userData) reporterId = userData.user_id;
      }

      if (!reporterId && userEmail) {
        const { data: userData } = await supabase
          .from('tbl_users')
          .select('user_id')
          .eq('email', userEmail)
          .single();
        if (userData) reporterId = userData.user_id;
      }

      if (!reporterId) {
        setActiveCase(null);
        setLoading(false);
        return;
      }

      // Check for active cases from tbl_reports
      // Only show pending and responding cases (resolved/closed cases go to notifications)
      const { data: reports, error } = await supabase
        .from('tbl_reports')
        .select(`
          report_id,
          reporter_id,
          assigned_office_id,
          category,
          description,
          status,
          latitude,
          longitude,
          remarks,
          created_at,
          updated_at
        `)
        .eq('reporter_id', reporterId)
        .order('created_at', { ascending: false });

      // Filter for active cases (exclude cancelled, resolved, and closed cases)
      const activeReports = reports?.filter(report => {
        const status = report.status?.toLowerCase().trim();
        return status === 'pending' || status === 'responding';
      }) || [];

      if (error) {
        console.error('[useActiveCase] Error checking active case:', error.message || error);
        setActiveCase(null);
      } else if (activeReports && activeReports.length > 0) {
        const report = activeReports[0];
        // Use assigned_office_id as office_id
        setActiveCase({
          ...report,
          office_id: report.assigned_office_id,
        } as ActiveCase);
      } else {
        setActiveCase(null);
      }
    } catch (error: any) {
      console.error('[useActiveCase] Error in checkActiveCase:', error.message || error);
      setActiveCase(null);
    } finally {
      setLoading(false);
    }
  };

  const checkNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id || null;
      const userEmail = session?.user?.email || null;

      if (!authUserId && !userEmail) {
        setNotifications([]);
        return;
      }

      // Get user_id from tbl_users
      let reporterId = null;
      if (authUserId) {
        const { data: userData } = await supabase
          .from('tbl_users')
          .select('user_id')
          .eq('user_id', authUserId)
          .single();
        if (userData) reporterId = userData.user_id;
      }

      if (!reporterId && userEmail) {
        const { data: userData } = await supabase
          .from('tbl_users')
          .select('user_id')
          .eq('email', userEmail)
          .single();
        if (userData) reporterId = userData.user_id;
      }

      if (!reporterId) {
        setNotifications([]);
        return;
      }

      // Fetch cases for notifications: pending, assigned, investigating, resolved, closed, and cancelled
      const { data: reports, error } = await supabase
        .from('tbl_reports')
        .select(`
          report_id,
          reporter_id,
          assigned_office_id,
          category,
          description,
          status,
          latitude,
          longitude,
          remarks,
          created_at,
          updated_at
        `)
        .eq('reporter_id', reporterId)
        .in('status', ['pending', 'assigned', 'investigating', 'resolved', 'closed'])
        .order('updated_at', { ascending: false })
        .limit(20); // Get last 20 cases for notifications

      if (error) {
        console.error('[useActiveCase] Error fetching notifications:', error.message || error);
        setNotifications([]);
      } else {
        // Use assigned_office_id as office_id for each notification
        const notificationsWithOffice = (reports || []).map((report) => ({
          ...report,
          office_id: report.assigned_office_id,
        } as ActiveCase));
        setNotifications(notificationsWithOffice);
      }
    } catch (error: any) {
      console.error('[useActiveCase] Error in checkNotifications:', error.message || error);
      setNotifications([]);
    }
  };

  useEffect(() => {
    checkActiveCase();
    checkNotifications();
    
    // Set up real-time subscription for report updates
    const channel = supabase
      .channel('active-case-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tbl_reports',
        },
        (payload) => {
          // Always refresh both active case and notifications when status changes
          // This ensures resolved/closed cases disappear from active case and appear in notifications
          setTimeout(() => {
            checkActiveCase();
            checkNotifications();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cancelReport = async (reportId: string, currentCase?: ActiveCase | null) => {
    try {
      // First, get all media files associated with this report before deleting
      const { data: mediaFiles, error: mediaFetchError } = await supabase
        .from('tbl_media')
        .select('file_url')
        .eq('report_id', reportId);

      if (!mediaFetchError && mediaFiles && mediaFiles.length > 0) {
        // Extract file paths from URLs and delete from storage
        const bucketName = 'crash-media';
        const deletePromises = mediaFiles.map(async (media) => {
          try {
            // Extract file path from URL
            const urlParts = media.file_url.split('/');
            const pathIndex = urlParts.findIndex(part => part === bucketName);
            if (pathIndex !== -1 && pathIndex < urlParts.length - 1) {
              const filePath = urlParts.slice(pathIndex + 1).join('/');
              
              const { error: deleteError } = await supabase.storage
                .from(bucketName)
                .remove([filePath]);

              if (deleteError) {
                console.error('[useActiveCase] Error deleting file:', deleteError.message || deleteError);
              }
            }
          } catch (error: any) {
            console.error('[useActiveCase] Error processing file deletion:', error.message || error);
          }
        });

        await Promise.all(deletePromises);
      }

      // Delete associated messages first (if any)
      const { error: messagesError } = await supabase
        .from('tbl_messages')
        .delete()
        .eq('report_id', reportId);
      
      if (messagesError) {
        console.warn('[useActiveCase] Error deleting messages:', messagesError.message || messagesError);
      }
      
      // Delete the report from database
      const { error } = await supabase
        .from('tbl_reports')
        .delete()
        .eq('report_id', reportId);

      if (error) {
        console.error('[useActiveCase] Error deleting report:', error.message || error);
        return false;
      }
      
      await checkActiveCase();
      return true;
    } catch (error: any) {
      console.error('[useActiveCase] Error cancelling report:', error.message || error);
      return false;
    }
  };

  return { activeCase, loading, checkActiveCase, cancelReport, notifications, checkNotifications };
};

