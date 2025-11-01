import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Linking, Modal, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { EmergencyContact, StorageService } from '../../utils/storage';
import { styles } from './styles';

const Home: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'report'>('home');
  const [alertSent, setAlertSent] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Load emergency contacts from storage on component mount
  useEffect(() => {
    const loadEmergencyContacts = async () => {
      try {
        const contacts = await StorageService.getEmergencyContacts();
        setEmergencyContacts(contacts);
      } catch (error) {
        console.error('Error loading emergency contacts:', error);
      }
    };

    loadEmergencyContacts();
  }, []);

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

  // Pulsing animation effect
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleTabChange = useCallback((tab: 'home' | 'profile' | 'report') => {
    setActiveTab(tab);
    if (tab === 'profile') {
      router.push('/screens/Home/Profile');
    } else if (tab === 'report') {
      router.push('/screens/Home/Report');
    }
  }, [router]);

  const handleSOSPressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleSOSPressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleCall = useCallback(async (number: string) => {
    try {
      console.log(`Opening phone dialer with: ${number}`);
      await Linking.openURL(`tel:${number}`);
      console.log('Phone dialer opened successfully');
    } catch (error) {
      console.error('Error opening phone dialer:', error);
      Alert.alert('Error', 'Failed to open phone dialer');
    }
  }, []);

  const handleMessage = useCallback(async (number: string) => {
    try {
      const predefinedMessage = 'Emergency! I need help. Please call me back immediately.';
      const canSMS = await Linking.canOpenURL(`sms:${number}`);
      if (canSMS) {
        await Linking.openURL(`sms:${number}?body=${encodeURIComponent(predefinedMessage)}`);
      } else {
        Alert.alert('Error', 'Unable to send SMS on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open SMS app');
    }
  }, []);

  const handleAddContact = useCallback(() => {
    setShowAddContactModal(true);
    setContactName('');
    setContactNumber('');
  }, []);

  const handleSaveContact = useCallback(async () => {
    if (!contactName.trim() || !contactNumber.trim()) {
      Alert.alert('Error', 'Please fill in both name and number');
      return;
    }
    
    try {
      // Add contact to the emergency contacts list
      const newContact: EmergencyContact = {
        id: Date.now().toString(),
        name: contactName.trim(),
        number: contactNumber.trim()
      };
      
      // Save to local storage
      await StorageService.addEmergencyContact(newContact);
      
      // Update local state
      setEmergencyContacts(prev => [...prev, newContact]);
      
      console.log('Saving contact:', newContact);
      Alert.alert('Success', 'Emergency contact added successfully!');
      setShowAddContactModal(false);
      setContactName('');
      setContactNumber('');
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to save emergency contact');
    }
  }, [contactName, contactNumber]);

  const handleCancelAddContact = useCallback(() => {
    setShowAddContactModal(false);
    setContactName('');
    setContactNumber('');
  }, []);

  const handleDeleteContact = useCallback((contactId: string) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from local storage
              await StorageService.deleteEmergencyContact(contactId);
              
              // Update local state
              setEmergencyContacts(prev => prev.filter(contact => contact.id !== contactId));
            } catch (error) {
              console.error('Error deleting contact:', error);
              Alert.alert('Error', 'Failed to delete emergency contact');
            }
          }
        }
      ]
    );
  }, []);

  const handleSOSPress = useCallback(async () => {
    try {
      console.log('Opening phone dialer with 911...');
      await Linking.openURL('tel:911');
      console.log('Phone dialer opened successfully');
    } catch (error) {
      console.error('Error opening phone dialer:', error);
      Alert.alert('Error', 'Failed to open phone dialer');
    }
  }, []);


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName}>{user?.firstName || 'User'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={28} color="#1a1a1a" />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome to AccessPoint</Text>
          <Text style={styles.welcomeSubtitle}>
            Your safety and emergency response system
          </Text>
        </View>

        <View style={styles.sosContainer}>
          <Animated.View
            style={[
              styles.sosButtonWrapper,
              {
                transform: [
                  { scale: Animated.multiply(pulseAnim, scaleAnim) }
                ],
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleSOSPress}
              onPressIn={handleSOSPressIn}
              onPressOut={handleSOSPressOut}
              activeOpacity={1}
              style={styles.sosButton}
            >
              <View style={styles.sosButtonInner}>
                <Text style={styles.sosText}>SOS</Text>
                <Text style={styles.sosSubtext}>Press & hold</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            <TouchableOpacity 
              style={styles.addContactButton}
              onPress={handleAddContact}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color="#ff6b6b" />
              <Text style={styles.addContactButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          {/* Emergency Contacts List */}
          {emergencyContacts.length > 0 ? (
            emergencyContacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactHeader}>
                  <Ionicons name="person" size={20} color="#ff6b6b" />
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteContact(contact.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ff3b30" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.contactNumber}>{contact.number}</Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.callButton}
                    onPress={() => handleCall(contact.number)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call" size={16} color="#fff" />
                    <Text style={styles.callButtonText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.messageButton}
                    onPress={() => handleMessage(contact.number)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble" size={16} color="#fff" />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noContactCard}>
              <Ionicons name="person-add" size={32} color="#8e8e93" />
              <Text style={styles.noContactText}>No emergency contacts</Text>
              <Text style={styles.noContactSubtext}>Tap "Add" to add your first emergency contact</Text>
            </View>
          )}
        </View>
      </ScrollView>

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

      {/* Alert Sent Confirmation Modal */}
      <Modal
        visible={alertSent}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#34C759" />
            <Text style={styles.confirmationTitle}>Alert Sent!</Text>
            <Text style={styles.confirmationSubtitle}>Emergency services have been notified</Text>
          </View>
        </View>
      </Modal>

      {/* Add Contact Modal */}
      <Modal
        visible={showAddContactModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addContactModalContainer}>
            <View style={styles.addContactModalHeader}>
              <Text style={styles.addContactModalTitle}>Add Emergency Contact</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleCancelAddContact}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#8e8e93" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.addContactForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Contact Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="Enter contact name"
                  placeholderTextColor="#8e8e93"
                  autoCapitalize="words"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  placeholder="Enter phone number"
                  placeholderTextColor="#8e8e93"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            
            <View style={styles.addContactModalActions}>
              <TouchableOpacity 
                style={styles.cancelModalButton}
                onPress={handleCancelAddContact}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveContactButton}
                onPress={handleSaveContact}
                activeOpacity={0.7}
              >
                <Text style={styles.saveContactButtonText}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Home;
