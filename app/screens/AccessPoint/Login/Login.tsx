import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../../lib/supabase';
import { StorageService, UserData } from '../../../utils/storage';
import { useAuth } from '../../../contexts/AuthContext';
import { styles } from './styles';

export default function Login() {
  const router = useRouter();
  const { loadUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected === false) {
        Alert.alert('Connection Lost', 'You are currently offline.');
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle Login
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    
    try {
      // --- LOGIN LOGIC ---
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        Alert.alert('Login Failed', error.message);
        setLoading(false);
        return;
      }

      if (authData.session && authData.user) {
        // Fetch user data from database
        const { data: userData, error: dbError } = await supabase
          .from('tbl_users')
          .select('*')
          .eq('email', email)
          .single();

        if (dbError) {
          console.error('Error fetching user data:', dbError);
          // Still proceed with login even if we can't fetch full profile
        }

        // Convert database user data to UserData format
        const userDataForStorage: UserData = {
          email: userData?.email || email,
          phone: userData?.phone || '',
          firstName: userData?.first_name || '',
          lastName: userData?.last_name || '',
          gender: userData?.sex || '',
          birthdate: userData?.birthdate || '',
          emergencyContactName: userData?.emergency_contact_name || '',
          emergencyContactNumber: userData?.emergency_contact_number || '',
          region: userData?.region || '',
          city: userData?.city || '',
          barangay: userData?.barangay || '',
          password: password, // Note: This is for local storage compatibility
        };

        // Save to local storage directly (don't use register as it checks for duplicates)
        await StorageService.saveUserSession(userDataForStorage);
        
        // Update AuthContext by reloading user
        await loadUser();
        
        // Navigate to Home screen
        router.replace('/screens/Home/Home');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    }
    
    setLoading(false);
  };

  // Navigate to Register screen
  const handleGoToSignUp = () => {
    router.push('/screens/AccessPoint/Register/Register');
  };

  return (
    <LinearGradient
      colors={['#FF6B6B', '#FF8787', '#FFA8A8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradientContainer}
    >
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
            
            {/* --- CUSTOM HEADER --- */}
            <View style={{ marginBottom: 30 }}>
              <Text style={styles.headerTitle}>
                Welcome Back
              </Text>
              <Text style={styles.headerSubtitle}>
                Sign in to continue to AccessPoint
              </Text>
            </View>
            
            <View style={styles.form}>
              
              {/* --- CUSTOM INPUT FIELD: EMAIL --- */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={22} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              
              {/* --- CUSTOM INPUT FIELD: PASSWORD --- */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={22} 
                      color="#666" 
                      style={styles.inputIcon} 
                    />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              
              {/* --- PRIMARY BUTTON --- */}
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    Login
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            
            {/* --- FOOTER --- */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don't have an account? 
              </Text>
              <TouchableOpacity onPress={handleGoToSignUp}>
                <Text style={styles.footerLink}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
