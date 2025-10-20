import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { Picker } from '@react-native-picker/picker';
import barangay from 'barangay';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { UserData } from '../../../utils/storage';
import { ValidationRules } from '../../../utils/validation';
import AuthHeader from '../components/AuthHeader/AuthHeader';
import ErrorText from '../components/ErrorText/ErrorText';
import InputField from '../components/InputField/InputField';
import LoaderOverlay from '../components/LoaderOverlay/LoaderOverlay';
import PrimaryButton from '../components/PrimaryButton/PrimaryButton';
import SearchablePicker from '../components/SearchablePicker/SearchablePicker';
import { styles } from './style';

interface FormErrors {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  age?: string;
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
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    gender: '',
    age: '',
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

  // Get all regions from barangay package
  const regions = useMemo(() => {
    try {
      const regionData = barangay();
      console.log('Regions data:', regionData);
      return Array.isArray(regionData) ? regionData : [];
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
    if (!formData.region || provinces.length === 0) return [];
    try {
      // Get all cities from all provinces in the region
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
    if (!formData.region || !formData.city || provinces.length === 0) return [];
    try {
      // Find which province contains this city
      let barangayData: string[] = [];
      for (const province of provinces) {
        try {
          const cityData = barangay(formData.region, province);
          if (Array.isArray(cityData) && cityData.includes(formData.city)) {
            // Found the province that contains this city
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
    
    const ageError = ValidationRules.age(formData.age);
    if (ageError) newErrors.age = ageError;
    
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
      const userData: UserData = {
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        age: formData.age,
        emergencyContactName: formData.emergencyContactName.trim(),
        emergencyContactNumber: formData.emergencyContactNumber.trim(),
        region: formData.region,
        city: formData.city,
        barangay: formData.barangay,
        password: formData.password,
      };
      
      const success = await register(userData);
      
      if (success) {
        router.replace('/screens/Home/Home');
      } else {
        setErrors({ general: 'User with this email or phone already exists.' });
      }
    } catch (error) {
      setErrors({ general: 'An error occurred during registration. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [formData, register, router, validateForm]);

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
              icon={<Ionicons name="mail-outline" size={20} color="#666" />}
            />
            
            <InputField
              label="Phone Number"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={(value) => updateFormData('phone', value)}
              keyboardType="phone-pad"
              error={errors.phone}
              icon={<Ionicons name="call-outline" size={20} color="#666" />}
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
                <Text style={styles.label}>Gender</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.gender}
                    onValueChange={(value) => updateFormData('gender', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Gender" value="" />
                    <Picker.Item label="Male" value="male" />
                    <Picker.Item label="Female" value="female" />
                    <Picker.Item label="Other" value="other" />
                  </Picker>
                </View>
                {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
              </View>
              <View style={styles.halfWidth}>
                <InputField
                  label="Age"
                  placeholder="Age"
                  value={formData.age}
                  onChangeText={(value) => updateFormData('age', value)}
                  keyboardType="number-pad"
                  error={errors.age}
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
              icon={<Ionicons name="person-add-outline" size={20} color="#666" />}
            />
            
            <InputField
              label="Emergency Contact Number"
              placeholder="Enter contact number"
              value={formData.emergencyContactNumber}
              onChangeText={(value) => updateFormData('emergencyContactNumber', value)}
              keyboardType="phone-pad"
              error={errors.emergencyContactNumber}
              icon={<Ionicons name="call-outline" size={20} color="#666" />}
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
                    size={20} 
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
                    size={20} 
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
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={handleGoToLogin}>
                <Text style={styles.footerLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
    </View>
      </ScrollView>
      
      <LoaderOverlay visible={loading} message="Creating your account..." />
    </KeyboardAvoidingView>
  );
};

export default Register;
