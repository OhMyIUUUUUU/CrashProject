import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

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
            router.replace('/screens/Home/Home');
          } else {
            router.replace('/screens/AccessPoint/Login/Login');
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
      const canSMS = await Linking.canOpenURL(`sms:${number}`);
      if (canSMS) {
        await Linking.openURL(`sms:${number}?body=${encodeURIComponent(message)}`);
      } else {
        Alert.alert('Error', 'Unable to send SMS on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send SMS');
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
          <Text style={styles.noticeDescription}>You can still contact emergency hotlines.</Text>
          <View style={styles.noticeActions}>
            <TouchableOpacity
              style={[styles.noticeButton, styles.noticeSmsButton]}
              onPress={() => handleSMS('911', 'Emergency! I need help. Please assist.')}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble" size={18} color="#fff" />
              <Text style={styles.noticeButtonText}>Send SMS to 911</Text>
            </TouchableOpacity>
          </View>
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
