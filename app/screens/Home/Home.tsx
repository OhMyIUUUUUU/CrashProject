import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { reverseGeocode } from '../../../utils/geocoding';
import { useAuth } from '../../contexts/AuthContext';
import { ActiveCase, useActiveCase } from '../../hooks/useActiveCase';
import { supabase } from '../../lib/supabase';
import { FloatingChatHead } from '../AccessPoint/components/Chatsystem/FloatingChatHead';
import CustomTabBar from '../AccessPoint/components/Customtabbar/CustomTabBar';
import { styles } from './styles';

const { width: screenWidth } = Dimensions.get('window');
const buttonSize = Math.min(screenWidth * 0.6, 220);

const Home: React.FC = () => {
  const router = useRouter();
  const { user, loadUser } = useAuth();
  const { activeCase, cancelReport, checkActiveCase, notifications, checkNotifications } = useActiveCase();
  const [isLoading, setIsLoading] = useState(true);
  const [sendingSOS, setSendingSOS] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<ActiveCase | null>(null);
  const [isCaseMinimized, setIsCaseMinimized] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sosCountdown, setSosCountdown] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sosCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const activeCaseRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingActiveCaseRef = useRef(false);
  const preFetchedDataRef = useRef<{ userInfo: any; location: any } | null>(null);
  
  // Ripple animation for SOS button
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;


  // Monitor network connectivity - redirect to offline mode if connection is lost
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      if (!isConnected) {
        router.replace('/screens/AccessPoint/components/OfflineEmergency/OfflineEmergency');
      }
    });

    return () => unsubscribe();
  }, [router]);

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
    // Load user data if not already loaded (with error handling)
    const loadUserData = async () => {
      try {
      if (!user) {
        await loadUser();
        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 200));
      }
        // Even if user is not loaded, continue (might be network issue)
      setIsLoading(false);
      } catch (error) {
        console.warn('Error loading user data, continuing anyway:', error);
        // Continue even if there's an error - user might be logged in locally
        setIsLoading(false);
      }
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
    // Scale down animation
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
    
    // Ripple effect - start (expands around the button)
    rippleScale.setValue(0.8);
    rippleOpacity.setValue(0.8);
    Animated.parallel([
      Animated.timing(rippleScale, {
        toValue: 1.5,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, rippleScale, rippleOpacity]);

  const handleSOSPressOut = useCallback(() => {
    // Scale back animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
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

  // Cleanup countdown and timeouts on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (sosCountdownIntervalRef.current) {
        clearInterval(sosCountdownIntervalRef.current);
      }
      if (activeCaseRefreshTimeoutRef.current) {
        clearTimeout(activeCaseRefreshTimeoutRef.current);
      }
    };
  }, []);

  // Send SOS with pre-fetched data (called immediately after countdown)
  const sendSOSWithPreFetchedData = useCallback(async (preFetched: { userInfo: any; location: any } | null) => {
    setSendingSOS(true);

    try {
      // 1. Get session
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id || null;
      const userEmail = session?.user?.email || null;

      if (!authUserId && !userEmail) {
        Alert.alert('Error', 'Please log in to send SOS');
        setSendingSOS(false);
        setSosCountdown(0);
        return;
      }

      // Use pre-fetched data if available, otherwise fetch now
      let userInfo = preFetched?.userInfo;
      let reporterId = null;
      let latitude: number;
      let longitude: number;

      if (preFetched?.userInfo && preFetched?.location) {
        // Use pre-fetched data - immediate!
        userInfo = preFetched.userInfo;
        reporterId = userInfo.user_id;
        latitude = preFetched.location.latitude;
        longitude = preFetched.location.longitude;
      } else {
        // Fallback: fetch data now (shouldn't happen if pre-fetch worked)
        // Try cached user data first
        if (user && user.email === userEmail) {
          reporterId = authUserId;
          userInfo = {
            user_id: authUserId,
            first_name: user.firstName,
            last_name: user.lastName,
            phone: user.phone,
            email: user.email,
            emergency_contact_name: user.emergencyContactName,
            emergency_contact_number: user.emergencyContactNumber,
          };
        }

        if (!userInfo) {
          const [userInfoResult, locationResult] = await Promise.allSettled([
            Promise.allSettled([
              authUserId ? supabase
                .from('tbl_users')
                .select('user_id, first_name, last_name, phone, email, emergency_contact_name, emergency_contact_number')
                .eq('user_id', authUserId)
                .maybeSingle() : Promise.resolve({ data: null, error: null }),
              userEmail ? supabase
                .from('tbl_users')
                .select('user_id, first_name, last_name, phone, email, emergency_contact_name, emergency_contact_number')
                .eq('email', userEmail)
                .maybeSingle() : Promise.resolve({ data: null, error: null })
            ]).then(results => {
              for (const result of results) {
                if (result.status === 'fulfilled' && result.value?.data && !result.value?.error) {
                  return result.value;
                }
              }
              return { data: null, error: null };
            }).catch(() => ({ data: null, error: null })),
            (async () => {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') {
                throw new Error('Location permission denied');
              }
              const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Low,
              });
              return {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
              };
            })()
          ]);

          if (userInfoResult.status === 'fulfilled' && userInfoResult.value?.data) {
            userInfo = userInfoResult.value.data;
            reporterId = userInfo.user_id;
          } else if (!userInfo) {
            reporterId = authUserId;
          }

          if (locationResult.status === 'rejected') {
            Alert.alert(
              'Location Permission Required',
              'Location permission is required to send SOS. Please enable it in settings.',
              [{ text: 'OK' }]
            );
            setSendingSOS(false);
            setSosCountdown(0);
            return;
          }

          latitude = locationResult.value.latitude;
          longitude = locationResult.value.longitude;
        } else {
          reporterId = userInfo.user_id;
          // Still need to get location
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
            accuracy: Location.Accuracy.Low,
          });
          latitude = currentLocation.coords.latitude;
          longitude = currentLocation.coords.longitude;
        }
      }

      if (!userInfo || !reporterId) {
        console.error('[Home] Error fetching user info from database - user not found or query failed');
        Alert.alert(
          'Error', 
          'Unable to fetch user information from database. Please make sure you are logged in and try again.',
          [{ text: 'OK' }]
        );
        setSendingSOS(false);
        setSosCountdown(0);
        return;
      }

      // 2. Create minimal description first (geocoding happens after SOS is sent)
      const userName = `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || 'User';
      
      // Simplified description for faster sending
      const description = `EMERGENCY SOS\nReporter: ${userName}\nPhone: ${userInfo.phone || 'N/A'}\nGPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\nTime: ${new Date().toLocaleString()}`;

      // 3. Call RPC to create report immediately (don't wait for geocoding)
      const { data, error } = await supabase.rpc('create_emergency_sos', {
        p_user_id: reporterId,
        p_lat: latitude,
        p_long: longitude,
        p_category: 'Emergency',
        p_description: description,
      });

      if (error) {
        console.error('[Home] SOS RPC error:', error.message || error);
        Alert.alert(
          'Error',
          `Failed to send SOS: ${error.message || 'Unknown error'}`,
          [{ text: 'OK' }]
        );
        setSendingSOS(false);
        setSosCountdown(0);
        return;
      }

      const reportId = data?.report_id;
      const assignedOfficeId = data?.assigned_office_id;
      const assignedOfficeName = data?.assigned_office_name;

      if (!reportId) {
        Alert.alert('Error', 'SOS created but no report_id returned.');
        setSendingSOS(false);
        setSosCountdown(0);
        return;
      }

      // 3. Update report with location details in background (non-blocking)
      // Geocoding happens asynchronously after SOS is sent
      reverseGeocode(latitude, longitude)
        .then(async (geocodeResult) => {
          if (geocodeResult.city || geocodeResult.barangay) {
            try {
              const updateData: { location_city?: string; location_barangay?: string; description?: string } = {};
              if (geocodeResult.city) {
                const cityName = geocodeResult.city.trim();
                updateData.location_city = cityName.endsWith(' City') ? cityName : `${cityName} City`;
              }
              if (geocodeResult.barangay) {
                updateData.location_barangay = geocodeResult.barangay;
              }
              
              // Update description with full details
              const fullDescription = `EMERGENCY SOS ALERT\n\n` +
                `Reporter: ${userName}\n` +
                `Phone: ${userInfo.phone || 'N/A'}\n` +
                `Email: ${userInfo.email || 'N/A'}\n` +
                `Emergency Contact: ${userInfo.emergency_contact_name || 'N/A'} (${userInfo.emergency_contact_number || 'N/A'})\n` +
                `Location: ${geocodeResult.fullAddress || `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}\n` +
                `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n` +
                `Role: Witness\n` +
                `Time: ${new Date().toLocaleString()}`;
              updateData.description = fullDescription;

              await supabase
                .from('tbl_reports')
                .update(updateData)
                .eq('report_id', reportId);
            } catch (updateError) {
              // Silently fail - report is already created
              console.error('[Home] Error updating report location:', updateError);
            }
          }
        })
        .catch(() => {
          // Silently fail - geocoding failed but report is already created
        });

      // Refresh active case in background (don't wait)
      checkActiveCase().catch(() => {
        // Silently fail - will retry on next check
      });

      const reportIdForDisplay = `${reportId}`.substring(0, 8) + '...';
      Alert.alert(
        'SOS Sent Successfully',
        `Your emergency SOS has been sent and assigned to ${assignedOfficeName || 'the nearest station'}.\n\nReport ID: ${reportIdForDisplay}`,
        [{ 
          text: 'OK',
          onPress: () => {
            // Navigate immediately, refresh in background
            checkActiveCase().catch(() => {});
            router.push({
              pathname: '/screens/Home/ChatScreen',
              params: { report_id: reportId },
            });
          }
        }]
      );
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
  }, [checkActiveCase, user, router]);

  // Original sendSOS function (for backward compatibility)
  const sendSOS = useCallback(async () => {
    // Call with null to fetch data now
    await sendSOSWithPreFetchedData(null);
  }, [sendSOSWithPreFetchedData]);

  const handleSOSPress = useCallback(async () => {
    // If countdown is active, allow canceling by tapping again
    if (sosCountdown > 0) {
      // Cancel countdown
      if (sosCountdownIntervalRef.current) {
        clearInterval(sosCountdownIntervalRef.current);
        sosCountdownIntervalRef.current = null;
      }
      setSosCountdown(0);
      setSendingSOS(false);
      preFetchedDataRef.current = null;
      return;
    }
    
    // Guard against sending while already sending
    if (sendingSOS) {
      return;
    }
    
    // Check database directly for active case (fetch from database only)
    const { data: { session } } = await supabase.auth.getSession();
    const authUserId = session?.user?.id || null;
    const userEmail = session?.user?.email || null;

    let reporterId = null;
    if (authUserId) {
      const { data: userData } = await supabase
        .from('tbl_users')
        .select('user_id')
        .eq('user_id', authUserId)
        .maybeSingle();
      if (userData) reporterId = userData.user_id;
    }

    if (!reporterId && userEmail) {
      const { data: userData } = await supabase
        .from('tbl_users')
        .select('user_id')
        .eq('email', userEmail)
        .maybeSingle();
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
        const status = report.status;
        // Only show active cases: Pending, Acknowledged, En Route, On Scene
        return status === 'Pending' || status === 'Acknowledged' || status === 'En Route' || status === 'On Scene';
      }) || [];

      if (activeReports.length > 0) {
        currentActiveCase = activeReports[0] as any;
      }
    }

    // ALWAYS check for active case first - if exists, show it immediately
    if (currentActiveCase && currentActiveCase.report_id) {
      
      // Use assigned_office_id as office_id
      const officeId = currentActiveCase.assigned_office_id;
      const officeName = (currentActiveCase as any).office_name;
      
      const statusEmoji = currentActiveCase.status === 'Pending' ? '🟠' : 
                         currentActiveCase.status === 'Acknowledged' ? '🟡' :
                         currentActiveCase.status === 'En Route' ? '🔵' :
                         currentActiveCase.status === 'On Scene' ? '🟢' : '🔵';
      
      const caseInfo = `🚨 ACTIVE CASE DETECTED\n\n` +
        `${statusEmoji} Status: ${currentActiveCase.status.toUpperCase()}\n` +
        `📁 Category: ${currentActiveCase.category}\n` +
        `📅 Created: ${new Date(currentActiveCase.created_at).toLocaleString()}\n` +
        (officeName ? `🏢 Office: ${officeName}\n` : '🏢 Office: Not assigned yet\n') +
        (currentActiveCase.description ? `\n📝 Description:\n${currentActiveCase.description.substring(0, 120)}${currentActiveCase.description.length > 120 ? '...' : ''}` : '');
      
      
      Alert.alert(
        'Active Case',
        caseInfo,
        [
          { 
            text: '💬 Open Chat', 
            onPress: () => {
              if (activeCase) {
                router.push({
                  pathname: '/screens/Home/ChatScreen',
                  params: { report_id: activeCase.report_id },
                });
              }
            }
          },
          { 
            text: '👁️ View Details', 
            onPress: () => {
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 400, animated: true });
              }, 100);
            }
          },
          { 
            text: '🗑️ Cancel Report', 
            onPress: () => {
              handleCancelReport();
            }, 
            style: 'destructive' 
          },
          { text: 'Close', style: 'cancel' }
        ],
        { cancelable: true }
      );
      return; // Stop here - don't proceed with SOS
    }
    // No active case - start countdown and pre-fetch data simultaneously
    
    // Start 5-second countdown
    setSosCountdown(5);
    setSendingSOS(true);

    // Clear any existing interval
    if (sosCountdownIntervalRef.current) {
      clearInterval(sosCountdownIntervalRef.current);
    }

    // Pre-fetch data during countdown for immediate sending
    const preFetchData = async () => {
      try {
        // Get session
        const { data: { session } } = await supabase.auth.getSession();
        const authUserId = session?.user?.id || null;
        const userEmail = session?.user?.email || null;

        if (!authUserId && !userEmail) {
          return { userInfo: null, location: null };
        }

        // Pre-fetch user info and location in parallel
        const [userInfoResult, locationResult] = await Promise.allSettled([
          // Try cached user first, then fetch if needed
          user && user.email === userEmail ? Promise.resolve({ 
            data: {
              user_id: authUserId,
              first_name: user.firstName,
              last_name: user.lastName,
              phone: user.phone,
              email: user.email,
              emergency_contact_name: user.emergencyContactName,
              emergency_contact_number: user.emergencyContactNumber,
            }, 
            error: null 
          }) :
          Promise.allSettled([
            authUserId ? supabase
              .from('tbl_users')
              .select('user_id, first_name, last_name, phone, email, emergency_contact_name, emergency_contact_number')
              .eq('user_id', authUserId)
              .maybeSingle() : Promise.resolve({ data: null, error: null }),
            userEmail ? supabase
              .from('tbl_users')
              .select('user_id, first_name, last_name, phone, email, emergency_contact_name, emergency_contact_number')
              .eq('email', userEmail)
              .maybeSingle() : Promise.resolve({ data: null, error: null })
          ]).then(results => {
            for (const result of results) {
              if (result.status === 'fulfilled' && result.value?.data && !result.value?.error) {
                return result.value;
              }
            }
            return { data: null, error: null };
          }).catch(() => ({ data: null, error: null })),
          // Pre-fetch location with LOW accuracy for speed
          (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
              throw new Error('Location permission denied');
            }
            const currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
            });
            return {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            };
          })()
        ]);

        let userInfo = null;
        if (userInfoResult.status === 'fulfilled' && userInfoResult.value?.data) {
          userInfo = userInfoResult.value.data;
        }

        let location = null;
        if (locationResult.status === 'fulfilled') {
          location = locationResult.value;
        }

        return { userInfo, location };
      } catch (error) {
        console.error('[Home] Error pre-fetching data:', error);
        return { userInfo: null, location: null };
      }
    };

    // Start pre-fetching immediately (using preFetchedDataRef declared at component level)
    preFetchData().then(data => {
      preFetchedDataRef.current = data;
    });

    // Start countdown (user can cancel by tapping the button again)
    sosCountdownIntervalRef.current = setInterval(() => {
      setSosCountdown((prev) => {
        if (prev <= 1) {
          // Countdown finished, wait 2 seconds to ensure data accuracy
          if (sosCountdownIntervalRef.current) {
            clearInterval(sosCountdownIntervalRef.current);
            sosCountdownIntervalRef.current = null;
          }
          
          // Set countdown to show "Sending..." for 2 seconds
          setSosCountdown(-1); // Use -1 to indicate "sending" state
          
          // Wait 2 seconds to ensure GPS and data are accurate, then send
          setTimeout(() => {
            sendSOSWithPreFetchedData(preFetchedDataRef.current).catch((error) => {
              console.error('[Home] Error sending SOS with pre-fetched data:', error);
            });
          }, 2000);
          
          return -1; // Return -1 to show "Sending..." state
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
              {/* Ripple effect - positioned outside button to be visible around it */}
              <Animated.View
                style={{
                  position: 'absolute',
                  width: buttonSize * 1.5,
                  height: buttonSize * 1.5,
                  borderRadius: (buttonSize * 1.5) / 2,
                  backgroundColor: 'rgba(255, 107, 107, 0.3)',
                  transform: [{ scale: rippleScale }],
                  opacity: rippleOpacity,
                  top: -buttonSize * 0.25,
                  left: -buttonSize * 0.25,
                  zIndex: 0,
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  handleSOSPress();
                }}
                onPressIn={handleSOSPressIn}
                onPressOut={handleSOSPressOut}
                activeOpacity={1}
                disabled={sendingSOS || sosCountdown > 0 || sosCountdown === -1}
                style={[
                  styles.sosButtonNeumorphic,
                  {
                    width: buttonSize,
                    height: buttonSize,
                    borderRadius: buttonSize / 2,
                    opacity: sendingSOS ? 0.7 : 1,
                    zIndex: 1,
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
                    ) : sosCountdown === -1 ? (
                      <>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                        <Text style={[styles.sosButtonSubtext, { fontSize: buttonSize * 0.08, marginTop: 8 }]}>
                          Sending...
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.sosButtonText, { fontSize: buttonSize * 0.2 }]}>
                        SOS
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
            
            {/* Cancel Panel - Shows during countdown */}
            {sosCountdown > 0 && (
              <View style={styles.cancelPanel}>
                <Text style={styles.cancelPanelText}>Emergency SOS will be sent in {sosCountdown} seconds</Text>
                <TouchableOpacity
                  onPress={() => {
                    // Cancel countdown
                    if (sosCountdownIntervalRef.current) {
                      clearInterval(sosCountdownIntervalRef.current);
                      sosCountdownIntervalRef.current = null;
                    }
                    setSosCountdown(0);
                    setSendingSOS(false);
                    preFetchedDataRef.current = null;
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
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
                    backgroundColor: activeCase.status === 'Pending' ? '#FF9500' : 
                                    activeCase.status === 'Acknowledged' ? '#FFCC00' :
                                    activeCase.status === 'En Route' ? '#007AFF' :
                                    activeCase.status === 'On Scene' ? '#34C759' : 
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
            onPress={() => {
              router.push({
                pathname: '/screens/Home/ChatScreen',
                params: { report_id: activeCase.report_id },
              });
            }}
            unreadCount={0} // TODO: Calculate unread count from messages
          />
        )}


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
                        selectedNotification.status === 'Resolved' ? 'checkmark-circle' :
                        selectedNotification.status === 'Canceled' ? 'close-circle' :
                        selectedNotification.status === 'Acknowledged' ? 'person-circle' :
                        selectedNotification.status === 'En Route' ? 'car' :
                        selectedNotification.status === 'On Scene' ? 'location' :
                        'time'
                      } 
                      size={64} 
                      color={
                        selectedNotification.status === 'Resolved' ? '#34C759' :
                        selectedNotification.status === 'Canceled' ? '#FF3B30' :
                        selectedNotification.status === 'Acknowledged' ? '#FFCC00' :
                        selectedNotification.status === 'En Route' ? '#007AFF' :
                        selectedNotification.status === 'On Scene' ? '#34C759' :
                        '#FF9500'
                      } 
                    />
                    <Text style={styles.notificationMessageText}>
                      {selectedNotification.status === 'Resolved' ? 'Your case is already resolved' :
                       selectedNotification.status === 'Canceled' ? 'Your case has been cancelled' :
                       selectedNotification.status === 'Acknowledged' ? 'Your case has been acknowledged' :
                       selectedNotification.status === 'En Route' ? 'Help is on the way' :
                       selectedNotification.status === 'On Scene' ? 'Officers are on scene' :
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
                            notification.status === 'Resolved' ? '#34C759' :
                            notification.status === 'Canceled' ? '#FF3B30' :
                            notification.status === 'Acknowledged' ? '#FFCC00' :
                            notification.status === 'En Route' ? '#007AFF' :
                            notification.status === 'On Scene' ? '#34C759' :
                            '#FF9500' // Pending - orange
                        }
                      ]} />
                      <View style={styles.notificationItemContent}>
                        <Text style={styles.notificationItemTitle}>
                          {notification.status === 'Resolved' ? 'Case Resolved' :
                           notification.status === 'Canceled' ? 'Case Canceled' :
                           notification.status === 'Acknowledged' ? 'Case Acknowledged' :
                           notification.status === 'En Route' ? 'Help En Route' :
                           notification.status === 'On Scene' ? 'Officers On Scene' :
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
                          notification.status === 'Resolved' ? 'checkmark-circle' :
                          notification.status === 'Canceled' ? 'close-circle' :
                          notification.status === 'Acknowledged' ? 'person-circle' :
                          notification.status === 'En Route' ? 'car' :
                          notification.status === 'On Scene' ? 'location' :
                          'time'
                        } 
                        size={24} 
                        color={
                          notification.status === 'Resolved' ? '#34C759' :
                          notification.status === 'Canceled' ? '#FF3B30' :
                          notification.status === 'Acknowledged' ? '#FFCC00' :
                          notification.status === 'En Route' ? '#007AFF' :
                          notification.status === 'On Scene' ? '#34C759' :
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

