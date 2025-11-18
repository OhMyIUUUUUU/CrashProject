import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import CustomTabBar from '../../components/CustomTabBar';
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
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        Alert.alert('Error', 'No user session found');
        setLoading(false);
        return;
      }

      // Fetch user data from database
      const { data: userData, error } = await supabase
        .from('tbl_users')
        .select('*')
        .eq('email', session.user.email)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
        setLoading(false);
        return;
      }

      if (userData) {
        setProfileData(userData as UserProfileData);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
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
            router.replace('/screens/AccessPoint/Login/Login');
          },
        },
      ]
    );
  };

  const InfoCard: React.FC<{ icon: string; label: string; value: string }> = ({
    icon,
    label,
    value,
  }) => (
    <View style={styles.infoCard}>
      <Ionicons name={icon as any} size={20} color="#FF6B6B" style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'N/A'}</Text>
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
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>{getInitials()}</Text>
            </View>
            <Text style={styles.profileName}>{getFullName()}</Text>
            <Text style={styles.profileEmail}>{profileData?.email || 'No email'}</Text>
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.infoSection}>
              <InfoCard icon="person-outline" label="First Name" value={profileData?.first_name || 'N/A'} />
              <InfoCard icon="person-outline" label="Last Name" value={profileData?.last_name || 'N/A'} />
              <InfoCard icon="person-outline" label="Gender" value={profileData?.sex || 'N/A'} />
              <InfoCard
                icon="calendar-outline"
                label="Birthdate"
                value={formatDate(profileData?.birthdate || null)}
              />
              <InfoCard
                icon="calendar-outline"
                label="Age"
                value={calculateAge(profileData?.birthdate || null)}
              />
              <InfoCard icon="call-outline" label="Phone" value={profileData?.phone || 'N/A'} />
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
                />
                <InfoCard
                  icon="call-outline"
                  label="Contact Number"
                  value={profileData.emergency_contact_number || 'N/A'}
                />
              </View>
            </View>
          )}

          {/* Address */}
          {(profileData?.region || profileData?.city || profileData?.barangay) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Address</Text>
              <View style={styles.infoSection}>
                <InfoCard icon="location-outline" label="Region" value={profileData?.region || 'N/A'} />
                <InfoCard icon="business-outline" label="City/Province" value={profileData?.city || 'N/A'} />
                <InfoCard icon="home-outline" label="Barangay" value={profileData?.barangay || 'N/A'} />
              </View>
            </View>
          )}

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom Navigation */}
        <CustomTabBar />
      </View>
    </LinearGradient>
  );
};

export default Profile;

