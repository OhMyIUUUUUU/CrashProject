import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StorageService, UserData } from '../utils/storage';

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  login: (emailOrPhone: string, password: string) => Promise<boolean>;
  register: (userData: UserData) => Promise<boolean>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (userData: UserData) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      // Fetch from Supabase only - no local storage fallback
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting Supabase session:', sessionError);
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      
      if (!session?.user) {
        // No session - user is not logged in
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      
      // If Supabase session exists, fetch user data from database
      const authUserId = session.user.id;
      const userEmail = session.user.email;
      
      let userData = null;
      
      // Try to fetch user by user_id first
      if (authUserId) {
        const { data, error } = await supabase
          .from('tbl_users')
          .select('*')
          .eq('user_id', authUserId)
          .maybeSingle();
        
        if (data && !error) {
          userData = data;
        } else if (error && error.code !== 'PGRST116') {
          // Only log errors that aren't "no rows found"
          console.error('Error fetching user by user_id:', error);
        }
      }
      
      // If not found by user_id, try by email
      if (!userData && userEmail) {
        const { data, error } = await supabase
          .from('tbl_users')
          .select('*')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (data && !error) {
          userData = data;
        } else if (error && error.code !== 'PGRST116') {
          // Only log errors that aren't "no rows found"
          console.error('Error fetching user by email:', error);
        }
      }
      
      // If we got user data from database, set it
      if (userData) {
        const userDataForStorage: UserData = {
          email: userData.email || userEmail || '',
          phone: userData.phone || '',
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          gender: userData.sex || '',
          birthdate: userData.birthdate || '',
          emergencyContactName: userData.emergency_contact_name || '',
          emergencyContactNumber: userData.emergency_contact_number || '',
          region: userData.region || '',
          city: userData.city || '',
          barangay: userData.barangay || '',
          password: '', // Don't store password in session
        };
        
        // Save to local storage for quick access (but always fetch from Supabase first)
        await StorageService.saveUserSession(userDataForStorage);
        setUser(userDataForStorage);
        setIsAuthenticated(true);
        console.log('✅ User data fetched from Supabase database');
      } else {
        // No user data found in database - sign out and redirect to login
        console.log('User not found in database - signing out and redirecting to login');
        setUser(null);
        setIsAuthenticated(false);
        
        // Sign out from Supabase to clear invalid session
        // This will trigger auth state change and redirect to login
        // Only sign out if we have a session (to avoid unnecessary calls)
        if (session) {
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.error('Error signing out:', signOutError);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading user from Supabase:', error);
      setUser(null);
      setIsAuthenticated(false);
      
      // Sign out from Supabase to clear invalid session if we have one
      // This will trigger auth state change and redirect to login
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.signOut();
        }
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
      }
    }
  }, []);

  const login = useCallback(async (emailOrPhone: string, password: string): Promise<boolean> => {
    try {
      const userData = await StorageService.verifyCredentials(emailOrPhone, password);
      if (userData) {
        await StorageService.saveUserSession(userData);
        setUser(userData);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    }
  }, []);

  const register = useCallback(async (userData: UserData): Promise<boolean> => {
    try {
      const success = await StorageService.registerUser(userData);
      if (success) {
        await StorageService.saveUserSession(userData);
        setUser(userData);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error during registration:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Sign out from Supabase first (this clears the session)
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('Error signing out from Supabase:', signOutError);
      }
      
      // Clear local storage
      await StorageService.clearUserSession();
      
      // Clear app state
      setUser(null);
      setIsAuthenticated(false);
      
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, clear local state
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const updateUser = useCallback(async (userData: UserData): Promise<boolean> => {
    try {
      const success = await StorageService.updateUserProfile(userData);
      if (success) {
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      login,
      register,
      logout,
      loadUser,
      updateUser,
    }),
    [user, isAuthenticated, login, register, logout, loadUser, updateUser]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

