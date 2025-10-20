import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
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
    { id: 'fire', label: 'Fire', icon: 'flame', color: '#ff9500' },
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
              setDescription('');
              setLocation('');
            },
          },
        ]
      );
    }, 1500);
  }, [reportType, description]);

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
          <Ionicons name="checkmark-circle" size={isSmallDevice ? 18 : 20} color="#007AFF" />
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
          <Text style={styles.sectionTitle}>Location (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter location or address"
            placeholderTextColor="#999"
            value={location}
            onChangeText={setLocation}
          />
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
            color={activeTab === 'home' ? '#007AFF' : '#8e8e93'} 
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
            color={activeTab === 'report' ? '#007AFF' : '#8e8e93'} 
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
            color={activeTab === 'profile' ? '#007AFF' : '#8e8e93'} 
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
