import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ExpoLocation from 'expo-location';
import LoaderOverlay from '../AccessPoint/components/LoaderOverlay/LoaderOverlay';
import PrimaryButton from '../AccessPoint/components/PrimaryButton/PrimaryButton';
import { styles } from './styles';

const { width: screenWidth } = Dimensions.get('window');
const isSmallDevice = screenWidth < 375;
const isLargeDevice = screenWidth >= 768;
const iconSize = isSmallDevice ? 20 : isLargeDevice ? 32 : 28;

const Report: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'report'>('report');
  const [reportType, setReportType] = useState('');
  const [reportRole, setReportRole] = useState<'witness' | 'victim' | ''>('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [attachments, setAttachments] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [fetchingLocation, setFetchingLocation] = useState(false);
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

  const handleTabChange = useCallback((tab: 'home' | 'profile' | 'report') => {
    setActiveTab(tab);
    if (tab === 'home') {
      router.push('/screens/Home/Home');
    } else if (tab === 'profile') {
      router.push('/screens/Home/Profile');
    }
  }, [router]);

  const reportTypes = [
    { id: 'emergency', label: 'Emergency', icon: 'warning', color: '#ff3b30' },
    { id: 'medical', label: 'Medical', icon: 'medkit', color: '#34C759' },
    { id: 'fire', label: 'Fire', icon: 'flame', color: '#ff6b6b' },
    { id: 'crime', label: 'Crime', icon: 'alert-circle', color: '#5856d6' },
    { id: 'accident', label: 'Accident', icon: 'car', color: '#ff2d55' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#8e8e93' },
  ];

  const handleSubmitReport = useCallback(async () => {
    if (!reportType) {
      Alert.alert('Error', 'Please select a report type');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description');
      return;
    }

    setLoading(true);
    
    // Simulate report submission
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Success',
        'Your report has been submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              setReportType('');
              setReportRole('');
              setDescription('');
              setLocation('');
              setAttachments([]);
            },
          },
        ]
      );
    }, 1500);
  }, [reportType, description]);

  const requestMediaPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your media library to attach files.');
      return false;
    }
    return true;
  }, []);

  const pickFile = useCallback(async () => {
    const ok = await requestMediaPermission();
    if (!ok) return;
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        allowsMultipleSelection: true,
        videoMaxDuration: 0, // No limit on video duration
        allowsEditing: false,
      });
      
      if (!result.canceled && result.assets?.length) {
        const newAttachments = result.assets.map(asset => {
          // Better video detection - check multiple properties
          const isVideo = 
            asset.type === 'video' || 
            (asset.mimeType && asset.mimeType.toLowerCase().includes('video')) ||
            (asset.uri && asset.uri.toLowerCase().includes('.mp4')) ||
            (asset.uri && asset.uri.toLowerCase().includes('.mov')) ||
            (asset.uri && asset.uri.toLowerCase().includes('.avi')) ||
            (asset.filename && (
              asset.filename.toLowerCase().endsWith('.mp4') ||
              asset.filename.toLowerCase().endsWith('.mov') ||
              asset.filename.toLowerCase().endsWith('.avi') ||
              asset.filename.toLowerCase().endsWith('.mkv')
            ));
          return { uri: asset.uri, type: isVideo ? 'video' : 'image' };
        });
        setAttachments(prev => [...prev, ...newAttachments]);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  }, [requestMediaPermission]);

  const removeAttachment = useCallback((uri: string) => {
    setAttachments(prev => prev.filter(a => a.uri !== uri));
  }, []);

  const autofillLocation = useCallback(async () => {
    if (fetchingLocation) return;
    try {
      setFetchingLocation(true);
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed to auto-fill your location.');
        return;
      }
      const position = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const places = await ExpoLocation.reverseGeocodeAsync({ latitude, longitude });
      if (places && places.length > 0) {
        const p = places[0];
        const parts = [p.name, p.street, p.district, p.city, p.region, p.postalCode, p.country]
          .filter(Boolean)
          .join(', ');
        setLocation(parts || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      } else {
        setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      }
    } catch (e) {
      setLocation('');
      Alert.alert('Error', 'Failed to get current location.');
    } finally {
      setFetchingLocation(false);
    }
  }, [fetchingLocation]);

  const ReportTypeCard = useCallback(({ type }: { type: typeof reportTypes[0] }) => (
    <TouchableOpacity
      key={type.id}
      style={[
        styles.reportTypeCard,
        reportType === type.id && styles.reportTypeCardActive,
      ]}
      onPress={() => setReportType(type.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.reportTypeIcon, { backgroundColor: type.color + '20' }]}>
        <Ionicons name={type.icon as any} size={iconSize} color={type.color} />
      </View>
      <Text style={styles.reportTypeLabel} numberOfLines={2}>{type.label}</Text>
      {reportType === type.id && (
        <View style={styles.checkmark}>
          <Ionicons name="checkmark-circle" size={isSmallDevice ? 18 : 20} color="#ff6b6b" />
        </View>
      )}
    </TouchableOpacity>
  ), [reportType]);

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
        <Text style={styles.headerTitle}>Report Incident</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={{ paddingBottom: isSmallDevice ? 15 : 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Report Type</Text>
          <View style={styles.reportTypesGrid}>
            {reportTypes.map((type) => (
              <ReportTypeCard key={type.id} type={type} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reporter Role</Text>
          <View style={styles.roleToggleContainer}>
            <TouchableOpacity
              style={[styles.roleButton, reportRole === 'witness' && styles.roleButtonActive]}
              onPress={() => setReportRole('witness')}
              activeOpacity={0.7}
            >
              <Text style={[styles.roleButtonText, reportRole === 'witness' && styles.roleButtonTextActive]}>Witness</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, reportRole === 'victim' && styles.roleButtonActive]}
              onPress={() => setReportRole('victim')}
              activeOpacity={0.7}
            >
              <Text style={[styles.roleButtonText, reportRole === 'victim' && styles.roleButtonTextActive]}>Victim</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the incident in detail..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={isSmallDevice ? 4 : isLargeDevice ? 8 : 6}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Location"
            placeholderTextColor="#999"
            value={location}
            onChangeText={setLocation}
            onFocus={autofillLocation}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attachments (Optional)</Text>
          <View style={styles.attachButtonsRow}>
            <TouchableOpacity style={styles.attachButton} onPress={pickFile} activeOpacity={0.7}>
              <Ionicons name="attach" size={18} color="#ff6b6b" />
              <Text style={styles.attachButtonText}>Image/Video</Text>
            </TouchableOpacity>
          </View>
          {attachments.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachPreviewRow}>
              {attachments.map(a => (
                <View key={a.uri} style={styles.attachItem}>
                  {a.type === 'image' ? (
                    <View style={styles.attachThumbWrap}>
                      <Image source={{ uri: a.uri }} style={styles.attachThumb} />
                    </View>
                  ) : (
                    <View style={[styles.attachThumbWrap, styles.videoThumb]}>
                      <Ionicons name="videocam" size={22} color="#fff" />
                    </View>
                  )}
                  <TouchableOpacity style={styles.attachRemove} onPress={() => removeAttachment(a.uri)}>
                    <Ionicons name="close-circle" size={18} color="#ff3b30" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <PrimaryButton
            title="Submit Report"
            onPress={handleSubmitReport}
            loading={loading}
          />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => handleTabChange('home')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={activeTab === 'home' ? 'home' : 'home-outline'} 
            size={24} 
            color={activeTab === 'home' ? '#ff6b6b' : '#8e8e93'} 
          />
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => handleTabChange('report')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={activeTab === 'report' ? 'document-text' : 'document-text-outline'} 
            size={24} 
            color={activeTab === 'report' ? '#ff6b6b' : '#8e8e93'} 
          />
          <Text style={[styles.tabLabel, activeTab === 'report' && styles.tabLabelActive]}>
            Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => handleTabChange('profile')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={activeTab === 'profile' ? 'person' : 'person-outline'} 
            size={24} 
            color={activeTab === 'profile' ? '#ff6b6b' : '#8e8e93'} 
          />
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      <LoaderOverlay visible={loading} message="Submitting report..." />
    </SafeAreaView>
  );
};

export default Report;
