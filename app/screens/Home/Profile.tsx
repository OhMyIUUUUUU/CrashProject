import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StorageService } from '../../../utils/storage';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveCase } from '../../hooks/useActiveCase';
import { supabase } from '../../lib/supabase';
import { FloatingChatHead } from '../AccessPoint/components/Chatsystem/FloatingChatHead';
import CustomTabBar from '../AccessPoint/components/Customtabbar/CustomTabBar';
import { styles } from './styles';

interface UserProfileData {
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  birthdate: string | null;
  sex: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  region: string | null;
  city: string | null;
  barangay: string | null;
  created_at: string | null;
}

const Profile: React.FC = () => {
  const router = useRouter();
  const { user, logout, loadUser } = useAuth();
  const { activeCase } = useActiveCase();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [editedProfileData, setEditedProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);

  // Monitor network connectivity - redirect to offline mode if connection is lost
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      if (!isConnected) {
        router.replace('/screens/AccessPoint/components/OfflineEmergency/OfflineEmergency');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    // Ensure user is loaded from AuthContext first
    const loadProfile = async () => {
      // Load user from local storage if not already loaded
      if (!user) {
        await loadUser();
      }
      await fetchUserProfile();
    };
    loadProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      let authUserId = session?.user?.id || null;
      let userEmail = session?.user?.email || null;
      
      // Fallback to local storage if Supabase session is not available
      if (!authUserId && !userEmail) {
        console.log('⚠️ No Supabase session, checking local storage...');
        
        // Try to get user from AuthContext
        let localUser = user;
        
        // If not in context, try to load it directly from storage
        if (!localUser) {
          const storedUser = await StorageService.getUserSession();
          if (storedUser) {
            localUser = storedUser;
            console.log('✅ Loaded user from storage directly');
          }
        }
        
        if (localUser?.email) {
          userEmail = localUser.email;
          console.log('✅ Found email from local storage:', userEmail);
        }
      }
      
      if (!authUserId && !userEmail) {
        console.error('No user session found - no user_id or email');
        Alert.alert('Error', 'No user session found. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching profile - user_id:', authUserId, 'email:', userEmail);

      // Try to fetch by user_id first (more reliable)
      let userData = null;
      let networkError = false;

      try {
        if (authUserId) {
          const { data, error: userError } = await supabase
            .from('tbl_users')
            .select('*')
            .eq('user_id', authUserId)
            .single();
          
          if (data && !userError) {
            userData = data;
            console.log('✅ Found user by user_id');
          } else if (userError) {
            // Check if it's a network error
            const errorMsg = userError?.message || String(userError) || '';
            if (errorMsg.toLowerCase().includes('network') || 
                errorMsg.toLowerCase().includes('fetch') ||
                errorMsg.toLowerCase().includes('failed')) {
              networkError = true;
              console.warn('⚠️ Network error fetching by user_id, trying email...');
            } else {
              console.log('⚠️ Not found by user_id, trying email...', userError?.message);
            }
          }
        }

        // If not found by user_id, try by email
        if (!userData && userEmail && !networkError) {
          try {
            const { data, error: emailError } = await supabase
              .from('tbl_users')
              .select('*')
              .eq('email', userEmail)
              .single();

            if (data && !emailError) {
              userData = data;
              console.log('✅ Found user by email');
            } else if (emailError) {
              const errorMsg = emailError?.message || String(emailError) || '';
              if (errorMsg.toLowerCase().includes('network') || 
                  errorMsg.toLowerCase().includes('fetch') ||
                  errorMsg.toLowerCase().includes('failed')) {
                networkError = true;
                console.warn('⚠️ Network error fetching by email');
              } else {
                console.error('❌ Not found by email either:', emailError?.message);
              }
            }
          } catch (emailFetchError: any) {
            const errorMsg = emailFetchError?.message || String(emailFetchError) || '';
            if (errorMsg.toLowerCase().includes('network') || 
                errorMsg.toLowerCase().includes('fetch') ||
                errorMsg.toLowerCase().includes('failed')) {
              networkError = true;
              console.warn('⚠️ Network error when fetching by email');
            }
          }
        }
      } catch (fetchError: any) {
        const errorMsg = fetchError?.message || String(fetchError) || '';
        if (errorMsg.toLowerCase().includes('network') || 
            errorMsg.toLowerCase().includes('fetch') ||
            errorMsg.toLowerCase().includes('failed')) {
          networkError = true;
          console.warn('⚠️ Network error when fetching profile');
        }
      }

      // If network error, try to use local storage data
      if (networkError && !userData) {
        console.log('⚠️ Network error detected, using local storage data');
        const localUser = user || await StorageService.getUserSession();
        if (localUser) {
          // Convert local UserData to UserProfileData format
          const localProfileData: UserProfileData = {
            user_id: '',
            email: localUser.email || '',
            phone: localUser.phone || '',
            first_name: localUser.firstName || '',
            last_name: localUser.lastName || '',
            sex: localUser.gender || '',
            birthdate: localUser.birthdate || '',
            emergency_contact_name: localUser.emergencyContactName || '',
            emergency_contact_number: localUser.emergencyContactNumber || '',
            region: localUser.region || '',
            city: localUser.city || '',
            barangay: localUser.barangay || '',
          };
          setProfileData(localProfileData);
          setEditedProfileData(localProfileData);
          console.log('✅ Using local storage profile data');
          return;
        }
      }

      if (userData) {
        console.log('✅ Profile data loaded successfully');
        setProfileData(userData as UserProfileData);
        setEditedProfileData(userData as UserProfileData);
      } else if (!networkError) {
        console.error('❌ No user data found');
        // Only show error if it's not a network error (network errors already handled above)
        Alert.alert('Error', 'User profile not found. Please contact support.');
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', `Failed to load profile data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (!profileData) return 'U';
    const first = profileData.first_name?.[0] || '';
    const last = profileData.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getFullName = () => {
    if (!profileData) return 'User';
    return `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'User';
  };

  const calculateAge = (birthdate: string | null) => {
    if (!birthdate) return 'N/A';
    try {
      const today = new Date();
      const birth = new Date(birthdate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age.toString();
    } catch {
      return 'N/A';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/screens/AccessPoint/components/Login/Login');
          },
        },
      ]
    );
  };


  const handleFieldChange = (field: keyof UserProfileData, value: string) => {
    setEditedProfileData(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleEditToggle = () => {
    if (!profileData) return;
    setEditedProfileData(profileData);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedProfileData(profileData);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!editedProfileData || !profileData) return;

    setSavingChanges(true);
    try {
      // Email is read-only - use original email from profileData
      const updatePayload = {
        first_name: editedProfileData.first_name,
        last_name: editedProfileData.last_name,
        sex: editedProfileData.sex,
        birthdate: editedProfileData.birthdate,
        phone: editedProfileData.phone,
        emergency_contact_name: editedProfileData.emergency_contact_name,
        emergency_contact_number: editedProfileData.emergency_contact_number,
        region: editedProfileData.region,
        city: editedProfileData.city,
        barangay: editedProfileData.barangay,
      };

      // Use original email for the query - email cannot be changed
      const { error } = await supabase
        .from('tbl_users')
        .update(updatePayload)
        .eq('email', profileData.email);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to save changes');
        return;
      }

      // Sync updated data to local storage
      if (user) {
        const updatedUserData = {
          ...user,
          // Keep original email - email cannot be changed
          email: profileData.email,
          phone: editedProfileData.phone || '',
          firstName: editedProfileData.first_name || '',
          lastName: editedProfileData.last_name || '',
          gender: editedProfileData.sex || '',
          birthdate: editedProfileData.birthdate || '',
          emergencyContactName: editedProfileData.emergency_contact_name || '',
          emergencyContactNumber: editedProfileData.emergency_contact_number || '',
          region: editedProfileData.region || '',
          city: editedProfileData.city || '',
          barangay: editedProfileData.barangay || '',
        };
        await StorageService.saveUserSession(updatedUserData);
        console.log('✅ Profile synced to local storage');
      }

      // Update profile data but keep original email
      setProfileData(prev => prev ? { ...prev, ...updatePayload, email: prev.email } : prev);
      await loadUser();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'An unexpected error occurred while saving changes');
    } finally {
      setSavingChanges(false);
    }
  };

  const InfoCard: React.FC<{
    icon: string;
    label: string;
    value: string;
    editableField?: keyof UserProfileData;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  }> = ({
    icon,
    label,
    value,
    editableField,
    keyboardType = 'default',
  }) => (
    <View style={styles.infoCard}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon as any} size={22} color="#FF6B6B" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        {isEditing && editableField ? (
          <TextInput
            style={styles.infoInput}
            value={(editedProfileData?.[editableField] ?? '') as string}
            onChangeText={text => handleFieldChange(editableField, text)}
            placeholder={`Enter ${label}`}
            placeholderTextColor="#999"
            keyboardType={keyboardType}
          />
        ) : (
          <Text style={styles.infoValue}>{value || 'N/A'}</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={['#FF6B6B', '#FF8787', '#FFA8A8']}
        style={styles.gradientContainer}
      >
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: '#fff', fontSize: 16, marginTop: 16 }}>Loading profile...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Show error state if profile data is null after loading
  if (!profileData) {
    return (
      <LinearGradient
        colors={['#FF6B6B', '#FF8787', '#FFA8A8']}
        style={styles.gradientContainer}
      >
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
          <Ionicons name="alert-circle-outline" size={64} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
            Profile Not Found
          </Text>
          <Text style={{ color: '#fff', fontSize: 14, marginTop: 8, textAlign: 'center', opacity: 0.9 }}>
            Unable to load your profile data. Please try again.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#fff',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 24,
            }}
            onPress={fetchUserProfile}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#FF6B6B', fontSize: 16, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
        <CustomTabBar />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FF6B6B', '#FF8787', '#FFA8A8']}
      style={styles.gradientContainer}
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatarContainer}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{getInitials()}</Text>
              </View>
              <View style={styles.avatarBadge}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            </View>
            <Text style={styles.profileName}>{getFullName()}</Text>
            {/* Email is read-only - cannot be edited */}
            <Text style={styles.profileEmail}>{profileData?.email || 'No email'}</Text>
          </View>

          {isEditing && (
            <View style={styles.editActionRow}>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton]}
                onPress={handleCancelEdit}
                activeOpacity={0.8}
              >
                <Text style={styles.editButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, styles.saveButton]}
                onPress={handleSaveProfile}
                activeOpacity={0.8}
                disabled={savingChanges}
              >
                {savingChanges ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.editButtonText, { color: '#fff' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Personal Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <TouchableOpacity
                style={styles.editIconButton}
                onPress={isEditing ? handleCancelEdit : handleEditToggle}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isEditing ? 'close-circle' : 'create-outline'}
                  size={22}
                  color="#FF6B6B"
                />
              </TouchableOpacity>
            </View>
            <View style={styles.infoSection}>
              <InfoCard icon="person-outline" label="First Name" value={profileData?.first_name || 'N/A'} editableField="first_name" />
              <InfoCard icon="person-outline" label="Last Name" value={profileData?.last_name || 'N/A'} editableField="last_name" />
              <InfoCard icon="male-female-outline" label="Gender" value={profileData?.sex || 'N/A'} editableField="sex" />
              <InfoCard
                icon="calendar-outline"
                label="Birthdate"
                value={formatDate(profileData?.birthdate || null)}
                editableField="birthdate"
              />
              <InfoCard
                icon="calendar-outline"
                label="Age"
                value={calculateAge(profileData?.birthdate || null)}
              />
              <InfoCard icon="call-outline" label="Phone" value={profileData?.phone || 'N/A'} editableField="phone" keyboardType="phone-pad" />
              {profileData?.created_at && (
                <InfoCard
                  icon="time-outline"
                  label="Member Since"
                  value={formatDate(profileData.created_at)}
                />
              )}
            </View>
          </View>

          {/* Emergency Contact */}
          {(profileData?.emergency_contact_name || profileData?.emergency_contact_number) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              <View style={styles.infoSection}>
                <InfoCard
                  icon="person-circle-outline"
                  label="Contact Name"
                  value={profileData.emergency_contact_name || 'N/A'}
                  editableField="emergency_contact_name"
                />
                <InfoCard
                  icon="call-outline"
                  label="Contact Number"
                  value={profileData.emergency_contact_number || 'N/A'}
                  editableField="emergency_contact_number"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          )}

          {/* Address */}
          {(profileData?.region || profileData?.city || profileData?.barangay) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Address</Text>
              <View style={styles.infoSection}>
                <InfoCard icon="location-outline" label="Region" value={profileData?.region || 'N/A'} editableField="region" />
                <InfoCard icon="business-outline" label="City/Province" value={profileData?.city || 'N/A'} editableField="city" />
                <InfoCard icon="home-outline" label="Barangay" value={profileData?.barangay || 'N/A'} editableField="barangay" />
              </View>
            </View>
          )}

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={22} color="#fff" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom Navigation */}
        <CustomTabBar />

        {/* Floating Chat Head - Only show when active case exists */}
        {activeCase && (
          <FloatingChatHead
            onPress={() => {
              router.push({
                pathname: '/screens/Home/ChatScreen',
                params: { report_id: activeCase.report_id },
              });
            }}
            unreadCount={0} // TODO: Calculate unread count from messages
          />
        )}
      </View>
    </LinearGradient>
  );
};

export default Profile;

