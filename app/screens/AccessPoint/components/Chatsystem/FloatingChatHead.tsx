import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Animated, Dimensions, PanResponder, Text, View } from 'react-native';
import { styles } from '../../../Home/styles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FloatingChatHeadProps {
  onPress: () => void;
  unreadCount?: number;
}

export const FloatingChatHead: React.FC<FloatingChatHeadProps> = ({ onPress, unreadCount = 0 }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const dragStartPosition = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Start dragging if movement is significant
        const moved = Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
        if (moved) {
          hasMoved.current = true;
        }
        return moved;
      },
      onPanResponderGrant: (_, gestureState) => {
        hasMoved.current = false;
        dragStartPosition.current = { x: gestureState.x0, y: gestureState.y0 };
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        // Check if it was a tap (not a drag)
        const movedDistance = Math.sqrt(
          Math.pow(gestureState.dx, 2) + Math.pow(gestureState.dy, 2)
        );

        if (!hasMoved.current || movedDistance < 10) {
          // It's a tap - trigger onPress
          onPress();
        } else {
          // It was a drag - snap to edges
          const currentX = (pan.x as any)._value;
          const currentY = (pan.y as any)._value;
          const buttonWidth = 60; // Approximate button width
          const buttonHeight = 60; // Approximate button height
          const tabBarHeight = 80; // Approximate tab bar height

          // Calculate boundaries
          const minX = 0;
          const maxX = SCREEN_WIDTH - buttonWidth;
          const minY = 0;
          const maxY = SCREEN_HEIGHT - buttonHeight - tabBarHeight;

          // Snap to nearest edge (left or right)
          let finalX = currentX;
          if (currentX < SCREEN_WIDTH / 2) {
            // Snap to left edge
            finalX = 10;
          } else {
            // Snap to right edge
            finalX = maxX - 10;
          }

          // Keep Y within bounds
          let finalY = Math.max(minY + 10, Math.min(maxY - 10, currentY));

          Animated.spring(pan, {
            toValue: { x: finalX, y: finalY },
            useNativeDriver: false,
            tension: 50,
            friction: 7,
          }).start();
        }

        hasMoved.current = false;
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.floatingChatHead,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Ionicons name="chatbubble-ellipses" size={28} color="#FFFFFF" />
      {unreadCount > 0 && (
        <View style={styles.chatHeadBadge}>
          <Text style={styles.chatHeadBadgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

