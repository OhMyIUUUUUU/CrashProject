import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { reverseGeocode } from '../../utils/geocoding';
import { StorageService } from '../../utils/storage';

const { width: screenWidth } = Dimensions.get('window');
const buttonSize = Math.min(screenWidth * 0.5, 200);
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
            router.replace('/screens/Home');
          } else {
            router.replace('/components/Login/Login');
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
              
              // Fetch ALL user profile data from local storage (offline mode)
              const firstName = userProfile?.firstName || '';
              const lastName = userProfile?.lastName || '';
              const userName = firstName || lastName 
                ? `${firstName} ${lastName}`.trim() 
                : 'User';
              const userPhone = userProfile?.phone || 'N/A';
              const userEmail = userProfile?.email || 'N/A';
              const userGender = userProfile?.gender || 'N/A';
              const userBirthdate = userProfile?.birthdate || 'N/A';
              const userRegion = userProfile?.region || 'N/A';
              const userCity = userProfile?.city || 'N/A';
              const userBarangay = userProfile?.barangay || 'N/A';
              const emergencyContactName = userProfile?.emergencyContactName || 'N/A';
              const emergencyContactNumber = userProfile?.emergencyContactNumber || 'N/A';
              const emergencyContact = emergencyContactName !== 'N/A' && emergencyContactNumber !== 'N/A'
                ? `${emergencyContactName} (${emergencyContactNumber})`
                : 'N/A';

              // Get CURRENT GPS location (offline mode - ACCURATE with reasonable timeout)
              let latitude: number | null = null;
              let longitude: number | null = null;
              let locationString = 'Location unavailable';
              let gpsAddress = 'GPS address unavailable';

              // Build profile address first (fast, no waiting) - without region
              const addressParts = [];
              if (userBarangay && userBarangay !== 'N/A') addressParts.push(userBarangay);
              if (userCity && userCity !== 'N/A') addressParts.push(userCity);
              const profileAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

              // Try GPS with 2s timeout - balance between speed and getting coordinates
              // For emergency, we need coordinates even if it takes a bit longer
              try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === 'granted') {
                  // Try to get GPS with 2s timeout to ensure we capture coordinates
                  try {
                    const locationPromise = Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.Balanced, // Fastest option
                    });
                    
                    // 2 second timeout - gives GPS time to get coordinates
                    const timeoutPromise = new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('Location timeout')), 2000)
                    );

                    const currentLocation = await Promise.race([locationPromise, timeoutPromise]) as any;
                    // Ensure we capture coordinates if location is available
                    if (currentLocation?.coords) {
                      latitude = currentLocation.coords.latitude || null;
                      longitude = currentLocation.coords.longitude || null;
                    }

                  if (latitude && longitude) {
                      // Skip geocoding in offline mode - it will fail and cause network errors
                      // Just use coordinates directly
                      if (isConnected) {
                        // Only try geocoding if we have internet connection
                        try {
                          const geocodeResult = await reverseGeocode(latitude, longitude);
                        
                        // Build address from geocoded result (current GPS location)
                        const currentAddressParts = [];
                        // Only use barangay if it doesn't look like a subdivision
                        if (geocodeResult.barangay && 
                            !geocodeResult.barangay.toLowerCase().includes('hills') &&
                            !geocodeResult.barangay.toLowerCase().includes('addition') &&
                            !geocodeResult.barangay.toLowerCase().includes('subdivision') &&
                            !geocodeResult.barangay.toLowerCase().includes('subd')) {
                          currentAddressParts.push(geocodeResult.barangay);
                        }
                        // Always use city from GPS location (current location)
                        if (geocodeResult.city) {
                          currentAddressParts.push(geocodeResult.city);
                        }
                        
                        const currentAddress = currentAddressParts.length > 0 
                          ? currentAddressParts.join(', ')
                          : null;
                        
                        // Always use GPS location address (current location)
                        if (currentAddress) {
                          gpsAddress = currentAddress;
                          locationString = currentAddress;
                        } else {
                          // If geocoding returns no address, fallback to coordinates
                          gpsAddress = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                          locationString = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                        }
                        } catch (geocodeError: any) {
                          // If geocoding fails (offline/network error), use GPS coordinates
                          // Silently handle network errors (expected in offline mode)
                          gpsAddress = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                          locationString = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                        }
                      } else {
                        // Offline mode - use GPS coordinates directly, no geocoding
                        gpsAddress = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                        locationString = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                      }
                    } else {
                      locationString = profileAddress || 'Location unavailable';
                      gpsAddress = profileAddress || 'GPS address unavailable';
                    }
                  } catch (locationError: any) {
                    // GPS timeout or error - try to get last known location as fallback
                    if (!latitude || !longitude) {
                      try {
                        const lastLocation = await Location.getLastKnownPositionAsync();
                        if (lastLocation?.coords) {
                          latitude = lastLocation.coords.latitude || null;
                          longitude = lastLocation.coords.longitude || null;
                        }
                      } catch (lastLocationError) {
                        // Last known location also failed - use profile address
                        locationString = profileAddress || 'Location unavailable - GPS timeout';
                        gpsAddress = profileAddress || 'GPS address unavailable';
                      }
                    }
                  }
                } else {
                  // Permission not granted - use profile address
                  locationString = profileAddress || 'Location permission not granted';
                  gpsAddress = profileAddress || 'GPS address unavailable';
                }
              } catch (locationError: any) {
                // Any error - use profile address immediately
                locationString = profileAddress || 'Location unavailable';
                gpsAddress = profileAddress || 'GPS address unavailable';
              }

              // Create predefined emergency message with ALL profile data from local storage
              const emergencyMessage = `EMERGENCY SOS ALERT

PERSONAL INFORMATION:
Name: ${userName}
Phone: ${userPhone}
Email: ${userEmail}
Gender: ${userGender}
Birthdate: ${userBirthdate}

ADDRESS (from profile):
City: ${userCity}
Barangay: ${userBarangay}

EMERGENCY CONTACT:
Name: ${emergencyContactName}
Phone: ${emergencyContactNumber}

CURRENT LOCATION:
Latitude: ${latitude?.toFixed(8) || 'N/A'}
Longitude: ${longitude?.toFixed(8) || 'N/A'}

Time: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}

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
    <View style={styles.container}>
      <StatusBar style="dark" />
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
                  onPress={async () => {
                    try {
                      // Fetch ALL user profile data from local storage (offline mode)
                      let userProfile = user;
                      if (!userProfile) {
                        const localUser = await StorageService.getUserSession();
                        if (localUser) {
                          userProfile = localUser;
                        }
                      }
                      
                      // Get ALL profile data from local storage
                      const firstName = userProfile?.firstName || '';
                      const lastName = userProfile?.lastName || '';
                      const userName = firstName || lastName 
                        ? `${firstName} ${lastName}`.trim() 
                        : 'User';
                      const userPhone = userProfile?.phone || 'N/A';
                      const userEmail = userProfile?.email || 'N/A';
                      const userGender = userProfile?.gender || 'N/A';
                      const userBirthdate = userProfile?.birthdate || 'N/A';
                      const userRegion = userProfile?.region || 'N/A';
                      const userCity = userProfile?.city || 'N/A';
                      const userBarangay = userProfile?.barangay || 'N/A';
                      const emergencyContactName = userProfile?.emergencyContactName || 'N/A';
                      const emergencyContactNumber = userProfile?.emergencyContactNumber || 'N/A';
                      
                      // Get CURRENT GPS location (ACCURATE with reasonable timeout)
                      let locationString = 'Location unavailable';
                      let gpsAddress = 'GPS address unavailable';
                      let latitude: number | null = null;
                      let longitude: number | null = null;
                      
                      // Build profile address first (fast, no waiting) - without region
                      const addressParts = [];
                      if (userBarangay && userBarangay !== 'N/A') addressParts.push(userBarangay);
                      if (userCity && userCity !== 'N/A') addressParts.push(userCity);
                      const profileAddress = addressParts.length > 0 ? addressParts.join(', ') : null;
                      
                      try {
                        const { status } = await Location.getForegroundPermissionsAsync();
                        if (status === 'granted') {
                          // Try to get GPS with 2s timeout to ensure we capture coordinates
                          try {
                            const locationPromise = Location.getCurrentPositionAsync({
                              accuracy: Location.Accuracy.Balanced, // Fastest option
                            });
                            
                            // 2 second timeout - gives GPS time to get coordinates
                            const timeoutPromise = new Promise((_, reject) => 
                              setTimeout(() => reject(new Error('Location timeout')), 2000)
                            );

                            const currentLocation = await Promise.race([locationPromise, timeoutPromise]) as any;
                            // Ensure we capture coordinates if location is available
                            if (currentLocation?.coords) {
                              latitude = currentLocation.coords.latitude || null;
                              longitude = currentLocation.coords.longitude || null;
                            }
                            
                            if (latitude && longitude) {
                              // Skip geocoding in offline mode - it will fail and cause network errors
                              // Just use coordinates directly
                              if (isConnected) {
                                // Only try geocoding if we have internet connection
                                try {
                                  const geocodeResult = await reverseGeocode(latitude, longitude);
                                
                                // Build address from geocoded result (current GPS location)
                                const currentAddressParts = [];
                                // Only use barangay if it doesn't look like a subdivision
                                if (geocodeResult.barangay && 
                                    !geocodeResult.barangay.toLowerCase().includes('hills') &&
                                    !geocodeResult.barangay.toLowerCase().includes('addition') &&
                                    !geocodeResult.barangay.toLowerCase().includes('subdivision') &&
                                    !geocodeResult.barangay.toLowerCase().includes('subd')) {
                                  currentAddressParts.push(geocodeResult.barangay);
                                }
                                // Always use city from GPS location (current location)
                                if (geocodeResult.city) {
                                  currentAddressParts.push(geocodeResult.city);
                                }
                                const currentAddress = currentAddressParts.length > 0 
                                  ? currentAddressParts.join(', ')
                                  : null;
                                
                                // Always use GPS location address (current location)
                                if (currentAddress) {
                                  gpsAddress = currentAddress;
                                  locationString = currentAddress;
                                } else {
                                  // If geocoding returns no address, fallback to coordinates
                                  gpsAddress = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                                  locationString = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                                }
                                } catch (geocodeError: any) {
                                  // If geocoding fails (offline/network error), use GPS coordinates
                                  // Silently handle network errors (expected in offline mode)
                                  gpsAddress = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                                  locationString = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                                }
                              } else {
                                // Offline mode - use GPS coordinates directly, no geocoding
                                gpsAddress = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                                locationString = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                              }
                            } else {
                              locationString = profileAddress || 'Location unavailable';
                              gpsAddress = profileAddress || 'GPS address unavailable';
                            }
                          } catch (locationError: any) {
                            // GPS timeout or error - try to get last known location as fallback
                            if (!latitude || !longitude) {
                              try {
                                const lastLocation = await Location.getLastKnownPositionAsync();
                                if (lastLocation?.coords) {
                                  latitude = lastLocation.coords.latitude || null;
                                  longitude = lastLocation.coords.longitude || null;
                                }
                              } catch (lastLocationError) {
                                // Last known location also failed - use profile address
                                locationString = profileAddress || 'Location unavailable - GPS timeout';
                                gpsAddress = profileAddress || 'GPS address unavailable';
                              }
                            }
                          }
                        } else {
                          // Permission denied - use profile address
                          locationString = profileAddress || 'Location permission not granted';
                          gpsAddress = profileAddress || 'GPS address unavailable';
                        }
                      } catch (locationError: any) {
                        // Any error - use profile address immediately
                        locationString = profileAddress || 'Location unavailable';
                        gpsAddress = profileAddress || 'GPS address unavailable';
                      }
                      
                      // Predefined emergency message with ALL profile data from local storage
                      const predefinedMessage = `EMERGENCY - I need help!

PERSONAL INFORMATION:
Name: ${userName}
Phone: ${userPhone}
Email: ${userEmail}
Gender: ${userGender}
Birthdate: ${userBirthdate}

ADDRESS (from profile):
City: ${userCity}
Barangay: ${userBarangay}

EMERGENCY CONTACT:
Name: ${emergencyContactName}
Phone: ${emergencyContactNumber}

CURRENT LOCATION:
Latitude: ${latitude?.toFixed(8) || 'N/A'}
Longitude: ${longitude?.toFixed(8) || 'N/A'}

Time: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}

Please help me immediately!`;
                      
                      handleSMS(user.emergencyContactNumber, predefinedMessage);
                    } catch (error) {
                      console.error('Error preparing message:', error);
                      // Fallback to simple message
                      handleSMS(user.emergencyContactNumber, 'I need help!');
                    }
                  }}
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

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
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
  // SOS Button Styles
  sosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    marginTop: 40,
    marginBottom: 40,
  },
  sosButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButton: {
    width: buttonSize,
    height: buttonSize,
    borderRadius: buttonSize / 2,
    backgroundColor: '#E8E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  sosButtonInner: {
    width: buttonSize * 0.8,
    height: buttonSize * 0.8,
    borderRadius: (buttonSize * 0.8) / 2,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: {
    fontSize: buttonSize * 0.24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  sosSubtext: {
    fontSize: buttonSize * 0.06,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
});

export default OfflineEmergency;


