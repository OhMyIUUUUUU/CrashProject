import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, PanResponder, Text, View } from 'react-native';
import { styles } from '../../../Home/styles';

const BUTTON_SIZE = 60;
const EDGE_MARGIN = 20;

interface FloatingChatHeadProps {
  onPress: () => void;
  unreadCount?: number;
}

export const FloatingChatHead: React.FC<FloatingChatHeadProps> = ({ onPress, unreadCount = 0 }) => {
  const screenData = Dimensions.get('window');
  const SCREEN_WIDTH = screenData.width;
  const SCREEN_HEIGHT = screenData.height;
  
  // Initial position: bottom right (accounting for bottom navigation ~100px)
  // Using transform, so we calculate from top-left (0,0)
  const initialX = SCREEN_WIDTH - BUTTON_SIZE - EDGE_MARGIN;
  const initialY = SCREEN_HEIGHT - BUTTON_SIZE - EDGE_MARGIN - 100; // 100px for bottom nav
  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const isDragging = useRef<boolean>(false);
  
  // Update position when dimensions change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const newX = window.width - BUTTON_SIZE - EDGE_MARGIN;
      const newY = window.height - BUTTON_SIZE - EDGE_MARGIN - 100;
      pan.setValue({ x: newX, y: newY });
    });
    
    return () => subscription?.remove();
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Start dragging if movement is significant
        const isMoving = Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
        if (isMoving) {
          isDragging.current = true;
        }
        return isMoving;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any).__getValue(),
          y: (pan.y as any).__getValue(),
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        
        // Calculate final position
        const currentX = (pan.x as any).__getValue() + gestureState.dx;
        const currentY = (pan.y as any).__getValue() + gestureState.dy;

        // Boundary constraints
        const minX = EDGE_MARGIN;
        const maxX = SCREEN_WIDTH - BUTTON_SIZE - EDGE_MARGIN;
        const minY = EDGE_MARGIN;
        const maxY = SCREEN_HEIGHT - BUTTON_SIZE - EDGE_MARGIN - 100; // Account for bottom navigation

        // Determine which edge to snap to (left or right)
        const snapX = currentX < SCREEN_WIDTH / 2 ? minX : maxX;
        
        // Clamp Y position
        const snapY = Math.max(minY, Math.min(maxY, currentY));

        // Animate to final position
        Animated.spring(pan, {
          toValue: { x: snapX, y: snapY },
          useNativeDriver: false,
          tension: 50,
          friction: 7,
        }).start();

        // Handle tap (not drag) - if movement was minimal, treat as tap
        const moveDistance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
        if (moveDistance < 10 && !isDragging.current) {
          // It's a tap, open chat
          onPress();
        }

        // Reset dragging state after a short delay
        setTimeout(() => {
          isDragging.current = false;
        }, 100);
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          borderRadius: BUTTON_SIZE / 2,
          backgroundColor: '#FF6B6B',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 1000,
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

