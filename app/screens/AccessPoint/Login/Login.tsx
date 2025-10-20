import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { ValidationRules } from '../../../utils/validation';
import AuthHeader from '../components/AuthHeader/AuthHeader';
import ErrorText from '../components/ErrorText/ErrorText';
import InputField from '../components/InputField/InputField';
import LoaderOverlay from '../components/LoaderOverlay/LoaderOverlay';
import PrimaryButton from '../components/PrimaryButton/PrimaryButton';
import { styles } from './styles';

const Login: React.FC = () => {
  const router = useRouter();
  const { login } = useAuth();
  
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ emailOrPhone?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (!state.isConnected) {
        // If connection is lost, redirect to offline emergency screen
        router.replace('/screens/OfflineEmergency/OfflineEmergency');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const validateForm = useCallback((): boolean => {
    const newErrors: typeof errors = {};
    
    if (!emailOrPhone.trim()) {
      newErrors.emailOrPhone = 'Email or Phone is required';
    }
    
    const passwordError = ValidationRules.password(password);
    if (passwordError) {
      newErrors.password = passwordError;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [emailOrPhone, password]);

  const handleLogin = useCallback(async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setErrors({});
    
    try {
      const success = await login(emailOrPhone.trim(), password);
      
      if (success) {
        router.replace('/screens/Home/Home');
      } else {
        setErrors({ general: 'Invalid credentials. Please check your email/phone and password.' });
      }
    } catch (error) {
      setErrors({ general: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [emailOrPhone, password, login, router, validateForm]);

  const handleGoToSignup = useCallback(() => {
    router.push('/screens/AccessPoint/Register/Register');
  }, [router]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <AuthHeader 
            title="Welcome Back" 
            subtitle="Sign in to continue to AccessPoint"
          />
          
          <View style={styles.form}>
            <InputField
              label="Email or Phone"
              placeholder="Enter your email or phone number"
              value={emailOrPhone}
              onChangeText={setEmailOrPhone}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.emailOrPhone}
              icon={<Ionicons name="person-outline" size={20} color="#666" />}
            />
            
            <InputField
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              error={errors.password}
              icon={
                <TouchableOpacity onPress={togglePasswordVisibility}>
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              }
            />
            
            <ErrorText message={errors.general} />
            
            <PrimaryButton
              title="Login"
              onPress={handleLogin}
              loading={loading}
            />
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleGoToSignup}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      
      <LoaderOverlay visible={loading} message="Logging in..." />
    </KeyboardAvoidingView>
  );
};

export default Login;
