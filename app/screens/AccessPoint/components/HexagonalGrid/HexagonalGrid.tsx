import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Hexagon } from './Hexagon';

const { width: screenWidth } = Dimensions.get('window');
const hexSize = Math.min(screenWidth * 0.35, 120);

interface HexagonalGridProps {
  onHexagonPress?: (index: number, label: string) => void;
}

const categories = [
  { icon: 'warning', label: 'Violence', colors: ['#FFFFFF', '#FFE5E5'] },
  { icon: 'alert-circle', label: 'Threat', colors: ['#FFFFFF', '#FFE5E5'] },
  { icon: 'bag', label: 'Theft', colors: ['#FFFFFF', '#FFE5E5'] },
  { icon: 'construct', label: 'Vandalism', colors: ['#FFFFFF', '#FFE5E5'] },
  { icon: 'eye', label: 'Suspicious', colors: ['#FFFFFF', '#FFE5E5'] },
  { icon: 'shield', label: 'Emergency', colors: ['#FFFFFF', '#FFE5E5'] },
];

export const HexagonalGrid: React.FC<HexagonalGridProps> = ({ onHexagonPress }) => {
  // Calculate positions for proper honeycomb layout with smaller gaps
  // For flat-top hexagons, proper spacing is:
  // Horizontal offset: size * sqrt(3) / 2 ≈ size * 0.866
  // Vertical spacing: size * 0.75 (for interlocking pattern)
  // Reduced multipliers for smaller gaps
  const hexSpacing = hexSize * 0.75; // Reduced from 0.866 for smaller horizontal gap
  const rowHeight = hexSize * 0.65; // Reduced from 0.75 for smaller vertical gap
  
  // Calculate container dimensions to fit the pattern
  const containerWidth = hexSize * 2.8; // Width to fit the pattern
  const containerHeight = hexSize * 3.5; // Height to fit all rows
  
  // Calculate center position - center of the container
  const centerX = containerWidth / 2;
  const baseLeft = centerX; // Center point for the middle hexagon

  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }]}>
      {/* Row 1 - Top hexagon */}
      <View style={[styles.hex, { top: hexSize * 0.1, left: baseLeft - (hexSize / 2) }]}>
        <Hexagon
          size={hexSize}
          icon={categories[0].icon}
          label={categories[0].label}
          colors={categories[0].colors}
          onPress={() => onHexagonPress?.(0, categories[0].label)}
        />
      </View>

      {/* Row 2 - Top-left and Top-right */}
      <View style={[styles.hex, { top: rowHeight, left: baseLeft - (hexSize / 2) - hexSpacing }]}>
        <Hexagon
          size={hexSize}
          icon={categories[5].icon}
          label={categories[5].label}
          colors={categories[5].colors}
          onPress={() => onHexagonPress?.(5, categories[5].label)}
        />
      </View>
      <View style={[styles.hex, { top: rowHeight, left: baseLeft - (hexSize / 2) + hexSpacing }]}>
        <Hexagon
          size={hexSize}
          icon={categories[1].icon}
          label={categories[1].label}
          colors={categories[1].colors}
          onPress={() => onHexagonPress?.(1, categories[1].label)}
        />
      </View>

      {/* Row 3 - Center hexagon */}
      <View style={[styles.hex, { top: rowHeight * 2, left: baseLeft - (hexSize / 2) }]}>
        <Hexagon
          size={hexSize}
          icon="ellipsis-horizontal"
          isCenter={true}
          colors={['#FF6B6B', '#FF8787']}
          iconColor="#FFFFFF"
          onPress={() => onHexagonPress?.(-1, 'Other')}
        />
      </View>

      {/* Row 4 - Bottom-left and Bottom-right */}
      <View style={[styles.hex, { top: rowHeight * 3, left: baseLeft - (hexSize / 2) - hexSpacing }]}>
        <Hexagon
          size={hexSize}
          icon={categories[4].icon}
          label={categories[4].label}
          colors={categories[4].colors}
          onPress={() => onHexagonPress?.(4, categories[4].label)}
        />
      </View>
      <View style={[styles.hex, { top: rowHeight * 3, left: baseLeft - (hexSize / 2) + hexSpacing }]}>
        <Hexagon
          size={hexSize}
          icon={categories[2].icon}
          label={categories[2].label}
          colors={categories[2].colors}
          onPress={() => onHexagonPress?.(2, categories[2].label)}
        />
      </View>

      {/* Row 5 - Bottom hexagon */}
      <View style={[styles.hex, { top: rowHeight * 4 - hexSize * 0.1, left: baseLeft - (hexSize / 2) }]}>
        <Hexagon
          size={hexSize}
          icon={categories[3].icon}
          label={categories[3].label}
          colors={categories[3].colors}
          onPress={() => onHexagonPress?.(3, categories[3].label)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    position: 'relative',
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hex: {
    position: 'absolute',
  },
});

