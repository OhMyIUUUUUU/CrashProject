import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
// import { Picker } from '@react-native-picker/picker';
import barangay from 'barangay';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { StorageService, UserData } from '../../../utils/storage';
import { ValidationRules } from '../../../utils/validation';
import { useAuth } from '../../../contexts/AuthContext';
import AuthHeader from '../components/AuthHeader/AuthHeader';
import DatePicker from '../components/DatePicker/DatePicker';
import ErrorText from '../components/ErrorText/ErrorText';
import InputField from '../components/InputField/InputField';
import LoaderOverlay from '../components/LoaderOverlay/LoaderOverlay';
import PrimaryButton from '../components/PrimaryButton/PrimaryButton';
import SearchablePicker from '../components/SearchablePicker/SearchablePicker';
import SimplePicker from '../components/SimplePicker/SimplePicker';
import { styles } from './style';

interface FormErrors {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  birthdate?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  region?: string;
  city?: string;
  barangay?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const Register: React.FC = () => {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    gender: '',
    birthdate: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    region: '',
    city: '',
    barangay: '',
    password: '',
    confirmPassword: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const otpInputRef = useRef<TextInput>(null);

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

  useEffect(() => {
    if (!showOtpModal || resendTimer <= 0) {
      if (otpTimerRef.current) {
        clearInterval(otpTimerRef.current);
        otpTimerRef.current = null;
      }
      return;
    }

    otpTimerRef.current = setInterval(() => {
      setResendTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (otpTimerRef.current) {
        clearInterval(otpTimerRef.current);
        otpTimerRef.current = null;
      }
    };
  }, [showOtpModal, resendTimer]);

  const openOtpModal = (email: string) => {
    setVerificationEmail(email);
    setOtpCode('');
    setOtpError('');
    setResendTimer(30);
    setShowOtpModal(true);
    // Focus the input after a short delay to ensure modal is rendered
    setTimeout(() => {
      if (otpInputRef.current) {
        otpInputRef.current.focus();
      }
    }, 100);
  };

  const closeOtpModal = () => {
    setShowOtpModal(false);
    setOtpCode('');
    setOtpError('');
    setResendTimer(0);
  };

  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit code');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    const { data, error } = await supabase.auth.verifyOtp({
      email: verificationEmail,
      token: otpCode,
      type: 'email',
    });

    setOtpLoading(false);

    if (error) {
      // Check if it's an invalid OTP/token error
      const errorMessage = error.message?.toLowerCase() || '';
      const isInvalidOtp = 
        error.status === 400 ||
        errorMessage.includes('token') || 
        errorMessage.includes('invalid') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('code') ||
        errorMessage.includes('otp') ||
        errorMessage.includes('verification');
      
      if (isInvalidOtp) {
        setOtpError('Wrong OTP');
      } else {
        setOtpError(error.message);
      }
      return;
    }

    if (data.session) {
      // Save user data to local storage after OTP verification
      try {
        const userData: UserData = {
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          gender: formData.gender,
          birthdate: formData.birthdate,
          emergencyContactName: formData.emergencyContactName.trim(),
          emergencyContactNumber: formData.emergencyContactNumber.trim(),
          region: formData.region,
          city: formData.city,
          barangay: formData.barangay,
          password: formData.password, // Note: This is for local storage compatibility
        };

        // Save to local storage and update AuthContext
        await registerUser(userData);
      } catch (error) {
        console.error('Error saving user data:', error);
      }

      closeOtpModal();
      // Wait for modal to close before navigating
      setTimeout(() => {
        try {
          router.replace('/screens/Home/Home');
          // Show success message after navigation
          setTimeout(() => {
            Alert.alert('Success', 'Account verified successfully!');
          }, 300);
        } catch (error) {
          console.error('Navigation error:', error);
          // Retry navigation after a longer delay if it fails
          setTimeout(() => {
            router.replace('/screens/Home/Home');
          }, 500);
        }
      }, 300);
    }
  }, [otpCode, router, verificationEmail, formData, registerUser]);

  const handleResendOtp = useCallback(async () => {
    if (resendTimer > 0 || !verificationEmail) return;

    setOtpError('');
    setOtpLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: verificationEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    setOtpLoading(false);

    if (error) {
      // Check if error is rate limiting
      const rateLimitMatch = error.message.match(/after (\d+) seconds?/i);
      if (rateLimitMatch) {
        const waitTime = parseInt(rateLimitMatch[1], 10);
        setResendTimer(waitTime);
        setOtpError(`Please wait ${waitTime} seconds before requesting a new code.`);
      } else {
        setOtpError(error.message);
      }
      return;
    }

    setResendTimer(30);
    setOtpCode('');
    setOtpError('');
    Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
  }, [resendTimer, verificationEmail]);

  // Get all regions from barangay package
  const regions = useMemo(() => {
    try {
      const regionData = barangay();
      console.log('Regions data:', regionData);
      console.log('Regions count:', Array.isArray(regionData) ? regionData.length : 0);
      const result = Array.isArray(regionData) ? regionData : [];
      if (result.length === 0) {
        console.warn('Warning: No regions found!');
      }
      return result;
    } catch (error) {
      console.error('Error fetching regions:', error);
      return [];
    }
  }, []);

  // Get provinces based on selected region (hidden, used internally)
  const provinces = useMemo(() => {
    if (!formData.region) return [];
    try {
      const provinceData = barangay(formData.region);
      console.log('Provinces for', formData.region, ':', provinceData);
      return Array.isArray(provinceData) ? provinceData : [];
    } catch (error) {
      console.error('Error fetching provinces for', formData.region, ':', error);
      return [];
    }
  }, [formData.region]);

  // Get cities based on selected region
  const cities = useMemo(() => {
    if (!formData.region) return [];
    try {
      // Some regions (like NCR) have no provinces in the dataset.
      if (provinces.length === 0) {
        const cityData = barangay(formData.region);
        console.log('Direct cities for', formData.region, ':', cityData);
        return Array.isArray(cityData) ? cityData : [];
      }

      // Otherwise, aggregate cities across provinces
      const allCities: string[] = [];
      for (const province of provinces) {
        try {
          const cityData = barangay(formData.region, province);
          if (Array.isArray(cityData)) {
            allCities.push(...cityData);
          }
        } catch (error) {
          console.error('Error fetching cities for', formData.region, province, ':', error);
        }
      }
      console.log('All cities for', formData.region, ':', allCities);
      return allCities;
    } catch (error) {
      console.error('Error fetching cities for', formData.region, ':', error);
      return [];
    }
  }, [formData.region, provinces]);

  // Get barangays based on selected city
  const barangays = useMemo(() => {
    if (!formData.region || !formData.city) return [];
    try {
      // If there are no provinces (e.g., NCR), fetch barangays directly by region + city
      if (provinces.length === 0) {
        const brgys = barangay(formData.region, formData.city);
        console.log('Direct barangays for', formData.city, ':', Array.isArray(brgys) ? brgys.slice(0, 5) : brgys);
        return Array.isArray(brgys) ? brgys : [];
      }

      // Otherwise, find the province that contains this city
      let barangayData: string[] = [];
      for (const province of provinces) {
        try {
          const cityData = barangay(formData.region, province);
          if (Array.isArray(cityData) && cityData.includes(formData.city)) {
            barangayData = barangay(formData.region, province, formData.city);
            break;
          }
        } catch (error) {
          // Continue to next province
        }
      }
      console.log('Barangays for', formData.city, ':', barangayData?.slice(0, 5));
      return Array.isArray(barangayData) ? barangayData : [];
    } catch (error) {
      console.error('Error fetching barangays for', formData.region, formData.city, ':', error);
      return [];
    }
  }, [formData.region, formData.city, provinces]);

  const updateFormData = useCallback((field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Reset dependent fields when parent field changes
      if (field === 'region') {
        updated.city = '';
        updated.barangay = '';
      } else if (field === 'city') {
        updated.barangay = '';
      }
      
      return updated;
    });
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    
    const emailError = ValidationRules.email(formData.email);
    if (emailError) newErrors.email = emailError;
    
    const phoneError = ValidationRules.phone(formData.phone);
    if (phoneError) newErrors.phone = phoneError;
    
    const firstNameError = ValidationRules.required(formData.firstName, 'First Name');
    if (firstNameError) newErrors.firstName = firstNameError;
    
    const lastNameError = ValidationRules.required(formData.lastName, 'Last Name');
    if (lastNameError) newErrors.lastName = lastNameError;
    
    const genderError = ValidationRules.required(formData.gender, 'Gender');
    if (genderError) newErrors.gender = genderError;
    
    const birthdateError = ValidationRules.birthdate(formData.birthdate);
    if (birthdateError) newErrors.birthdate = birthdateError;
    
    const emergencyNameError = ValidationRules.required(formData.emergencyContactName, 'Emergency Contact Name');
    if (emergencyNameError) newErrors.emergencyContactName = emergencyNameError;
    
    const emergencyNumberError = ValidationRules.phone(formData.emergencyContactNumber);
    if (emergencyNumberError) newErrors.emergencyContactNumber = emergencyNumberError;
    
    const regionError = ValidationRules.required(formData.region, 'Region');
    if (regionError) newErrors.region = regionError;
    
    const cityError = ValidationRules.required(formData.city, 'City');
    if (cityError) newErrors.city = cityError;
    
    const barangayError = ValidationRules.required(formData.barangay, 'Barangay');
    if (barangayError) newErrors.barangay = barangayError;
    
    const passwordError = ValidationRules.password(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    const confirmPasswordError = ValidationRules.confirmPassword(formData.password, formData.confirmPassword);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleRegister = useCallback(async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setErrors({});
    
    try {
      const duplicateErrors: FormErrors = {};
      const trimmedEmail = formData.email.trim();
      const trimmedPhone = formData.phone.trim();

      // Check for existing email/phone in tbl_users
      if (trimmedEmail || trimmedPhone) {
        const conditions = [`email.eq.${trimmedEmail}`];
        if (trimmedPhone) {
          conditions.push(`phone.eq.${trimmedPhone}`);
        }

        const { data: existingUsers, error: existingCheckError } = await supabase
          .from('tbl_users')
          .select('email, phone')
          .or(conditions.join(','));

        if (!existingCheckError && existingUsers && existingUsers.length > 0) {
          const emailExists = existingUsers.some(
            user => user.email?.toLowerCase() === trimmedEmail.toLowerCase()
          );
          const phoneExists =
            !!trimmedPhone &&
            existingUsers.some(user => user.phone === trimmedPhone);

          if (emailExists) {
            duplicateErrors.email = 'This email is already registered';
          }
          if (phoneExists) {
            duplicateErrors.phone = 'This phone number is already registered';
          }

          if (emailExists || phoneExists) {
            setErrors(prev => ({ ...prev, ...duplicateErrors }));
            setLoading(false);
            return;
          }
        }
      }

      // First, sign up with Supabase using email and password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (authError) {
        Alert.alert('Registration Failed', authError.message);
        setErrors({ general: authError.message });
        setLoading(false);
        return;
      }

      if (!authData.user) {
        Alert.alert('Registration Failed', 'Unable to create account. Please try again.');
        setErrors({ general: 'Unable to create account. Please try again.' });
        setLoading(false);
        return;
      }

      // Insert user data into tbl_users table
      const { error: dbError } = await supabase
        .from('tbl_users')
        .insert({
          user_id: authData.user.id,
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          password_hash: formData.password, // Note: Supabase handles password hashing, but storing for reference
          first_name: formData.firstName.trim() || null,
          last_name: formData.lastName.trim() || null,
          birthdate: formData.birthdate.trim() || null,
          sex: formData.gender || null,
          emergency_contact_name: formData.emergencyContactName.trim() || null,
          emergency_contact_number: formData.emergencyContactNumber.trim() || null,
          region: formData.region || null,
          city: formData.city || null,
          barangay: formData.barangay || null,
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        Alert.alert('Warning', 'Account created but failed to save additional information. ' + dbError.message);
        // Continue anyway since auth was successful
      }

      // Ensure emergency contact shows on Home by saving it to contacts list
      if (formData.emergencyContactName && formData.emergencyContactNumber) {
        try {
          await StorageService.addEmergencyContact({
            id: Date.now().toString(),
            name: formData.emergencyContactName.trim(),
            number: formData.emergencyContactNumber.trim(),
          });
        } catch {}
      }

      // Send OTP and show OTP modal
      // Note: Supabase signUp may have already sent a confirmation email
      // We'll try to send OTP, but if rate limited, we'll still show the modal
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: formData.email.trim(),
        options: {
          shouldCreateUser: false,
        },
      });

      // Always show OTP modal - even if there's a rate limit error
      // The user can resend after the wait period
      openOtpModal(formData.email.trim());
      setLoading(false);
      
      if (otpError) {
        // Check if error is rate limiting and extract wait time
        const rateLimitMatch = otpError.message.match(/after (\d+) seconds?/i);
        if (rateLimitMatch) {
          const waitTime = parseInt(rateLimitMatch[1], 10);
          setResendTimer(waitTime);
          setOtpError(`Rate limited. Please wait ${waitTime} seconds before requesting a new code.`);
        } else {
          setOtpError(otpError.message);
        }
      }
      
      return;
    } catch (error: any) {
      Alert.alert('Registration Error', error.message || 'An error occurred during registration. Please try again.');
      setErrors({ general: error.message || 'An error occurred during registration. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [formData, router, validateForm]);

  const handleGoToLogin = useCallback(() => {
    router.back();
  }, [router]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword(prev => !prev);
  }, []);

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
            <AuthHeader 
              title="Create Account" 
              subtitle="Sign up to get started with AccessPoint"
            />
            
            <View style={styles.form}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <InputField
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              icon={<Ionicons name="mail-outline" size={22} color="#666" />}
            />
            
            <InputField
              label="Phone Number"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={(value) => updateFormData('phone', value)}
              keyboardType="phone-pad"
              error={errors.phone}
              icon={<Ionicons name="call-outline" size={22} color="#666" />}
            />
            
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <InputField
                  label="First Name"
                  placeholder="First name"
                  value={formData.firstName}
                  onChangeText={(value) => updateFormData('firstName', value)}
                  error={errors.firstName}
                />
              </View>
              <View style={styles.halfWidth}>
                <InputField
                  label="Last Name"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChangeText={(value) => updateFormData('lastName', value)}
                  error={errors.lastName}
                />
              </View>
            </View>
            
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <SimplePicker
                  label="Gender"
                  placeholder="Select Gender"
                  value={formData.gender}
                  data={["Male", "Female", "Other"]}
                  onValueChange={(value) => updateFormData('gender', value)}
                  enabled={true}
                  error={errors.gender}
                />
              </View>
              <View style={styles.halfWidth}>
                <DatePicker
                  label="Birthdate"
                  placeholder="Select birthdate"
                  value={formData.birthdate}
                  onValueChange={(value) => updateFormData('birthdate', value)}
                  enabled={true}
                  error={errors.birthdate}
                  maximumDate={new Date()}
                  minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 120))}
                />
              </View>
            </View>
            
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            
            <InputField
              label="Emergency Contact Name"
              placeholder="Enter contact name"
              value={formData.emergencyContactName}
              onChangeText={(value) => updateFormData('emergencyContactName', value)}
              error={errors.emergencyContactName}
              icon={<Ionicons name="person-add-outline" size={22} color="#666" />}
            />
            
            <InputField
              label="Emergency Contact Number"
              placeholder="Enter contact number"
              value={formData.emergencyContactNumber}
              onChangeText={(value) => updateFormData('emergencyContactNumber', value)}
              keyboardType="phone-pad"
              error={errors.emergencyContactNumber}
              icon={<Ionicons name="call-outline" size={22} color="#666" />}
            />
            
            <Text style={styles.sectionTitle}>Address Information</Text>
            
            <SearchablePicker
              label="Region"
              placeholder="Select Region"
              value={formData.region}
              data={regions}
              onValueChange={(value) => updateFormData('region', value)}
              enabled={true}
              error={errors.region}
            />
            
            <SearchablePicker
              label="City/Municipality"
              placeholder="Select City/Municipality"
              value={formData.city}
              data={cities}
              onValueChange={(value) => updateFormData('city', value)}
              enabled={!!formData.region}
              error={errors.city}
            />
            
            <SearchablePicker
              label="Barangay"
              placeholder="Select Barangay"
              value={formData.barangay}
              data={barangays}
              onValueChange={(value) => updateFormData('barangay', value)}
              enabled={!!formData.city}
              error={errors.barangay}
            />
            
            <Text style={styles.sectionTitle}>Security</Text>
            
            <InputField
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChangeText={(value) => updateFormData('password', value)}
              secureTextEntry={!showPassword}
              error={errors.password}
              icon={
                <TouchableOpacity onPress={togglePasswordVisibility}>
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={22} 
                    color="#666" 
                  />
                </TouchableOpacity>
              }
            />
            
            <InputField
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
              error={errors.confirmPassword}
              icon={
                <TouchableOpacity onPress={toggleConfirmPasswordVisibility}>
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={22} 
                    color="#666" 
                  />
                </TouchableOpacity>
              }
            />
            
            <ErrorText message={errors.general} />
            
            <PrimaryButton
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
            />
            </View>
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={handleGoToLogin}>
                <Text style={styles.footerLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        
        <LoaderOverlay visible={loading} message="Creating your account..." />
      </KeyboardAvoidingView>

      <Modal visible={showOtpModal} transparent animationType="fade" onRequestClose={closeOtpModal}>
        <View style={styles.otpOverlay}>
          <View style={styles.otpCard}>
            <Ionicons name="mail-outline" size={56} color="#FF6B6B" style={styles.otpIcon} />
            <Text style={styles.otpTitle}>Verify Email</Text>
            <Text style={styles.otpSubtitle}>We've sent a verification code to</Text>
            <Text style={styles.otpEmail}>{verificationEmail}</Text>

            <View style={styles.otpInputContainer}>
              {/* Hidden TextInput for actual input */}
              <TextInput
                ref={otpInputRef}
                value={otpCode}
                onChangeText={(text) => {
                  // Only allow numbers and limit to 6 digits
                  const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
                  setOtpCode(numericText);
                  setOtpError('');
                }}
                keyboardType="number-pad"
                autoFocus={true}
                maxLength={6}
                style={styles.otpHiddenInput}
                caretHidden={true}
              />
              
              {/* Visual display boxes */}
              <TouchableOpacity 
                style={styles.otpDisplayContainer}
                activeOpacity={1}
                onPress={() => otpInputRef.current?.focus()}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = otpCode[index] || '';
                  const isFocused = otpCode.length === index;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpDisplayBox,
                        digit && styles.otpDisplayBoxFilled,
                        isFocused && styles.otpDisplayBoxFocused,
                      ]}
                    >
                      <Text style={styles.otpDisplayText}>{digit}</Text>
                    </View>
                  );
                })}
              </TouchableOpacity>
            </View>

            {otpError ? <Text style={styles.otpError}>{otpError}</Text> : null}

            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={otpLoading || otpCode.length !== 6}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={otpCode.length === 6 && !otpLoading ? ['#FF6B6B', '#FF8787', '#FFA8A8'] : ['#E0E0E0', '#E0E0E0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.button, (otpLoading || otpCode.length !== 6) && styles.buttonDisabled]}
              >
                {otpLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendOtp}
              disabled={resendTimer > 0}
              activeOpacity={0.7}
            >
              <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
                {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelOtpButton} 
              onPress={closeOtpModal}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelOtpText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

export default Register;
