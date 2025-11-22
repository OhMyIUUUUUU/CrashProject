import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ChatModal } from '../../components/ChatModal';
import { FloatingChatHead } from '../../components/FloatingChatHead';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveCase } from '../../hooks/useActiveCase';
import { supabase } from '../../lib/supabase';
import CustomTabBar from '../AccessPoint/components/Customtabbar/CustomTabBar';
import { styles } from './styles';

const { width: screenWidth } = Dimensions.get('window');
const buttonSize = Math.min(screenWidth * 0.6, 220);

const Home: React.FC = () => {
  const { user, loadUser } = useAuth();
  const { activeCase, cancelReport, checkActiveCase, notifications, checkNotifications } = useActiveCase();
  const [isLoading, setIsLoading] = useState(true);
  const [sendingSOS, setSendingSOS] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<ActiveCase | null>(null);
  const [isCaseMinimized, setIsCaseMinimized] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sosCountdown, setSosCountdown] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sosCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Debug: Log active case changes
  useEffect(() => {
    if (activeCase) {
      console.log('✅ Active Case Detected:', activeCase.report_id, activeCase.status);
    } else {
      console.log('❌ No Active Case');
    }
  }, [activeCase]);

  // Request location permission when component mounts
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission not granted');
        } else {
          console.log('Location permission granted');
        }
      } catch (error) {
        console.error('Error requesting location permission:', error);
      }
    };

    requestLocationPermission();
  }, []);

  // Debug: Log active case changes
  useEffect(() => {
    console.log('Active Case State Changed:', activeCase);
  }, [activeCase]);

  // Animation values for SOS button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
  }, [user, loadUser]);

  // Pulsing animation effect for SOS button
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

  const handleCancelReport = useCallback(async () => {
    if (!activeCase || cancelling || countdown > 0) {
      console.log('❌ Cannot cancel:', { activeCase: !!activeCase, cancelling, countdown });
      return;
    }

    // Allow cancellation of any active case (including SOS-created reports)
    Alert.alert(
      'Cancel Report',
      'Are you sure you want to cancel this active case? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            // Start 5-second countdown
            setCountdown(5);
            setCancelling(true);

            // Clear any existing interval
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }

            // Start countdown
            countdownIntervalRef.current = setInterval(() => {
              setCountdown((prev) => {
                if (prev <= 1) {
                  // Countdown finished, cancel the report
                  if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                  }
                  
                  // Cancel the report (pass activeCase to preserve remarks)
                  cancelReport(activeCase.report_id, activeCase).then(async (success) => {
                    setCancelling(false);
                    setCountdown(0);
                    if (success) {
                      // Refresh active case after cancellation
                      await checkActiveCase();
                      Alert.alert('Success', 'Report has been cancelled successfully.');
                    } else {
                      Alert.alert('Error', 'Failed to cancel report. Please try again.');
                    }
                  });
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          },
        },
      ]
    );
  }, [activeCase, cancelling, cancelReport, countdown, checkActiveCase]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (sosCountdownIntervalRef.current) {
        clearInterval(sosCountdownIntervalRef.current);
      }
    };
  }, []);

  const sendSOS = useCallback(async () => {
    setSendingSOS(true);

    try {
      // 1. Fetch User ID from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id || null;
      const userEmail = session?.user?.email || null;

      if (!authUserId && !userEmail) {
        Alert.alert('Error', 'Please log in to send SOS');
        setSendingSOS(false);
        setSosCountdown(0);
        return;
      }

      // 2. Fetch User Info from database (try by user_id first, then by email)
      let userInfo = null;
      let reporterId = null;
      let userError = null;

      // Try to get user by user_id (matching Supabase auth user ID)
      if (authUserId) {
        const { data, error } = await supabase
          .from('tbl_users')
          .select('user_id, first_name, last_name, phone, email, emergency_contact_name, emergency_contact_number, region, city, barangay')
          .eq('user_id', authUserId)
          .single();
        
        if (data && !error) {
          userInfo = data;
          reporterId = data.user_id;
        }
      }

      // If not found by user_id, try by email
      if (!userInfo && userEmail) {
        const { data, error } = await supabase
          .from('tbl_users')
          .select('user_id, first_name, last_name, phone, email, emergency_contact_name, emergency_contact_number, region, city, barangay')
          .eq('email', userEmail)
          .single();
        
        if (data && !error) {
          userInfo = data;
          reporterId = data.user_id;
        } else {
          userError = error;
        }
      }

      if (!userInfo || !reporterId) {
        console.error('Error fetching user info:', userError);
        Alert.alert('Error', 'Unable to fetch user information. Please try again.');
        setSendingSOS(false);
        setSosCountdown(0);
        return;
      }

      // 3. Fetch GPS Location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Location permission is required to send SOS. Please enable it in settings.',
          [{ text: 'OK' }]
        );
        setSendingSOS(false);
        setSosCountdown(0);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const latitude = currentLocation.coords.latitude;
      const longitude = currentLocation.coords.longitude;

      // Create description with user info
      const userName = `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || 'User';
      const description = `EMERGENCY SOS ALERT\n\n` +
        `Reporter: ${userName}\n` +
        `Phone: ${userInfo.phone || 'N/A'}\n` +
        `Email: ${userInfo.email || 'N/A'}\n` +
        `Emergency Contact: ${userInfo.emergency_contact_name || 'N/A'} (${userInfo.emergency_contact_number || 'N/A'})\n` +
        `Address: ${userInfo.barangay || ''}, ${userInfo.city || ''}, ${userInfo.region || ''}\n` +
        `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n` +
        `Role: Witness\n` +
        `Time: ${new Date().toLocaleString()}`;

      const now = new Date().toISOString();

      // 4. Create report payload with default category "Emergency" and role "witness"
      const reportPayload = {
        reporter_id: reporterId,
        assigned_office_id: null,
        category: 'Emergency', // Default category
        description: description,
        status: 'pending',
        latitude: latitude,
        longitude: longitude,
        remarks: `SOS triggered via mobile app. Role: Witness. User: ${userName}`,
        created_at: now,
        updated_at: now,
      };

      // 5. Send SOS report to database
      const { data, error } = await supabase
        .from('tbl_reports')
        .insert([reportPayload])
        .select()
        .single();

      if (error) {
        console.error('SOS submission error:', error);
        Alert.alert(
          'Error',
          'Failed to send SOS. Please try again.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('SOS submitted successfully:', data);
        Alert.alert(
          'SOS Sent Successfully',
          'Your emergency SOS has been sent. Responders have been notified.',
          [{ text: 'OK' }]
        );
        // Refresh active case after sending SOS
        // Wait a moment for database to process, then refresh
        setTimeout(async () => {
          console.log('🔄 Refreshing active case after SOS submission...');
          await checkActiveCase();
          console.log('✅ Active case refresh completed - SOS report is now active and can be cancelled');
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error sending SOS:', error);
      Alert.alert(
        'Error',
        'Failed to send SOS. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSendingSOS(false);
      setSosCountdown(0);
    }
  }, [checkActiveCase]);

  const handleSOSPress = useCallback(async () => {
    if (sendingSOS) return;

    console.log('🔴 SOS Button Clicked!');
    
    // Check database directly for active case (don't rely on state)
    const { data: { session } } = await supabase.auth.getSession();
    const authUserId = session?.user?.id || null;
    const userEmail = session?.user?.email || null;

    let reporterId = null;
    if (authUserId) {
      const { data: userData } = await supabase
        .from('tbl_users')
        .select('user_id')
        .eq('user_id', authUserId)
        .single();
      if (userData) reporterId = userData.user_id;
    }

    if (!reporterId && userEmail) {
      const { data: userData } = await supabase
        .from('tbl_users')
        .select('user_id')
        .eq('email', userEmail)
        .single();
      if (userData) reporterId = userData.user_id;
    }

    let currentActiveCase = activeCase; // Use current state first
    
    // If no activeCase in state, check database directly
    if (!currentActiveCase && reporterId) {
      const { data: reports } = await supabase
        .from('tbl_reports')
        .select('*')
        .eq('reporter_id', reporterId)
        .order('created_at', { ascending: false })
        .limit(1);

      const activeReports = reports?.filter(report => {
        const status = report.status?.toLowerCase();
        // Only show pending and responding cases (exclude resolved, closed, and cancelled)
        return status === 'pending' || status === 'responding';
      }) || [];

      if (activeReports.length > 0) {
        currentActiveCase = activeReports[0] as any;
      }
    }

    console.log('🔴 Current Active Case:', currentActiveCase);

    // ALWAYS check for active case first - if exists, show it immediately
    if (currentActiveCase && currentActiveCase.report_id) {
      console.log('✅ Showing Active Case Popup');
      
      // Fetch office name if needed
      let officeName = (currentActiveCase as any).office_name;
      if (!officeName && currentActiveCase.assigned_office_id) {
        const { data: officeData } = await supabase
          .from('tbl_police_offices')
          .select('office_name')
          .eq('office_id', currentActiveCase.assigned_office_id)
          .single();
        if (officeData) officeName = officeData.office_name;
      }
      
      const statusEmoji = currentActiveCase.status === 'pending' ? '🟠' : 
                         currentActiveCase.status === 'responding' ? '🟢' : '🔵';
      
      const caseInfo = `🚨 ACTIVE CASE DETECTED\n\n` +
        `${statusEmoji} Status: ${currentActiveCase.status.toUpperCase()}\n` +
        `📁 Category: ${currentActiveCase.category}\n` +
        `📅 Created: ${new Date(currentActiveCase.created_at).toLocaleString()}\n` +
        (officeName ? `🏢 Office: ${officeName}\n` : '🏢 Office: Not assigned yet\n') +
        (currentActiveCase.description ? `\n📝 Description:\n${currentActiveCase.description.substring(0, 120)}${currentActiveCase.description.length > 120 ? '...' : ''}` : '');
      
      console.log('📱 Displaying Alert with case info:', caseInfo);
      
      Alert.alert(
        'Active Case',
        caseInfo,
        [
          { 
            text: '💬 Open Chat', 
            onPress: () => {
              console.log('Opening chat');
              setChatModalVisible(true);
            }
          },
          { 
            text: '👁️ View Details', 
            onPress: () => {
              console.log('Viewing details');
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 400, animated: true });
              }, 100);
            }
          },
          { 
            text: '🗑️ Cancel Report', 
            onPress: () => {
              console.log('Cancelling report');
              handleCancelReport();
            }, 
            style: 'destructive' 
          },
          { text: 'Close', style: 'cancel' }
        ],
        { cancelable: true }
      );
      console.log('✅ Alert should be displayed now');
      return; // Stop here - don't proceed with SOS
    }

    console.log('❌ No active case found, starting SOS countdown');
    // No active case - start countdown before sending SOS
    
    // Start 5-second countdown
    setSosCountdown(5);
    setSendingSOS(true);

    // Clear any existing interval
    if (sosCountdownIntervalRef.current) {
      clearInterval(sosCountdownIntervalRef.current);
    }

    // Show alert with countdown
    Alert.alert(
      'Sending SOS',
      'Emergency SOS will be sent in 5 seconds. Tap Cancel to stop.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            // Cancel countdown
            if (sosCountdownIntervalRef.current) {
              clearInterval(sosCountdownIntervalRef.current);
              sosCountdownIntervalRef.current = null;
            }
            setSosCountdown(0);
            setSendingSOS(false);
          },
        },
      ],
      { cancelable: true, onDismiss: () => {
        // Cancel countdown if alert is dismissed
        if (sosCountdownIntervalRef.current) {
          clearInterval(sosCountdownIntervalRef.current);
          sosCountdownIntervalRef.current = null;
        }
        setSosCountdown(0);
        setSendingSOS(false);
      }}
    );

    // Start countdown
    sosCountdownIntervalRef.current = setInterval(() => {
      setSosCountdown((prev) => {
        if (prev <= 1) {
          // Countdown finished, send SOS
          if (sosCountdownIntervalRef.current) {
            clearInterval(sosCountdownIntervalRef.current);
            sosCountdownIntervalRef.current = null;
          }
          
          // Send SOS
          sendSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return; // Stop here, countdown will trigger sendSOS
  }, [sendingSOS, activeCase, handleCancelReport, checkActiveCase, sendSOS]);

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
          {/* Notification Icon at Top */}
          <View style={styles.notificationHeader}>
            <TouchableOpacity
              style={styles.notificationIconButton}
              onPress={async () => {
                await checkNotifications();
                setNotificationModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications" size={28} color="#FF6B6B" />
              {notifications.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  try {
                    await Promise.all([
                      checkActiveCase(),
                      checkNotifications()
                    ]);
                  } catch (error) {
                    console.error('Error refreshing:', error);
                  } finally {
                    setRefreshing(false);
                  }
                }}
                colors={['#FF6B6B']}
                tintColor="#FF6B6B"
              />
            }
          >
          {/* SOS Button */}
          <View style={[
            styles.sosButtonContainer,
            activeCase && !isCaseMinimized && styles.sosButtonContainerExpanded
          ]}>
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
                onPress={() => {
                  console.log('🔴 Button Pressed - Active Case:', activeCase);
                  handleSOSPress();
                }}
                onPressIn={handleSOSPressIn}
                onPressOut={handleSOSPressOut}
                activeOpacity={1}
                disabled={sendingSOS || sosCountdown > 0}
                style={[
                  styles.sosButtonNeumorphic,
                  {
                    width: buttonSize,
                    height: buttonSize,
                    borderRadius: buttonSize / 2,
                    opacity: sendingSOS ? 0.7 : 1,
                  }
                ]}
              >
                <View style={[styles.sosButtonInner, {
                  width: buttonSize * 0.85,
                  height: buttonSize * 0.85,
                  borderRadius: (buttonSize * 0.85) / 2,
                }]}>
                  <View style={styles.sosButtonContent}>
                    {sosCountdown > 0 ? (
                      <>
                        <Text style={[styles.sosButtonText, { fontSize: buttonSize * 0.2 }]}>
                          {sosCountdown}
                        </Text>
                        <Text style={[styles.sosButtonSubtext, { fontSize: buttonSize * 0.08 }]}>
                          Cancel?
                        </Text>
                      </>
                    ) : sendingSOS ? (
                      <Text style={[styles.sosButtonText, { fontSize: buttonSize * 0.15 }]}>
                        Sending...
                      </Text>
                    ) : (
                      <>
                        <Text style={[styles.sosButtonText, { fontSize: buttonSize * 0.2 }]}>
                          SOS
                        </Text>
                        <Text style={[styles.sosButtonSubtext, { fontSize: buttonSize * 0.08 }]}>
                          Emergency
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Active Case Info or No Active Case Label */}
          {activeCase ? (
            <View style={[
              styles.activeCaseContainer,
              !isCaseMinimized && styles.activeCaseContainerExpanded
            ]}>
              <View style={styles.activeCaseHeader}>
                <View style={styles.activeCaseTitleRow}>
                  <Ionicons name="alert-circle" size={24} color="#FF6B6B" />
                  <Text style={styles.activeCaseTitle}>Active Case</Text>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: activeCase.status === 'pending' ? '#FF9500' : 
                                    activeCase.status === 'responding' ? '#34C759' : 
                                    '#007AFF' 
                  }]}>
                    <Text style={styles.statusText}>{activeCase.status.toUpperCase()}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setIsCaseMinimized(!isCaseMinimized)}
                  style={styles.minimizeButton}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={isCaseMinimized ? "chevron-down" : "chevron-up"} 
                    size={24} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
              
              {!isCaseMinimized && (
                <ScrollView 
                  style={styles.caseDetailsContainer}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  <View style={styles.caseDetailRow}>
                    <Ionicons name="folder" size={16} color="#666" />
                    <Text style={styles.caseDetailLabel}>Category:</Text>
                    <Text style={styles.caseDetailValue}>{activeCase.category}</Text>
                  </View>
                  
                  <View style={styles.caseDetailRow}>
                    <Ionicons name="time" size={16} color="#666" />
                    <Text style={styles.caseDetailLabel}>Created:</Text>
                    <Text style={styles.caseDetailValue}>
                      {new Date(activeCase.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  
                  {activeCase.office_name && (
                    <View style={styles.caseDetailRow}>
                      <Ionicons name="business" size={16} color="#666" />
                      <Text style={styles.caseDetailLabel}>Assigned Office:</Text>
                      <Text style={styles.caseDetailValue}>{activeCase.office_name}</Text>
                    </View>
                  )}
                  
                  {activeCase.description && (
                    <View style={styles.caseDescriptionContainer}>
                      <Text style={styles.caseDescriptionLabel}>Description:</Text>
                      <Text style={styles.caseDescriptionText} numberOfLines={3}>
                        {activeCase.description}
                      </Text>
                    </View>
                  )}
                  
                  {activeCase.latitude && activeCase.longitude && (
                    <View style={styles.caseDetailRow}>
                      <Ionicons name="location" size={16} color="#666" />
                      <Text style={styles.caseDetailLabel}>Location:</Text>
                      <Text style={styles.caseDetailValue}>
                        {Number(activeCase.latitude).toFixed(4)}, {Number(activeCase.longitude).toFixed(4)}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )}
              
              <TouchableOpacity
                style={styles.cancelReportButton}
                onPress={handleCancelReport}
                disabled={cancelling || countdown > 0}
              >
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
                <Text style={styles.cancelReportButtonText}>
                  {countdown > 0 ? `Cancelling in ${countdown}s...` : cancelling ? 'Cancelling...' : 'Cancel Report'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noActiveCaseContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#34C759" />
              <Text style={styles.noActiveCaseText}>No Active Case</Text>
              <Text style={styles.noActiveCaseSubtext}>You can send an SOS or submit a report</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Navigation */}
        <CustomTabBar />

        {/* Floating Chat Head - Only show when active case exists */}
        {activeCase && (
          <FloatingChatHead
            onPress={() => setChatModalVisible(true)}
            unreadCount={0} // TODO: Calculate unread count from messages
          />
        )}

        {/* Chat Modal */}
        <ChatModal
          visible={chatModalVisible}
          onClose={() => setChatModalVisible(false)}
          activeCase={activeCase}
        />

        {/* Notification Detail Panel */}
        <Modal
          visible={selectedNotification !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedNotification(null)}
        >
          {selectedNotification && (
            <View style={styles.notificationDetailOverlay}>
              <View style={styles.notificationDetailContainer}>
                <View style={styles.notificationDetailHeader}>
                  <Text style={styles.notificationDetailTitle}>Notification</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedNotification(null)}
                    style={styles.notificationDetailCloseButton}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.notificationDetailContent}>
                  <View style={styles.notificationMessageContainer}>
                    <Ionicons 
                      name={
                        selectedNotification.status?.toLowerCase() === 'resolved' ? 'checkmark-circle' :
                        (selectedNotification.status?.toLowerCase() === 'closed' && selectedNotification.remarks?.includes('Cancelled')) ? 'ban-circle' :
                        selectedNotification.status?.toLowerCase() === 'closed' ? 'close-circle' :
                        selectedNotification.status?.toLowerCase() === 'investigating' ? 'search-circle' :
                        selectedNotification.status?.toLowerCase() === 'assigned' ? 'person-circle' :
                        'time-circle'
                      } 
                      size={64} 
                      color={
                        selectedNotification.status?.toLowerCase() === 'resolved' ? '#34C759' :
                        (selectedNotification.status?.toLowerCase() === 'closed' && selectedNotification.remarks?.includes('Cancelled')) ? '#FF3B30' :
                        selectedNotification.status?.toLowerCase() === 'closed' ? '#999' :
                        selectedNotification.status?.toLowerCase() === 'investigating' ? '#007AFF' :
                        selectedNotification.status?.toLowerCase() === 'assigned' ? '#FF9500' :
                        '#FF9500'
                      } 
                    />
                    <Text style={styles.notificationMessageText}>
                      {selectedNotification.status?.toLowerCase() === 'resolved' ? 'Your case is already resolved' :
                       (selectedNotification.status?.toLowerCase() === 'closed' && selectedNotification.remarks?.includes('Cancelled')) ? 'Your case has been cancelled' :
                       selectedNotification.status?.toLowerCase() === 'closed' ? 'Your case is already closed' :
                       selectedNotification.status?.toLowerCase() === 'investigating' ? 'Your case is under investigation' :
                       selectedNotification.status?.toLowerCase() === 'assigned' ? 'Your case has been assigned' :
                       'Your case is pending'}
                    </Text>
                    <Text style={styles.notificationMessageSubtext}>
                      {selectedNotification.category}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </Modal>

        {/* Notification Modal */}
        <Modal
          visible={notificationModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setNotificationModalVisible(false)}
        >
          <View style={styles.notificationModalOverlay}>
            <View style={styles.notificationModalContainer}>
              <View style={styles.notificationModalHeader}>
                <Text style={styles.notificationModalTitle}>Notifications</Text>
                <TouchableOpacity
                  onPress={() => setNotificationModalVisible(false)}
                  style={styles.notificationModalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.notificationModalContent}>
                {notifications.length === 0 ? (
                  <View style={styles.noNotificationsContainer}>
                    <Ionicons name="notifications-off" size={48} color="#CCC" />
                    <Text style={styles.noNotificationsText}>No notifications</Text>
                    <Text style={styles.noNotificationsSubtext}>Case status updates will appear here</Text>
                  </View>
                ) : (
                  notifications.map((notification) => (
                    <TouchableOpacity
                      key={notification.report_id}
                      style={styles.notificationItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedNotification(notification);
                        setNotificationModalVisible(false);
                      }}
                    >
                      <View style={[
                        styles.notificationStatusIndicator,
                        {
                          backgroundColor: 
                            notification.status?.toLowerCase() === 'resolved' ? '#34C759' :
                            notification.status?.toLowerCase() === 'closed' ? '#999' :
                            notification.status?.toLowerCase() === 'cancelled' ? '#FF3B30' :
                            notification.status?.toLowerCase() === 'investigating' ? '#007AFF' :
                            notification.status?.toLowerCase() === 'assigned' ? '#FF9500' :
                            '#FF9500' // pending - orange
                        }
                      ]} />
                      <View style={styles.notificationItemContent}>
                        <Text style={styles.notificationItemTitle}>
                          {notification.status?.toLowerCase() === 'resolved' ? 'Case Resolved' :
                           notification.status?.toLowerCase() === 'closed' ? 'Case Closed' :
                           notification.status?.toLowerCase() === 'cancelled' ? 'Case Cancelled' :
                           notification.status?.toLowerCase() === 'investigating' ? 'Case Under Investigation' :
                           notification.status?.toLowerCase() === 'assigned' ? 'Case Assigned' :
                           'Case Pending'}
                        </Text>
                        <Text style={styles.notificationItemCategory}>{notification.category}</Text>
                        <Text style={styles.notificationItemTime}>
                          {new Date(notification.updated_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                      <Ionicons 
                        name={
                          notification.status?.toLowerCase() === 'resolved' ? 'checkmark-circle' :
                          (notification.status?.toLowerCase() === 'closed' && notification.remarks?.includes('Cancelled')) ? 'ban-circle' :
                          notification.status?.toLowerCase() === 'closed' ? 'close-circle' :
                          notification.status?.toLowerCase() === 'investigating' ? 'search-circle' :
                          notification.status?.toLowerCase() === 'assigned' ? 'person-circle' :
                          'time-circle'
                        } 
                        size={24} 
                        color={
                          notification.status?.toLowerCase() === 'resolved' ? '#34C759' :
                          (notification.status?.toLowerCase() === 'closed' && notification.remarks?.includes('Cancelled')) ? '#FF3B30' :
                          notification.status?.toLowerCase() === 'closed' ? '#999' :
                          notification.status?.toLowerCase() === 'investigating' ? '#007AFF' :
                          notification.status?.toLowerCase() === 'assigned' ? '#FF9500' :
                          '#FF9500'
                        } 
                      />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
};

export default Home;

