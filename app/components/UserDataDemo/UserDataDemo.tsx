import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { styles } from './styles';

// Storage key for user data
const STORAGE_KEY = '@user_data_demo';

// Interface for user data
interface UserData {
  name: string;
  email: string;
  phone: string;
  age: string;
  address: string;
}

const UserDataDemo: React.FC = () => {
  const [userData, setUserData] = useState<UserData>({
    name: '',
    email: '',
    phone: '',
    age: '',
    address: '',
  });

  const [displayData, setDisplayData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from AsyncStorage when component mounts
  useEffect(() => {
    loadStoredData();
  }, []);

  // Load data from AsyncStorage
  const loadStoredData = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (storedData) {
        const parsedData: UserData = JSON.parse(storedData);
        setDisplayData(parsedData);
        setUserData(parsedData); // Pre-fill form with stored data
        console.log('Data loaded from AsyncStorage:', parsedData);
      } else {
        console.log('No stored data found');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load stored data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save data to AsyncStorage
  const saveData = useCallback(async () => {
    // Basic validation
    if (!userData.name.trim() || !userData.email.trim()) {
      Alert.alert('Validation Error', 'Please fill in at least Name and Email');
      return;
    }

    try {
      setLoading(true);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      setDisplayData(userData);
      Alert.alert('Success', 'Data saved successfully!');
      console.log('Data saved to AsyncStorage:', userData);
    } catch (error) {
      console.error('Error saving data:', error);
      Alert.alert('Error', 'Failed to save data');
    } finally {
      setLoading(false);
    }
  }, [userData]);

  // Update a specific field
  const updateField = useCallback((field: keyof UserData, value: string) => {
    setUserData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Clear all stored data
  const clearData = useCallback(async () => {
    try {
      setLoading(true);
      await AsyncStorage.removeItem(STORAGE_KEY);
      setDisplayData(null);
      setUserData({
        name: '',
        email: '',
        phone: '',
        age: '',
        address: '',
      });
      Alert.alert('Success', 'Data cleared successfully!');
      console.log('Data cleared from AsyncStorage');
    } catch (error) {
      console.error('Error clearing data:', error);
      Alert.alert('Error', 'Failed to clear data');
    } finally {
      setLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#FF6B6B', '#FF8787', '#FFA8A8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientContainer}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </LinearGradient>
    );
  }

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
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="person-circle-outline" size={48} color="#FF6B6B" />
              <Text style={styles.headerTitle}>User Data Manager</Text>
              <Text style={styles.headerSubtitle}>
                Save and persist user data locally
              </Text>
            </View>

            {/* Input Form */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Enter User Information</Text>
              
              <View style={styles.inputGroup}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={userData.name}
                  onChangeText={(value) => updateField('name', value)}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={userData.email}
                  onChangeText={(value) => updateField('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  value={userData.phone}
                  onChangeText={(value) => updateField('phone', value)}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="calendar-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Age"
                  value={userData.age}
                  onChangeText={(value) => updateField('age', value)}
                  keyboardType="number-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Address"
                  value={userData.address}
                  onChangeText={(value) => updateField('address', value)}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={saveData}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="save-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>
                    {loading ? 'Saving...' : 'Save Data'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.clearButton]}
                  onPress={clearData}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Display Stored Data */}
            <View style={styles.displaySection}>
              <View style={styles.displayHeader}>
                <Ionicons name="document-text-outline" size={24} color="#333" />
                <Text style={styles.sectionTitle}>Stored Data</Text>
              </View>

              {displayData ? (
                <View style={styles.dataCard}>
                  <DataRow label="Name" value={displayData.name} icon="person" />
                  <DataRow label="Email" value={displayData.email} icon="mail" />
                  <DataRow label="Phone" value={displayData.phone} icon="call" />
                  <DataRow label="Age" value={displayData.age} icon="calendar" />
                  <DataRow label="Address" value={displayData.address} icon="location" />
                  
                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>
                      This data persists even after closing the app
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="document-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No data stored yet</Text>
                  <Text style={styles.emptySubtext}>
                    Fill in the form above and click "Save Data"
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

// Helper component for displaying data rows
const DataRow: React.FC<{ label: string; value: string; icon: string }> = ({ 
  label, 
  value, 
  icon 
}) => (
  <View style={styles.dataRow}>
    <View style={styles.dataRowLeft}>
      <Ionicons name={`${icon}-outline` as any} size={18} color="#FF6B6B" />
      <Text style={styles.dataLabel}>{label}:</Text>
    </View>
    <Text style={styles.dataValue}>{value || 'N/A'}</Text>
  </View>
);

export default UserDataDemo;

