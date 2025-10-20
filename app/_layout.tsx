import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from './contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/SplashScreen/SplashScreen" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/AccessPoint/Login/Login" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/AccessPoint/Register/Register" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/Home/Home" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/Home/Profile" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/Home/Report" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/OfflineEmergency/OfflineEmergency" 
          options={{ headerShown: false }} 
        />
      </Stack>
    </AuthProvider>
  );
}
