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
      // Fetch all reports first, then filter for active statuses
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

      console.log('📊 Total reports found:', reports?.length || 0);
      console.log('📊 All reports:', reports?.map(r => ({ id: r.report_id, status: r.status })));

      // Filter for active cases (exclude cancelled, resolved, and closed cases)
      const activeReports = reports?.filter(report => {
        const status = report.status?.toLowerCase();
        // Only show pending and responding cases (exclude cancelled, resolved, and closed)
        const isActive = status === 'pending' || status === 'responding';
        console.log(`📊 Report ${report.report_id}: status="${status}", isActive=${isActive}`);
        return isActive;
      }) || [];

      console.log('📊 Active reports after filter:', activeReports.length);

      if (error) {
        console.error('Error checking active case:', error);
        setActiveCase(null);
      } else if (activeReports && activeReports.length > 0) {
        console.log('✅ Found active case:', activeReports[0].report_id);
        const report = activeReports[0];
        
        // Fetch police office name if assigned_office_id exists
        let officeName = null;
        if (report.assigned_office_id) {
          const { data: officeData } = await supabase
            .from('tbl_police_offices')
            .select('office_name')
            .eq('office_id', report.assigned_office_id)
            .single();
          
          if (officeData) {
            officeName = officeData.office_name;
          }
        }
        
        setActiveCase({
          ...report,
          office_name: officeName,
        } as ActiveCase);
      } else {
        setActiveCase(null);
      }
    } catch (error) {
      console.error('Error in checkActiveCase:', error);
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
        console.error('Error fetching notifications:', error);
        setNotifications([]);
      } else {
        // Fetch office names for each notification
        const notificationsWithOffice = await Promise.all(
          (reports || []).map(async (report) => {
            let officeName = null;
            if (report.assigned_office_id) {
              const { data: officeData } = await supabase
                .from('tbl_police_offices')
                .select('office_name')
                .eq('office_id', report.assigned_office_id)
                .single();
              
              if (officeData) {
                officeName = officeData.office_name;
              }
            }
            return {
              ...report,
              office_name: officeName,
            } as ActiveCase;
          })
        );
        setNotifications(notificationsWithOffice);
      }
    } catch (error) {
      console.error('Error in checkNotifications:', error);
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
          console.log('🔄 Real-time update received:', payload.eventType, payload.new?.report_id);
          const newStatus = payload.new?.status?.toLowerCase();
          const oldStatus = payload.old?.status?.toLowerCase();
          
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
        console.log(`🗑️ Found ${mediaFiles.length} media file(s) to delete from storage`);
        
        // Extract file paths from URLs and delete from storage
        const bucketName = 'crash-media';
        const deletePromises = mediaFiles.map(async (media) => {
          try {
            // Extract file path from URL
            // URL format: https://...supabase.co/storage/v1/object/public/crash-media/reports/...
            const urlParts = media.file_url.split('/');
            const pathIndex = urlParts.findIndex(part => part === bucketName);
            if (pathIndex !== -1 && pathIndex < urlParts.length - 1) {
              const filePath = urlParts.slice(pathIndex + 1).join('/');
              console.log(`🗑️ Deleting file from storage: ${filePath}`);
              
              const { error: deleteError } = await supabase.storage
                .from(bucketName)
                .remove([filePath]);

              if (deleteError) {
                console.error(`❌ Error deleting file ${filePath}:`, deleteError);
              } else {
                console.log(`✅ Successfully deleted file: ${filePath}`);
              }
            }
          } catch (error) {
            console.error('Error processing file deletion:', error);
          }
        });

        await Promise.all(deletePromises);
        console.log('✅ Finished deleting files from storage');
      }

      // Update the report status to 'closed' instead of deleting (since 'cancelled' is not in the enum)
      // We'll mark it as cancelled in remarks so notifications can identify it
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('tbl_reports')
        .update({
          status: 'closed',
          updated_at: now,
          remarks: currentCase?.remarks ? `${currentCase.remarks} [Cancelled by user]` : 'Report cancelled by user',
        })
        .eq('report_id', reportId);

      if (error) {
        console.error('Error cancelling report:', error);
        return false;
      }
      
      console.log('✅ Report status updated to cancelled');
      
      // Note: We keep messages and media records for audit purposes
      // If you want to delete them, uncomment the following:
      // await supabase
      //   .from('tbl_messages')
      //   .delete()
      //   .eq('report_id', reportId);
      
      // Also delete associated media records (optional - comment out if you want to keep them)
      await supabase
        .from('tbl_media')
        .delete()
        .eq('report_id', reportId);
      
      await checkActiveCase();
      return true;
    } catch (error) {
      console.error('Error cancelling report:', error);
      return false;
    }
  };

  return { activeCase, loading, checkActiveCase, cancelReport, notifications, checkNotifications };
};

