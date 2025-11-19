import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { StorageService, UserData } from '../../utils/storage';

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
      const isLoggedIn = await StorageService.isLoggedIn();
      if (isLoggedIn) {
        const userData = await StorageService.getUserSession();
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
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
      await StorageService.clearUserSession();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
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

