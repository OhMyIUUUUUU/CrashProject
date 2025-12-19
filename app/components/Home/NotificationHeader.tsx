import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../screens/styles';

interface NotificationHeaderProps {
  count: number;
  onPress: () => void;
}

const NotificationHeader: React.FC<NotificationHeaderProps> = ({ count, onPress }) => {
  return (
    <View style={styles.notificationHeader}>
      <TouchableOpacity
        style={styles.notificationIconButton}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons name="notifications" size={28} color="#FF6B6B" />
        {count > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>
              {count > 9 ? '9+' : count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default NotificationHeader;
