import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import CustomTabBar from '../../components/CustomTabBar';
import { styles } from './styles';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email: string;
}

const { width: screenWidth } = Dimensions.get('window');
const sosButtonSize = Math.min(screenWidth * 0.5, 200);

const Home: React.FC = () => {
  const router = useRouter();
  const { user, loadUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation refs for ripple effect
  const ripple1 = useRef(new Animated.Value(1)).current;
  const ripple2 = useRef(new Animated.Value(1)).current;
  const ripple3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Load user data if not already loaded
    const loadUserData = async () => {
      if (!user) {
        await loadUser();
        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      setIsLoading(false);
    };
    
    loadUserData();
    // Load recent activity from storage if needed
    // For now, it will show "No recent activity"
  }, [user, loadUser]);

  useEffect(() => {
    // Initialize with primary emergency contact if available
    if (user?.emergencyContactName && user?.emergencyContactNumber) {
      const primaryContact: EmergencyContact = {
        id: 'primary',
        name: user.emergencyContactName,
        phone: user.emergencyContactNumber,
        email: user.email || '',
      };
      setEmergencyContacts([primaryContact]);
    }
  }, [user]);

  // Ripple animation effect
  useEffect(() => {
    const createRipple = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1.5,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const ripple1Anim = createRipple(ripple1, 0);
    const ripple2Anim = createRipple(ripple2, 400);
    const ripple3Anim = createRipple(ripple3, 800);

    ripple1Anim.start();
    ripple2Anim.start();
    ripple3Anim.start();

    return () => {
      ripple1Anim.stop();
      ripple2Anim.stop();
      ripple3Anim.stop();
    };
  }, [ripple1, ripple2, ripple3]);

  const handleSOS = () => {
    // Navigate to report screen with emergency type
    router.push({
      pathname: '/screens/Home/Report',
      params: { type: 'emergency' },
    });
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleMessage = (phoneNumber: string) => {
    Linking.openURL(`sms:${phoneNumber}`);
  };

  const handleAddContact = () => {
    setShowAddModal(true);
  };

  const handleSaveContact = () => {
    if (!newContactName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (!newContactPhone.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      email: newContactEmail.trim(),
    };
    
    setEmergencyContacts([...emergencyContacts, newContact]);
    
    // Reset form
    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
    setShowAddModal(false);
    
    // Scroll to bottom after a short delay to ensure the new contact is rendered
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleCancelAdd = () => {
    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
    setShowAddModal(false);
  };

  const handleUpdateContact = (id: string, field: 'name' | 'phone' | 'email', value: string) => {
    setEmergencyContacts(emergencyContacts.map(contact => 
      contact.id === id ? { ...contact, [field]: value } : contact
    ));
  };

  const handleDeleteContact = (id: string) => {
    if (id === 'primary') {
      // Don't allow deleting primary contact
      return;
    }
    setEmergencyContacts(emergencyContacts.filter(contact => contact.id !== id));
  };

  const getInitials = () => {
    if (!user) return 'U';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  // Show loading only briefly, then render even if user data is incomplete
  if (isLoading) {
    return (
      <View style={styles.gradientContainer}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#FF6B6B', fontSize: 16 }}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.gradientContainer}>
        <View style={styles.container}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeHeader}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeTitle}>
                  Welcome{user?.firstName ? `, ${user.firstName}` : ''}!
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  Your Emergency Response System
                </Text>
              </View>
            </View>
          </View>

          {/* SOS Button */}
          <View style={[styles.sosButtonContainer, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
            {/* Ripple effects */}
            <Animated.View
              style={[
                styles.ripple,
                {
                  width: sosButtonSize,
                  height: sosButtonSize,
                  borderRadius: sosButtonSize / 2,
                  transform: [{ scale: ripple1 }],
                  opacity: ripple1.interpolate({
                    inputRange: [1, 1.5],
                    outputRange: [0.4, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.ripple,
                {
                  width: sosButtonSize,
                  height: sosButtonSize,
                  borderRadius: sosButtonSize / 2,
                  transform: [{ scale: ripple2 }],
                  opacity: ripple2.interpolate({
                    inputRange: [1, 1.5],
                    outputRange: [0.4, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.ripple,
                {
                  width: sosButtonSize,
                  height: sosButtonSize,
                  borderRadius: sosButtonSize / 2,
                  transform: [{ scale: ripple3 }],
                  opacity: ripple3.interpolate({
                    inputRange: [1, 1.5],
                    outputRange: [0.4, 0],
                  }),
                },
              ]}
            />
            
            {/* SOS Button */}
            <TouchableOpacity
              style={[styles.sosButton, { width: sosButtonSize, height: sosButtonSize, borderRadius: sosButtonSize / 2 }]}
              onPress={handleSOS}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF3B30', '#FF6B6B', '#FF8787']}
                style={[styles.sosButtonGradient, { width: sosButtonSize, height: sosButtonSize, borderRadius: sosButtonSize / 2 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.sosButtonContent}>
                  <Text style={[styles.sosButtonText, { fontSize: sosButtonSize * 0.25 }]}>SOS</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Emergency Contact */}
          <View style={[styles.section, styles.emergencyContactSection]}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddContact}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={24} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
            
            {emergencyContacts.length > 0 ? (
              emergencyContacts.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactHeader}>
                    <LinearGradient
                      colors={['#FFE5E5', '#FFD5D5']}
                      style={styles.contactAvatarContainer}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="person" size={32} color="#FF6B6B" />
                    </LinearGradient>
                    <View style={styles.contactInfo}>
                      <TextInput
                        style={styles.contactNameInput}
                        placeholder="Name"
                        value={contact.name}
                        onChangeText={(value) => handleUpdateContact(contact.id, 'name', value)}
                        placeholderTextColor="#999"
                      />
                      <TextInput
                        style={styles.contactDetailInput}
                        placeholder="Phone Number"
                        value={contact.phone}
                        onChangeText={(value) => handleUpdateContact(contact.id, 'phone', value)}
                        keyboardType="phone-pad"
                        placeholderTextColor="#999"
                      />
                      <TextInput
                        style={styles.contactDetailInput}
                        placeholder="Email"
                        value={contact.email}
                        onChangeText={(value) => handleUpdateContact(contact.id, 'email', value)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#999"
                      />
                    </View>
                    {contact.id !== 'primary' && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteContact(contact.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close" size={20} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.contactActionButtons}>
                    <TouchableOpacity
                      style={[styles.callButton, !contact.phone && styles.disabledButton]}
                      onPress={() => contact.phone && handleCall(contact.phone)}
                      activeOpacity={0.8}
                      disabled={!contact.phone}
                    >
                      <LinearGradient
                        colors={['#FF6B6B', '#FF5252']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                      <Text style={styles.callButtonText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.messageButton, !contact.phone && styles.disabledButton]}
                      onPress={() => contact.phone && handleMessage(contact.phone)}
                      activeOpacity={0.7}
                      disabled={!contact.phone}
                    >
                      <Text style={styles.messageButtonText}>Message</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.contactCard}>
                <Text style={styles.noContactText}>No emergency contacts. Tap the + icon to add one.</Text>
              </View>
            )}
          </View>

          {/* Add Emergency Contact Modal */}
          <Modal
            visible={showAddModal}
            animationType="slide"
            transparent={true}
            onRequestClose={handleCancelAdd}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Emergency Contact</Text>
                  <TouchableOpacity
                    onPress={handleCancelAdd}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter contact name"
                      value={newContactName}
                      onChangeText={setNewContactName}
                      placeholderTextColor="#999"
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Phone Number *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter phone number"
                      value={newContactPhone}
                      onChangeText={setNewContactPhone}
                      keyboardType="phone-pad"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter email address"
                      value={newContactEmail}
                      onChangeText={setNewContactEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={handleCancelAdd}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalSaveButton}
                      onPress={handleSaveContact}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#FF6B6B', '#FF5252']}
                        style={styles.modalSaveButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.modalSaveButtonText}>Save</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </ScrollView>

        {/* Bottom Navigation */}
        <CustomTabBar />
      </View>
    </View>
  );
};

export default Home;

