import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
// import { Picker } from '@react-native-picker/picker';
import barangay from 'barangay';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, InteractionManager, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { StorageService, UserData } from '../utils/storage';
import { ValidationRules } from '../utils/validation';
// Import components from their new relative paths (up one level to components folder)
import AuthHeader from '../components/AuthHeader/AuthHeader';
import DatePicker from '../components/DatePicker/DatePicker';
import ErrorText from '../components/ErrorText/ErrorText';
import InputField from '../components/InputField/InputField';
import PrimaryButton from '../components/PrimaryButton/PrimaryButton';
import SearchablePicker from '../components/SearchablePicker/SearchablePicker';
import SimplePicker from '../components/SimplePicker/SimplePicker';
import { styles } from './styles';

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

const SignUp: React.FC = () => {
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
    const otpTimerRef = useRef<any>(null);
    const otpInputRef = useRef<TextInput>(null);

    // Monitor network connectivity
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            if (!state.isConnected) {
                // If connection is lost, redirect to offline emergency screen
                router.replace('/components/OfflineEmergency/OfflineEmergency');
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

    const buildUserData = useCallback((): UserData => {
        return {
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
            password: formData.password,
        };
    }, [formData]);

    const persistEmergencyContact = useCallback(async () => {
        if (formData.emergencyContactName && formData.emergencyContactNumber) {
            try {
                await StorageService.addEmergencyContact({
                    id: Date.now().toString(),
                    name: formData.emergencyContactName.trim(),
                    number: formData.emergencyContactNumber.trim(),
                });
            } catch (error) {
                console.warn('Failed to persist emergency contact locally:', error);
            }
        }
    }, [formData.emergencyContactName, formData.emergencyContactNumber]);

    const navigateToHome = useCallback(() => {
        InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                try {
                    router.replace('/screens/Home');
                } catch (error) {
                    console.error('Navigation error:', error);
                }
            });
        });
    }, [router]);

    const completeLocalRegistration = useCallback(
        async (reason: 'email' | 'network'): Promise<boolean> => {
            try {
                const userData = buildUserData();
                const success = await registerUser(userData);

                if (!success) {
                    setErrors(prev => ({
                        ...prev,
                        general: 'This email or phone number is already registered locally.',
                    }));
                    return false;
                }

                await persistEmergencyContact();

                const message =
                    reason === 'email'
                        ? "We couldn't send the confirmation email, but your account was created locally and you're now signed in."
                        : 'We saved your details locally so you can keep using the app even without email verification.';

                Alert.alert('Registration Complete', message);
                navigateToHome();
                return true;
            } catch (error: any) {
                console.error('Local registration fallback failed:', error);
                Alert.alert('Registration Error', error.message || 'Unable to complete registration locally.');
                return false;
            }
        },
        [buildUserData, registerUser, persistEmergencyContact, navigateToHome]
    );

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
            try {
                const userData = buildUserData();
                await registerUser(userData);
            } catch (error) {
                console.error('Error saving user data:', error);
            }

            closeOtpModal();
            setTimeout(() => {
                navigateToHome();
                setTimeout(() => {
                    Alert.alert('Success', 'Account verified successfully!');
                }, 300);
            }, 300);
        }
    }, [otpCode, navigateToHome, verificationEmail, buildUserData, registerUser]);

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

    const regions = useMemo(() => {
        try {
            const regionData = barangay();
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

    const provinces = useMemo(() => {
        if (!formData.region) return [];
        try {
            const provinceData = barangay(formData.region);
            return Array.isArray(provinceData) ? provinceData : [];
        } catch (error) {
            console.error('Error fetching provinces for', formData.region, ':', error);
            return [];
        }
    }, [formData.region]);

    const cities = useMemo(() => {
        if (!formData.region) return [];
        try {
            if (provinces.length === 0) {
                const cityData = barangay(formData.region);
                return Array.isArray(cityData)
                    ? cityData.map(c => c.endsWith(' City') || c.includes('City ') ? c : `${c} City`)
                    : [];
            }

            const allCities: string[] = [];
            for (const province of provinces) {
                try {
                    const cityData = barangay(formData.region, province);
                    if (Array.isArray(cityData)) {
                        // Append " City" if not already present
                        const formattedCities = cityData.map(c =>
                            c.endsWith(' City') || c.includes('City ') ? c : `${c} City`
                        );
                        allCities.push(...formattedCities);
                    }
                } catch (error) {
                }
            }
            return allCities;
        } catch (error) {
            console.error('Error fetching cities for', formData.region, ':', error);
            return [];
        }
    }, [formData.region, provinces]);

    const barangays = useMemo(() => {
        if (!formData.region || !formData.city) return [];
        try {
            if (provinces.length === 0) {
                // Try literal match first
                let brgys = barangay(formData.region, formData.city);

                // If empty and city has " City" suffix, try removing it (in case package uses raw name)
                if ((!brgys || brgys.length === 0) && formData.city.endsWith(' City')) {
                    const rawCity = formData.city.substring(0, formData.city.length - 5);
                    brgys = barangay(formData.region, rawCity);
                }

                return Array.isArray(brgys) ? brgys : [];
            }

            let barangayData: string[] = [];
            for (const province of provinces) {
                try {
                    const cityData = barangay(formData.region, province);

                    // Helper to check if city matches (handling " City" suffix)
                    const cityMatches = (rawCity: string, selectedCity: string) => {
                        if (rawCity === selectedCity) return true;
                        if (selectedCity === `${rawCity} City`) return true;
                        return false;
                    };

                    if (Array.isArray(cityData) && cityData.some(c => cityMatches(c, formData.city))) {
                        // Find the exact raw city name from the package data
                        const rawCity = cityData.find(c => cityMatches(c, formData.city));
                        if (rawCity) {
                            barangayData = barangay(formData.region, province, rawCity);
                            break;
                        }
                    }
                } catch (error) {
                }
            }
            return Array.isArray(barangayData) ? barangayData : [];
        } catch (error) {
            console.error('Error fetching barangays for', formData.region, formData.city, ':', error);
            return [];
        }
    }, [formData.region, formData.city, provinces]);

    const updateFormData = useCallback((field: string, value: string) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

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

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email.trim(),
                password: formData.password,
            });

            if (authError) {
                const isEmailDeliveryIssue =
                    authError.message?.toLowerCase().includes('confirmation email') ||
                    authError.message?.toLowerCase().includes('smtp') ||
                    authError.status === 500;

                if (isEmailDeliveryIssue) {
                    const handled = await completeLocalRegistration('email');
                    setLoading(false);
                    if (handled) {
                        return;
                    }
                }

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

            const { error: dbError } = await supabase
                .from('tbl_users')
                .insert({
                    user_id: authData.user.id,
                    email: formData.email.trim(),
                    phone: formData.phone.trim() || null,
                    password_hash: formData.password,
                    first_name: formData.firstName.trim() || null,
                    last_name: formData.lastName.trim() || null,
                    birthdate: formData.birthdate.trim() || null,
                    sex: formData.gender || null,
                    emergency_contact_name: formData.emergencyContactName.trim() || null,
                    emergency_contact_number: formData.emergencyContactNumber.trim() || null,
                    region: formData.region || null,
                    city: formData.city || null,
                    barangay: formData.barangay || null,
                });

            if (dbError) {
                console.error('Database insert error:', dbError);
                Alert.alert('Warning', 'Account created but failed to save additional information. ' + dbError.message);
            }

            await persistEmergencyContact();

            const { error: otpError } = await supabase.auth.signInWithOtp({
                email: formData.email.trim(),
                options: {
                    shouldCreateUser: false,
                },
            });

            openOtpModal(formData.email.trim());
            setLoading(false);

            if (otpError) {
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
            console.error('Registration error:', error);
            const fallbackSucceeded = await completeLocalRegistration('network');
            if (!fallbackSucceeded) {
                Alert.alert('Registration Error', error.message || 'An error occurred during registration. Please try again.');
                setErrors({ general: error.message || 'An error occurred during registration. Please try again.' });
            }
        } finally {
            setLoading(false);
        }
    }, [formData, router, validateForm, completeLocalRegistration, persistEmergencyContact]);

    const handleGoToLogin = useCallback(() => {
        // MODIFIED: Changed path to point to the new location
        // Since we are in screens, we can just replace to Login
        router.replace('/screens/Login' as any);
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
                style={styles.authContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.signUpScrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.signUpContent}>
                        <AuthHeader
                            title="Create Account"
                            subtitle="Sign up to get started with AccessPoint"
                        />

                        <View style={styles.signUpForm}>
                            <Text style={styles.authHeaderTitle}>Create Account</Text>

                            <Text style={styles.authSectionTitle}>Personal Information</Text>

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

                            <Text style={styles.authSectionTitle}>Emergency Contact</Text>

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

                            <Text style={styles.authSectionTitle}>Address Information</Text>

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

                            <Text style={styles.authSectionTitle}>Security</Text>

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
                                disabled={loading}
                            />

                            <View style={styles.authFooter}>
                                <Text style={styles.authFooterTextLight}>
                                    Already have an account?
                                </Text>
                                <TouchableOpacity onPress={handleGoToLogin}>
                                    <Text style={styles.authFooterLinkLight}>
                                        Login
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* OTP Modal */}
            <Modal
                visible={showOtpModal}
                transparent
                animationType="fade"
                onRequestClose={closeOtpModal}
            >
                <KeyboardAvoidingView
                    style={styles.otpOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.otpCard}>
                        <View style={styles.otpIcon}>
                            <Ionicons name="shield-checkmark-outline" size={48} color="#FF6B6B" />
                        </View>

                        <Text style={styles.otpTitle}>Verify Your Email</Text>
                        <Text style={styles.otpSubtitle}>We've sent a 6-digit code to</Text>
                        <Text style={styles.otpEmail}>{verificationEmail}</Text>

                        <View style={styles.otpInputContainer}>
                            <TextInput
                                ref={otpInputRef}
                                value={otpCode}
                                onChangeText={(text) => {
                                    if (/^\d*$/.test(text) && text.length <= 6) {
                                        setOtpCode(text);
                                        if (otpError) setOtpError('');
                                    }
                                }}
                                keyboardType="number-pad"
                                maxLength={6}
                                style={styles.otpHiddenInput}
                                autoFocus
                            />

                            <View style={styles.otpDisplayContainer}>
                                {[0, 1, 2, 3, 4, 5].map((index) => {
                                    const digit = otpCode[index];
                                    const isFocused = otpCode.length === index;
                                    return (
                                        <View
                                            key={index}
                                            style={[
                                                styles.otpDisplayBox,
                                                digit ? styles.otpDisplayBoxFilled : null,
                                                isFocused && !digit ? styles.otpDisplayBoxFocused : null,
                                            ]}
                                        >
                                            <Text style={styles.otpDisplayText}>
                                                {digit || ''}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {otpError ? (
                            <Text style={styles.otpError}>{otpError}</Text>
                        ) : null}

                        <View style={styles.otpActionWrapper}>
                            <PrimaryButton
                                title={otpLoading ? "Verifying..." : "Verify Code"}
                                onPress={handleVerifyOtp}
                                loading={otpLoading}
                                disabled={otpLoading || otpCode.length !== 6}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.resendButton}
                            onPress={handleResendOtp}
                            disabled={resendTimer > 0}
                        >
                            <Text style={[
                                styles.resendText,
                                resendTimer > 0 && styles.resendTextDisabled
                            ]}>
                                {resendTimer > 0
                                    ? `Resend code in ${resendTimer}s`
                                    : "Resend Code"
                                }
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelOtpButton}
                            onPress={closeOtpModal}
                        >
                            <Text style={styles.cancelOtpText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </LinearGradient>
    );
};

export default SignUp;
