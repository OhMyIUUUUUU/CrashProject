import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import type { PostgrestError } from '@supabase/supabase-js';
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
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { StorageService, UserData } from '../../utils/storage';
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

    const attemptLocalLogin = async (contextMessage?: string) => {
      try {
        const localUser = await StorageService.verifyCredentials(email, password);

        if (!localUser) {
          return false;
        }

        await StorageService.saveUserSession(localUser);
        await loadUser();
        router.replace('/screens/Home');

        if (contextMessage) {
          Alert.alert('Logged In', `${contextMessage} Signed in locally instead.`);
        }
        return true;
      } catch (error: any) {
        console.error('Local login attempt failed:', error);
        return false;
      }
    };

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
          const fallbackUsed = await attemptLocalLogin(error.message);
          if (!fallbackUsed) {
            Alert.alert('Login Failed', error.message);
          }
          setLoading(false);
          return;
        }

        if (authData.session && authData.user) {
          // Fetch user data from database - try both email and user_id
          const userId = authData.user.id;
          const userEmail = authData.user.email || email;
          
          // Try to fetch by user_id first, then by email
          let userData: any = null;
          let dbError: PostgrestError | null = null;
          
          // Try by user_id
          if (userId) {
            const { data: userById, error: errorById } = await supabase
              .from('tbl_users')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();
            
            if (userById && !errorById) {
              userData = userById;
            } else {
              dbError = errorById;
            }
          }
          
          // If not found by user_id, try by email
          if (!userData && userEmail) {
            const { data: userByEmail, error: errorByEmail } = await supabase
              .from('tbl_users')
              .select('*')
              .eq('email', userEmail)
              .maybeSingle();
            
            if (userByEmail && !errorByEmail) {
              userData = userByEmail;
              dbError = null;
            } else if (!userData) {
              dbError = errorByEmail;
            }
          }

          // Only log non-"no rows found" errors
          if (dbError && dbError.code !== 'PGRST116') {
            console.error('Error fetching user data:', dbError);
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
          router.replace('/screens/Home');
        }
      } catch (error: any) {
        console.error('Login error:', error);
        const fallbackUsed = await attemptLocalLogin('Unable to reach the server.');
        if (!fallbackUsed) {
          Alert.alert('Login Failed', error.message || 'An error occurred during login');
        }
      }
      
      setLoading(false);
    };

    // Navigate to Register screen (matches Stack.Screen name in _layout.tsx)
    const handleGoToSignUp = () => {
      router.push('/components/Register/Register');
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
