import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import CustomTabBar from '../components/Customtabbar/CustomTabBar';
import ActiveCaseCard from '../components/Home/ActiveCaseCard';
import FloatingChatButton from '../components/Home/FloatingChatButton';
import NotificationDetailModal from '../components/Home/NotificationDetailModal';
import NotificationHeader from '../components/Home/NotificationHeader';
import NotificationListModal from '../components/Home/NotificationListModal';
import SOSSection from '../components/Home/SOSSection';
import { useAuth } from '../contexts/AuthContext';
import { ActiveCase, useActiveCase } from '../hooks/useActiveCase';
import { supabase } from '../lib/supabase';
import { reverseGeocode } from '../utils/geocoding';
import { formatPhilippineDateTimeLong } from '../utils/philippineTime';
import { styles } from './styles';

const Home: React.FC = () => {
  const router = useRouter();
  const { user, loadUser } = useAuth();
  // Ensure hook is called at top level
  const { activeCase, loading: loadingActiveCase, checkActiveCase, cancelReport, notifications, checkNotifications, setActiveCase } = useActiveCase();

  // We still need this reference for intervals causing re-renders/stale closures if not careful, 
  // but for the direct call inside useCallback, we can use the destructured 'setActiveCase'

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

  // Monitor network connectivity - redirect to offline mode if connection is lost
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      if (!isConnected) {
        router.replace('/components/OfflineEmergency/OfflineEmergency');
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

  const handleCancelSOSCountdown = useCallback(() => {
    if (sosCountdownIntervalRef.current) {
      clearInterval(sosCountdownIntervalRef.current);
      sosCountdownIntervalRef.current = null;
    }
    setSosCountdown(0);
    setSendingSOS(false);
    preFetchedDataRef.current = null;
  }, []);

  // Send SOS with pre-fetched data (optimistic update)
  const sendSOSWithPreFetchedData = useCallback(async (preFetched: { userInfo: any; location: any } | null) => {
    // 1. FAST PATH: Optimistic Update using cached/available data
    // We want to show the UI update in frame 1, so no awaits here if possible.

    // Get timestamp and user
    const timestamp = new Date().toISOString();
    let authUser = user; // From context

    // Ideally we'd have the auth ID, but if not we can guess or wait slightly in background
    // If we are logged in, `user` object from useAuth should be populated

    // Use pre-fetched location OR 0,0 (we will update it in background)
    // If pre-fetched is null, we assume we can get it fast, but to be INSTANT we default to 0,0 or last known
    let latitude = preFetched?.location?.latitude || 0;
    let longitude = preFetched?.location?.longitude || 0;

    const tempId = `temp-${Date.now()}`;

    // Construct optimistic case immediately
    const optimisticCase: ActiveCase = {
      report_id: tempId,
      reporter_id: 'unknown', // Will fill in background
      assigned_office_id: null,
      category: 'Emergency',
      description: 'Emergency SOS - Sending...',
      status: 'Pending',
      latitude: latitude,
      longitude: longitude,
      created_at: timestamp,
      updated_at: timestamp,
      office_name: 'Assigning...',
      remarks: null,
      location_city: null,
      location_barangay: null
    };

    // Show it NOW
    setSendingSOS(true);
    // @ts-ignore
    if (typeof setActiveCase === 'function') {
      // @ts-ignore
      setActiveCase(optimisticCase);
    }

    // 2. Background Sync
    // Now we do the heavy lifting without blocking the UI
    (async () => {
      try {
        // Get valid session/user
        // If context user is missing, fallback to session
        let reporterId = null;
        let userInfo = authUser ? { ...authUser, user_id: authUser.id } : null; // Context user doesn't have ID field usually, wait, UserData interface has email but maybe not ID

        const { data: { session } } = await supabase.auth.getSession();
        const authUserId = session?.user?.id;

        if (!authUserId) {
          // Not logged in - revert
          setSendingSOS(false);
          setSosCountdown(0);
          // @ts-ignore
          setActiveCase(null);
          Alert.alert('Error', 'Please log in to send SOS');
          return;
        }

        reporterId = authUserId;

        // Fetch real user info if missing
        if (!userInfo && !preFetched?.userInfo) {
          const { data: uData } = await supabase.from('tbl_users').select('*').eq('user_id', authUserId).maybeSingle();
          userInfo = uData;
        } else if (preFetched?.userInfo) {
          userInfo = preFetched.userInfo;
        }

        // Get location if missing (CRITICAL)
        if (latitude === 0 && longitude === 0) {
          // Try last known first (fast)
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (lastKnown) {
            latitude = lastKnown.coords.latitude;
            longitude = lastKnown.coords.longitude;
          } else {
            // Must wait for current
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            latitude = loc.coords.latitude;
            longitude = loc.coords.longitude;
          }

          // Update optimistic case with location
          optimisticCase.latitude = latitude;
          optimisticCase.longitude = longitude;
          // @ts-ignore
          setActiveCase({ ...optimisticCase });
        }

        const userName = userInfo ? `${userInfo.firstName || userInfo.firstName || ''} ${userInfo.lastName || userInfo.lastName || ''}`.trim() : 'User';
        const description = `EMERGENCY SOS\nReporter: ${userName}\nPhone: ${userInfo?.phone || 'N/A'}\nGPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\nTime: ${formatPhilippineDateTimeLong(new Date())}`;

        const { data, error } = await supabase.rpc('create_emergency_sos', {
          p_user_id: reporterId,
          p_lat: latitude,
          p_long: longitude,
          p_category: 'Emergency',
          p_description: description,
        });

        if (error) throw error;

        const realReportId = data?.report_id;
        const assignedOfficeName = data?.assigned_office_name;

        // Update state with confirmed data
        const confirmedCase: ActiveCase = {
          ...optimisticCase,
          report_id: realReportId,
          description: description,
          assigned_office_id: data?.assigned_office_id,
          office_name: assignedOfficeName,
          status: 'Pending',
          reporter_id: reporterId
        };

        // @ts-ignore
        setActiveCase(confirmedCase);
        setSendingSOS(false);
        setSosCountdown(0);

        // Geocode in background
        reverseGeocode(latitude, longitude).then(async (res) => {
          if (res.city || res.barangay) {
            const updateData: any = {};
            if (res.city) updateData.location_city = `${res.city} City`;
            if (res.barangay) updateData.location_barangay = res.barangay;

            const fullDesc = description.replace(
              `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              res.fullAddress || `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            );
            updateData.description = fullDesc;

            await supabase.from('tbl_reports').update(updateData).eq('report_id', realReportId);
          }
        }).catch(console.error);

        // Navigate to chat faster
        setTimeout(() => {
          router.push({
            pathname: '/screens/ChatScreen',
            params: { report_id: realReportId, office_name: assignedOfficeName || 'Police Station' },
          } as any);
        }, 300); // Super fast transition

      } catch (error: any) {
        console.error('Error sending SOS:', error);
        Alert.alert('Error', 'Failed to send SOS. Please try again.');
        setSendingSOS(false);
        setSosCountdown(0);
        // Revert
        // @ts-ignore
        setActiveCase(null);
      }
    })();

  }, [checkActiveCase, user, router]);

  const handleSOSPress = useCallback(async () => {
    // If countdown is active, allow canceling by tapping again
    if (sosCountdown > 0) {
      handleCancelSOSCountdown();
      return;
    }

    // Guard against sending while already sending
    if (sendingSOS) {
      return;
    }

    // If there is already an active case in state, show it instead of creating a new SOS
    if (activeCase && activeCase.report_id) {
      const officeName = activeCase.office_name;
      const statusEmoji = activeCase.status === 'Pending' ? '🟠' :
        activeCase.status === 'Acknowledged' ? '🟡' :
          activeCase.status === 'En Route' ? '🔵' :
            activeCase.status === 'On Scene' ? '🟢' : '🔵';

      const gpsLine = activeCase.latitude && activeCase.longitude
        ? `📍 GPS: ${Number(activeCase.latitude).toFixed(6)}, ${Number(activeCase.longitude).toFixed(6)}\n`
        : '';

      const caseInfo = `🚨 ACTIVE CASE DETECTED\n\n` +
        `${statusEmoji} Status: ${activeCase.status.toUpperCase()}\n` +
        `📁 Category: ${activeCase.category}\n` +
        `📅 Created: ${formatPhilippineDateTimeLong(activeCase.created_at)}\n` +
        gpsLine +
        (officeName ? `🏢 Office: ${officeName}\n` : '🏢 Office: Not assigned yet\n') +
        (activeCase.description ? `\n📝 Description:\n${activeCase.description.substring(0, 120)}${activeCase.description.length > 120 ? '...' : ''}` : '');

      Alert.alert(
        'Active Case',
        caseInfo,
        [
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
    // We'll only set sendingSOS to true once we actually start sending

    // Clear any existing interval
    if (sosCountdownIntervalRef.current) {
      clearInterval(sosCountdownIntervalRef.current);
    }

    // Pre-fetch data during countdown for faster sending once timer ends
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
          // Countdown finished - send SOS immediately
          if (sosCountdownIntervalRef.current) {
            clearInterval(sosCountdownIntervalRef.current);
            sosCountdownIntervalRef.current = null;
          }

          // Set countdown back to 0 and send SOS now using any pre-fetched data
          setSosCountdown(0);

          // Send SOS now using any pre-fetched data
          sendSOSWithPreFetchedData(preFetchedDataRef.current).catch((error) => {
            console.error('[Home] Error sending SOS with pre-fetched data:', error);
          });

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return; // Stop here, countdown will trigger sendSOS
  }, [sosCountdown, sendingSOS, activeCase, handleCancelReport, user, sendSOSWithPreFetchedData, handleCancelSOSCountdown]);

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
        <NotificationHeader
          count={notifications.length}
          onPress={async () => {
            await checkNotifications();
            setNotificationModalVisible(true);
          }}
        />

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
          {/* SOS Section */}
          <SOSSection
            onPress={handleSOSPress}
            onCancelCountdown={handleCancelSOSCountdown}
            sendingSOS={sendingSOS}
            activeCase={!!activeCase}
            isCaseMinimized={isCaseMinimized}
            countdown={sosCountdown}
          />

          {/* Active Case Info or No Active Case Label */}
          <ActiveCaseCard
            activeCase={activeCase}
            isMinimized={isCaseMinimized}
            onToggleMinimize={() => setIsCaseMinimized(!isCaseMinimized)}
            onCancelReport={handleCancelReport}
            cancelling={cancelling}
            cancelCountdown={countdown}
          />
        </ScrollView>

        {/* Floating Chat Head - quick access to chat for active case */}
        <FloatingChatButton activeCase={activeCase} />

        {/* Bottom Navigation */}
        <CustomTabBar />

        {/* Notification Detail Panel */}
        <NotificationDetailModal
          visible={selectedNotification !== null}
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />

        {/* Notification Modal */}
        <NotificationListModal
          visible={notificationModalVisible}
          notifications={notifications}
          onClose={() => setNotificationModalVisible(false)}
          onSelect={(notification) => {
            setSelectedNotification(notification);
            setNotificationModalVisible(false);
          }}
        />
      </View>
    </View>
  );
};

export default Home;
