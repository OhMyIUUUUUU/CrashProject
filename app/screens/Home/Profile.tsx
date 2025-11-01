import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import LoaderOverlay from '../AccessPoint/components/LoaderOverlay/LoaderOverlay';
import { styles } from './styles';

const Profile: React.FC = () => {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'report'>('profile');

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

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await logout();
            setLoading(false);
            router.replace('/screens/AccessPoint/Login/Login');
          },
        },
      ]
    );
  }, [logout, router]);

  const handleTabChange = useCallback((tab: 'home' | 'profile' | 'report') => {
    setActiveTab(tab);
    if (tab === 'home') {
      router.push('/screens/Home/Home');
    } else if (tab === 'report') {
      router.push('/screens/Home/Report');
    }
  }, [router]);

  const handleChangeProfilePicture = useCallback(async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to change your profile picture.'
        );
        return;
      }

      // Show options to take photo or choose from library
      Alert.alert(
        'Change Profile Picture',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
              if (cameraPermission.status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant camera permissions.');
                return;
              }
              
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
              });

              if (!result.canceled && result.assets[0]) {
                setLoading(true);
                const updatedUser = { ...user!, profilePicture: result.assets[0].uri };
                await updateUser(updatedUser);
                setLoading(false);
              }
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
              });

              if (!result.canceled && result.assets[0]) {
                setLoading(true);
                const updatedUser = { ...user!, profilePicture: result.assets[0].uri };
                await updateUser(updatedUser);
                setLoading(false);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error changing profile picture:', error);
      Alert.alert('Error', 'Failed to change profile picture. Please try again.');
    }
  }, [user, updateUser]);

  const InfoRow = useCallback(({ label, value, icon }: { label: string; value: string; icon: string }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon as any} size={20} color="#ff6b6b" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {user?.profilePicture ? (
                <Image 
                  source={{ uri: user.profilePicture }} 
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={handleChangeProfilePicture}
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Email" value={user?.email || 'N/A'} icon="mail-outline" />
            <InfoRow label="Phone" value={user?.phone || 'N/A'} icon="call-outline" />
            <InfoRow label="Gender" value={user?.gender || 'N/A'} icon="person-outline" />
            <InfoRow label="Age" value={user?.age || 'N/A'} icon="calendar-outline" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <View style={styles.infoCard}>
            <InfoRow 
              label="Contact Name" 
              value={user?.emergencyContactName || 'N/A'} 
              icon="person-add-outline" 
            />
            <InfoRow 
              label="Contact Number" 
              value={user?.emergencyContactNumber || 'N/A'} 
              icon="call-outline" 
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Region" value={user?.region || 'N/A'} icon="location-outline" />
            <InfoRow label="City" value={user?.city || 'N/A'} icon="location-outline" />
            <InfoRow label="Barangay" value={user?.barangay || 'N/A'} icon="location-outline" />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.tabBarContainer}>
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => handleTabChange('home')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="home-outline" 
            size={22} 
            color="#8e8e93" 
          />
          <Text style={styles.tabLabel}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => handleTabChange('report')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="document-text-outline" 
            size={22} 
            color="#8e8e93" 
          />
          <Text style={styles.tabLabel}>
            Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
          onPress={() => handleTabChange('profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.tabContent, activeTab === 'profile' && styles.tabContentActive]}>
            <Ionicons 
              name="person-outline" 
              size={22} 
              color={activeTab === 'profile' ? '#ff6b6b' : '#8e8e93'} 
            />
            <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
              Profile
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <LoaderOverlay visible={loading} message="Logging out..." />
    </SafeAreaView>
  );
};

export default Profile;
