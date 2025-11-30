import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../../../contexts/AuthContext';
import { StorageService } from '../../../../../utils/storage';
import { reverseGeocode } from '../../../../../utils/geocoding';

const { width: screenWidth } = Dimensions.get('window');
const buttonSize = Math.min(screenWidth * 0.6, 220);
const isSmallDevice = screenWidth < 375;

const OfflineEmergency: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected || false);
      if (state.isConnected) {
        // If connection is restored, redirect based on auth status
        setTimeout(() => {
          if (user) {
            router.replace('/screens/Home/Home');
          } else {
            router.replace('/screens/AccessPoint/components/Login/Login');
          }
        }, 1000);
      }
    });

    return () => unsubscribe();
  }, [router, user]);

  const handleCall = useCallback(async (number: string) => {
    try {
      const canCall = await Linking.canOpenURL(`tel:${number}`);
      if (canCall) {
        await Linking.openURL(`tel:${number}`);
      } else {
        Alert.alert('Error', 'Unable to make phone calls on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate call');
    }
  }, []);

  const handleSMS = useCallback(async (number: string, message: string) => {
    try {
      // Try to open SMS directly - don't check canOpenURL first as it can be unreliable
      // Try multiple formats for better compatibility
      const smsFormats = [
        `sms:${number}?body=${encodeURIComponent(message)}`, // Standard format with body
        `sms://${number}?body=${encodeURIComponent(message)}`, // Alternative format
        `sms:${number}`, // Without body (fallback)
      ];

      let opened = false;
      for (const smsUrl of smsFormats) {
        try {
          // Try to open directly without checking canOpenURL first
          await Linking.openURL(smsUrl);
          opened = true;
          break;
        } catch (urlError) {
          // Try next format
          continue;
        }
      }

      if (!opened) {
        // If all formats failed, show message for manual sending
        Alert.alert(
          'SMS',
          `Please send this message to ${number}:\n\n${message}`,
          [
            {
              text: 'Copy Message',
              onPress: () => {
                // You could use Clipboard here if available
                Alert.alert('Message', 'Please manually copy the message above');
              },
            },
            { text: 'OK' }
          ]
        );
      }
    } catch (error: any) {
      // If opening fails, show the message so user can manually send it
      Alert.alert(
        'SMS',
        `Please send this message to ${number}:\n\n${message}`,
        [{ text: 'OK' }]
      );
    }
  }, []);

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

  const handleSOSPress = useCallback(async () => {
    // Show action sheet to choose between call or message
    Alert.alert(
      'Emergency SOS',
      'Choose how to contact 911:',
      [
        {
          text: 'Call 911',
          onPress: async () => {
            try {
              await Linking.openURL('tel:911');
            } catch (error) {
              console.error('Error opening phone dialer:', error);
              Alert.alert('Error', 'Failed to open phone dialer');
            }
          },
          style: 'default',
        },
        {
          text: 'Message 911',
          onPress: async () => {
            try {
              // Fetch user profile from AsyncStorage (works offline)
              let userProfile = user;
              
              // If user is not in context, try to load from AsyncStorage
              if (!userProfile) {
                try {
                  const localUser = await StorageService.getUserSession();
                  if (localUser) {
                    userProfile = localUser;
                  }
                } catch (storageError) {
                  console.warn('Could not load user from storage:', storageError);
                }
              }
              
              // Get user profile information
              const userName = userProfile 
                ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'User'
                : 'User';
              const userPhone = userProfile?.phone || 'N/A';
              const userEmail = userProfile?.email || 'N/A';
              const emergencyContact = userProfile?.emergency_contact_name 
                ? `${userProfile.emergency_contact_name} (${userProfile.emergency_contact_number || 'N/A'})`
                : 'N/A';

              // Get GPS location
              let latitude: number | null = null;
              let longitude: number | null = null;
              let locationCity: string | null = null;
              let locationBarangay: string | null = null;

              try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                  const currentLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                  });
                  latitude = currentLocation.coords.latitude;
                  longitude = currentLocation.coords.longitude;

                  // Try to reverse geocode to get city and barangay
                  // In offline mode, this will likely fail, so we catch and continue
                  if (latitude && longitude) {
                    try {
                      const geocodeResult = await reverseGeocode(latitude, longitude);
                      locationCity = geocodeResult.city || null;
                      locationBarangay = geocodeResult.barangay || null;
                    } catch (geocodeError: any) {
                      // In offline mode, geocoding will fail - that's expected
                      // We'll use GPS coordinates only
                      const errorMsg = geocodeError?.message || String(geocodeError) || '';
                      if (!errorMsg.toLowerCase().includes('network')) {
                        // Only log non-network errors (network errors are expected in offline mode)
                        console.warn('Geocoding failed (expected in offline mode):', errorMsg);
                      }
                    }
                  }
                }
              } catch (locationError) {
                // Location permission denied or GPS unavailable - continue without location
                console.warn('Location unavailable:', locationError);
              }

              // Build location string
              const locationParts = [];
              if (locationBarangay) locationParts.push(locationBarangay);
              if (locationCity) locationParts.push(locationCity);
              const locationString = locationParts.length > 0 
                ? locationParts.join(', ')
                : 'Location unavailable';

              // Build GPS coordinates string
              const gpsString = latitude && longitude
                ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                : 'GPS coordinates unavailable';

              // Create predefined emergency message
              const emergencyMessage = `EMERGENCY SOS ALERT

Reporter: ${userName}
Phone: ${userPhone}
Email: ${userEmail}
Emergency Contact: ${emergencyContact}

Location: ${locationString}
GPS Coordinates: ${gpsString}
Latitude: ${latitude?.toFixed(6) || 'N/A'}
Longitude: ${longitude?.toFixed(6) || 'N/A'}

Time: ${new Date().toLocaleString()}

I need immediate assistance. Please help.`;

              // Send SMS with predefined text
              handleSMS('911', emergencyMessage);
            } catch (error) {
              console.error('Error preparing emergency message:', error);
              Alert.alert('Error', 'Failed to prepare emergency message');
            }
          },
          style: 'default',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  }, [handleSMS, user]);


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.offlineIndicator}>
          <Ionicons name="cloud-offline" size={24} color="#ff3b30" />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>No Internet Connection Detected</Text>
          <Text style={styles.noticeDescription}>You can still contact emergency hotlines using the SOS button below.</Text>
        </View>

        <View style={styles.sosContainer}>
          <Animated.View
            style={[
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
              style={[
                styles.sosButtonNeumorphic,
                {
                  width: buttonSize,
                  height: buttonSize,
                  borderRadius: buttonSize / 2,
                }
              ]}
            >
              <View style={[styles.sosButtonInner, {
                width: buttonSize * 0.85,
                height: buttonSize * 0.85,
                borderRadius: (buttonSize * 0.85) / 2,
              }]}>
                <View style={styles.sosButtonContent}>
                  <Text style={[styles.sosButtonText, { fontSize: buttonSize * 0.2 }]}>
                    SOS
                  </Text>
                  <Text style={[styles.sosButtonSubtext, { fontSize: buttonSize * 0.08 }]}>
                    Emergency
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>


        {user?.emergencyContactNumber && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Emergency Contact</Text>
            <View style={styles.personalContactCard}>
              <View style={styles.personalContactHeader}>
                <Ionicons name="person-circle" size={40} color="#ff6b6b" />
                <View style={styles.personalContactInfo}>
                  <Text style={styles.personalContactName}>{user.emergencyContactName}</Text>
                  <Text style={styles.personalContactNumber}>{user.emergencyContactNumber}</Text>
                </View>
              </View>
              <View style={styles.personalContactActions}>
                <TouchableOpacity
                  style={styles.personalActionButton}
                  onPress={async () => {
                    try {
                      console.log(`Opening phone dialer with: ${user.emergencyContactNumber}`);
                      await Linking.openURL(`tel:${user.emergencyContactNumber}`);
                      console.log('Phone dialer opened successfully');
                    } catch (error) {
                      console.error('Error opening phone dialer:', error);
                      Alert.alert('Error', 'Failed to open phone dialer');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                  <Text style={styles.personalActionText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.personalActionButton, styles.smsActionButton]}
                  onPress={() => handleSMS(user.emergencyContactNumber, 'I need help!')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble" size={20} color="#fff" />
                  <Text style={styles.personalActionText}>SMS</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Emergency Tips</Text>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={18} color="#34C759" />
            <Text style={styles.infoText}>Stay calm and assess the situation</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={18} color="#34C759" />
            <Text style={styles.infoText}>Call or SMS emergency services</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={18} color="#34C759" />
            <Text style={styles.infoText}>Provide your location clearly</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={18} color="#34C759" />
            <Text style={styles.infoText}>Follow emergency personnel instructions</Text>
          </View>
        </View>

        {isConnected && (
          <View style={styles.reconnectedCard}>
            <Ionicons name="checkmark-circle" size={48} color="#34C759" />
            <Text style={styles.reconnectedText}>Connection Restored!</Text>
            <Text style={styles.reconnectedSubtext}>Redirecting to home...</Text>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  noticeCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  noticeDescription: {
    marginTop: 6,
    fontSize: 14,
    color: '#555',
  },
  noticeActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  noticeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  noticeSmsButton: {
    backgroundColor: '#ff6b6b',
  },
  noticeCallButton: {
    backgroundColor: '#34C759',
  },
  noticeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff3b30',
    marginLeft: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  personalContactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  personalContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  personalContactInfo: {
    marginLeft: 12,
    flex: 1,
  },
  personalContactName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 3,
  },
  personalContactNumber: {
    fontSize: 16,
    color: '#ff6b6b',
  },
  personalContactActions: {
    flexDirection: 'row',
    gap: 10,
  },
  personalActionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smsActionButton: {
    backgroundColor: '#ff6b6b',
  },
  personalActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  infoSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  reconnectedCard: {
    backgroundColor: '#34C75920',
    margin: 20,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#34C759',
  },
  reconnectedText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#34C759',
    marginTop: 15,
  },
  reconnectedSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  // SOS Button Styles - Neumorphic Design (matching online mode)
  sosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    marginTop: 40,
    marginBottom: 40,
  },
  sosButtonNeumorphic: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    // Light shadow (top-left) - raised effect
    shadowColor: '#FF3B30',
    shadowOffset: { width: -8, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: '#FFE5E5',
  },
  sosButtonInner: {
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    // Dark shadow (bottom-right) - depth
    shadowColor: '#CC0000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sosButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  sosButtonText: {
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  sosButtonSubtext: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default OfflineEmergency;
