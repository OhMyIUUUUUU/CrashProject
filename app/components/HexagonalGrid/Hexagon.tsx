import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, Polygon, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

interface HexagonProps {
  size: number;
  icon?: string;
  label?: string;
  onPress?: () => void;
  isCenter?: boolean;
  colors?: string[];
  iconColor?: string;
}

// Calculate hexagon points
const getHexagonPoints = (size: number): string => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2;
  const points: string[] = [];
  
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // Start at top
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  
  return points.join(' ');
};

export const Hexagon: React.FC<HexagonProps> = ({
  size,
  icon,
  label,
  onPress,
  isCenter = false,
  colors = ['#FFFFFF', '#FFE5E5'],
  iconColor = '#FF6B6B',
}) => {
  const points = getHexagonPoints(size);
  const iconSize = size * 0.35;
  const uniqueId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  const [showTooltip, setShowTooltip] = React.useState(false);

  const handlePress = () => {
    if (label) {
      setShowTooltip(true);
      // Hide tooltip after 1 second
      setTimeout(() => {
        setShowTooltip(false);
      }, 1000);
    }
    onPress?.();
  };

  const hexagonContent = (
    <View style={styles.wrapper}>
      <View style={[styles.container, { width: size, height: size, transform: [{ rotate: '30deg' }] }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <SvgLinearGradient id={uniqueId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors[0]} stopOpacity="1" />
              <Stop offset="100%" stopColor={colors[1] || colors[0]} stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>
          <Polygon
            points={points}
            fill={`url(#${uniqueId})`}
            stroke={isCenter ? "#FFFFFF" : "#FF6B6B"}
            strokeWidth={isCenter ? "3" : "2"}
          />
        </Svg>
        {icon && (
          <View style={[styles.iconContainer, { width: size, height: size, transform: [{ rotate: '-30deg' }] }]}>
            <Ionicons name={icon as any} size={iconSize} color={iconColor} />
          </View>
        )}
      </View>
      {showTooltip && label && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{label}</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        {hexagonContent}
      </TouchableOpacity>
    );
  }

  return hexagonContent;
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltip: {
    position: 'absolute',
    top: -45,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

