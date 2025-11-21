import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ChatBox } from '../AccessPoint/components/ChatBox';
import CustomTabBar from '../AccessPoint/components/Customtabbar/CustomTabBar';
import { useAuth } from '../../contexts/AuthContext';
import { styles } from './styles';

const { width: screenWidth } = Dimensions.get('window');
const buttonSize = Math.min(screenWidth * 0.6, 220);

const Home: React.FC = () => {
  const { user, loadUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const handleSendMessage = (message: string) => {
    // TODO: Replace with actual API call to send message
    // Example: await supabase.from('messages').insert({ message, user_id: user?.id });
    console.log('Message sent:', message);
  };

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
          {/* SOS Button */}
          <View style={styles.sosButtonContainer}>
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
                style={[styles.sosButtonNeumorphic, {
                  width: buttonSize,
                  height: buttonSize,
                  borderRadius: buttonSize / 2,
                }]}
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
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* No Active Case Label */}
          <View style={styles.noActiveCaseContainer}>
            <Text style={styles.noActiveCaseText}>No Active Case</Text>
          </View>
        </ScrollView>

        {/* ChatBox Component */}
        <ChatBox onSendMessage={handleSendMessage} />

        {/* Bottom Navigation */}
        <CustomTabBar />
      </View>
    </View>
  );
};

export default Home;

