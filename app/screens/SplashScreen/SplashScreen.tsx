import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const SplashScreen: React.FC = () => {
  const router = useRouter();
  const { loadUser } = useAuth();
  const [status, setStatus] = useState<string>('Initializing...');
  const hasNavigated = useRef(false);

  useEffect(() => {
    const checkConnectivityAndAuth = async () => {
      // Prevent multiple navigations
      if (hasNavigated.current) return;

      try {
        // Wait for app to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setStatus('Checking internet connection...');
        
        // Check internet connectivity with timeout
        const netInfoState = await Promise.race([
          NetInfo.fetch(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 5000))
        ]) as any;
        
        const isConnected = netInfoState?.isConnected ?? true; // Default to online if check fails

        if (!isConnected) {
          // If offline, go to offline emergency screen
          setStatus('Offline mode detected');
          await new Promise(resolve => setTimeout(resolve, 800));
          if (!hasNavigated.current) {
            hasNavigated.current = true;
            router.replace('/screens/OfflineEmergency/OfflineEmergency');
          }
          return;
        }

        // If online, check authentication status
        setStatus('Checking authentication...');
        await loadUser();
        
        // Check authentication directly from storage
        const { StorageService } = await import('../../utils/storage');
        const loggedIn = await StorageService.isLoggedIn();
        
        // Navigate based on authentication
        if (loggedIn) {
          setStatus('Welcome back!');
          await new Promise(resolve => setTimeout(resolve, 500));
          if (!hasNavigated.current) {
            hasNavigated.current = true;
            router.replace('/screens/Home/Home');
          }
        } else {
          setStatus('Redirecting to login...');
          await new Promise(resolve => setTimeout(resolve, 500));
          if (!hasNavigated.current) {
            hasNavigated.current = true;
            router.replace('/screens/AccessPoint/Login/Login');
          }
        }
      } catch (error) {
        console.error('Error during splash screen checks:', error);
        setStatus('Starting app...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          router.replace('/screens/AccessPoint/Login/Login');
        }
      }
    };

    checkConnectivityAndAuth();
  }, [loadUser, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Ionicons name="shield-checkmark" size={80} color="#007AFF" />
        </View>
        <Text style={styles.title}>AccessPoint</Text>
        <Text style={styles.subtitle}>Emergency Response System</Text>
        
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.status}>{status}</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Your Safety, Our Priority</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#007AFF20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 60,
  },
  loaderContainer: {
    alignItems: 'center',
  },
  status: {
    fontSize: 14,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  version: {
    fontSize: 12,
    color: '#999',
  },
});

export default SplashScreen;
