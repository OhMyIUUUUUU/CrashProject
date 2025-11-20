import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ChatBox } from '../AccessPoint/components/ChatBox';
import CustomTabBar from '../AccessPoint/components/Customtabbar/CustomTabBar';
import { useAuth } from '../../contexts/AuthContext';
import { styles } from './styles';

const Home: React.FC = () => {
  const { user, loadUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const handleSendMessage = (message: string) => {
    // TODO: Replace with actual API call to send message
    // Example: await supabase.from('messages').insert({ message, user_id: user?.id });
    console.log('Message sent:', message);
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

