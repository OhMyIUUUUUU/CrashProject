import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import SplashScreen from './screens/SplashScreen/SplashScreen';

const Index: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // The SplashScreen component will handle all navigation logic
    // This component just renders the splash screen initially
  }, []);

  return <SplashScreen />;
};

export default Index;
