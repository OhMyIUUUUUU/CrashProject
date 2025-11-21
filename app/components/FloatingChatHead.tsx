import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { styles } from '../screens/Home/styles';

interface FloatingChatHeadProps {
  onPress: () => void;
  unreadCount?: number;
}

export const FloatingChatHead: React.FC<FloatingChatHeadProps> = ({ onPress, unreadCount = 0 }) => {
  return (
    <TouchableOpacity
      style={styles.floatingChatHead}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="chatbubble-ellipses" size={28} color="#FFFFFF" />
      {unreadCount > 0 && (
        <View style={styles.chatHeadBadge}>
          <Text style={styles.chatHeadBadgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

