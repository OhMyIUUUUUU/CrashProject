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
      // Active cases are those that are not resolved or cancelled
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

      // Filter for active cases (pending or any status that's not resolved/cancelled)
      const activeReports = reports?.filter(report => {
        const status = report.status?.toLowerCase();
        const isActive = status === 'pending' || 
                       (status !== 'resolved' && status !== 'cancelled');
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

  useEffect(() => {
    checkActiveCase();
    
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
          // Small delay to ensure database is ready
          setTimeout(() => {
            checkActiveCase();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cancelReport = async (reportId: string) => {
    try {
      // Delete the report from the database
      const { error } = await supabase
        .from('tbl_reports')
        .delete()
        .eq('report_id', reportId);

      if (error) {
        console.error('Error deleting report:', error);
        return false;
      }
      
      // Also delete associated messages
      await supabase
        .from('tbl_messages')
        .delete()
        .eq('report_id', reportId);
      
      // Also delete associated media
      await supabase
        .from('tbl_media')
        .delete()
        .eq('report_id', reportId);
      
      await checkActiveCase();
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      return false;
    }
  };

  return { activeCase, loading, checkActiveCase, cancelReport };
};

