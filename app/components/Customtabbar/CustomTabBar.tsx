import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

type ScreenType = "Home" | "Report" | "Profile";

interface ScreenConfig {
  name: ScreenType;
  path: string;
  icon: string;
  segment: string;
}

// Module-level state to persist across component remounts
let persistentPositions = {
  left: "Report" as ScreenType,
  center: "Home" as ScreenType,
  right: "Profile" as ScreenType,
};

export default function CustomTabBar() {
  const router = useRouter();
  const segments = useSegments();

  // State to manage positions (left, center, right)
  // Initialize from persistent state
  const [positions, setPositions] = useState({
    left: persistentPositions.left,
    center: persistentPositions.center,
    right: persistentPositions.right,
  });

  // Sync state with persistent value on mount
  useEffect(() => {
    setPositions({
      left: persistentPositions.left,
      center: persistentPositions.center,
      right: persistentPositions.right,
    });
  }, []);

  // Auto-update positions when route changes to ensure current route is in center
  useEffect(() => {
    const currentScreen = currentRoute as ScreenType;
    
    // Only update if current route is not already in center
    setPositions(prev => {
      if (prev.center === currentScreen) {
        // Already in center, no change needed
        return prev;
      }
      
      // Find where the current screen is and swap it with center
      let newPositions = { ...prev };
      
      if (prev.left === currentScreen) {
        newPositions = {
          ...prev,
          center: currentScreen,
          left: prev.center,
        };
        updatePositions(newPositions);
        return newPositions;
      }
      
      if (prev.right === currentScreen) {
        newPositions = {
          ...prev,
          center: currentScreen,
          right: prev.center,
        };
        updatePositions(newPositions);
        return newPositions;
      }
      
      // Current screen not found in positions, return unchanged
      return prev;
    });
  }, [currentRoute]);

  // Update persistent state whenever positions change
  const updatePositions = (newPositions: typeof positions) => {
    persistentPositions = { ...newPositions };
    setPositions(newPositions);
  };

  const allRoutes: Record<ScreenType, ScreenConfig> = {
    Home: { name: "Home", path: "/screens/Home", icon: "home", segment: "Home" },
    Report: { name: "Report", path: "/screens/Report", icon: "document-text", segment: "Report" },
    Profile: { name: "Profile", path: "/screens/Profile", icon: "person", segment: "Profile" },
  };

  // Get current route name from segments
  const currentRoute = segments[segments.length - 1] || "Home";

  // Handle left tab click - swap left with center
  const handleLeftClick = () => {
    const clickedScreen = positions.left;
    const targetPath = allRoutes[clickedScreen].path;
    const targetSegment = allRoutes[clickedScreen].segment;
    
    // Update positions first
    setPositions(prev => {
      const newPositions = {
        ...prev,
        center: prev.left,
        left: prev.center,
      };
      updatePositions(newPositions);
      return newPositions;
    });
    
    // Navigate after state update (outside of setState callback)
    if (currentRoute === targetSegment) {
      router.replace(targetPath as any);
    } else {
      router.push(targetPath as any);
    }
  };

  // Handle right tab click - swap right with center
  const handleRightClick = () => {
    const clickedScreen = positions.right;
    const targetPath = allRoutes[clickedScreen].path;
    const targetSegment = allRoutes[clickedScreen].segment;
    
    // Update positions first
    setPositions(prev => {
      const newPositions = {
        ...prev,
        center: prev.right,
        right: prev.center,
      };
      updatePositions(newPositions);
      return newPositions;
    });
    
    // Navigate after state update (outside of setState callback)
    if (currentRoute === targetSegment) {
      router.replace(targetPath as any);
    } else {
      router.push(targetPath as any);
    }
  };

  // Handle center button click - find Home and swap with center (or do nothing if center is Home)
  const handleCenterClick = () => {
    setPositions(prev => {
      // Find where Home is and swap it with center
      if (prev.left === "Home") {
        const newPositions: typeof prev = {
          ...prev,
          center: "Home" as ScreenType,
          left: prev.center,
        };
        updatePositions(newPositions);
        return newPositions;
      }
      
      if (prev.right === "Home") {
        const newPositions: typeof prev = {
          ...prev,
          center: "Home" as ScreenType,
          right: prev.center,
        };
        updatePositions(newPositions);
        return newPositions;
      }
      
      // If center is already Home: NO RESET, NO CHANGE
      return prev;
    });

    const homePath = allRoutes["Home"].path;
    
    // Navigate to Home
    if (currentRoute === "Home") {
      router.replace(homePath as any);
    } else {
      router.push(homePath as any);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Rounded background */}
      <View style={styles.tabBarBackground} />

      {/* Floating Center Button - shows positions.center */}
      <View style={styles.floatingButtonContainer}>
        {/* The main rounded rectangle part */}
        <View style={styles.baseShape} />
        
        {/* The circular button part that overlaps */}
        <TouchableOpacity
          onPress={handleCenterClick}
          style={styles.circularButton}
          activeOpacity={0.8}
        >
          <View style={styles.whiteCircle}>
            <Ionicons 
              name={allRoutes[positions.center].icon as any} 
              size={20} 
              color="#FF6B6B"
              style={styles.icon}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Side Tabs - Dynamic based on positions */}
      <View style={styles.rowTabs}>
        {/* Left Tab */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={handleLeftClick}
          activeOpacity={0.7}
        >
          <Ionicons
            name={allRoutes[positions.left].icon as any}
            size={26}
            color={currentRoute === allRoutes[positions.left].segment ? "#FF6B6B" : "#999"}
          />
        </TouchableOpacity>

        {/* Right Tab */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={handleRightClick}
          activeOpacity={0.7}
        >
          <Ionicons
            name={allRoutes[positions.right].icon as any}
            size={26}
            color={currentRoute === allRoutes[positions.right].segment ? "#FF6B6B" : "#999"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 95,
    alignItems: "center",
  },
  tabBarBackground: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 60,
    backgroundColor: "white",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  rowTabs: {
    flexDirection: "row",
    width: "100%",
    height: 125,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 60,
    position: "relative",
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 60,
  },
  floatingButtonContainer: {
    position: "absolute",
    top: -3,
    alignSelf: "center",
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  baseShape: {
    width: 100,
    height: 90,
    backgroundColor: "#FF6B6B",
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  circularButton: {
    width: 50,
    height: 70,
    borderRadius: 25,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 20,
    alignSelf: "center",
    zIndex: 1,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  whiteCircle: {
    width: 50,
    height: 50,
    borderRadius: 40,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    textAlign: "center",
    textAlignVertical: "center",
  },
});

