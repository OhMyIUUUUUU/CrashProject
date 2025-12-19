import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../screens/styles';

const { width: screenWidth } = Dimensions.get('window');
const buttonSize = Math.min(screenWidth * 0.6, 220);

interface SOSSectionProps {
    onPress: () => void;
    onCancelCountdown: () => void;
    sendingSOS: boolean;
    activeCase: boolean;
    isCaseMinimized: boolean;
    countdown: number;
}

const SOSSection: React.FC<SOSSectionProps> = ({
    onPress,
    onCancelCountdown,
    sendingSOS,
    activeCase,
    isCaseMinimized,
    countdown,
}) => {
    // Animation values
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rippleScale = useRef(new Animated.Value(0)).current;
    const rippleOpacity = useRef(new Animated.Value(0)).current;

    // Pulsing animation effect
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

    const handlePressIn = useCallback(() => {
        // Scale down animation
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
        }).start();

        // Ripple effect
        rippleScale.setValue(0.8);
        rippleOpacity.setValue(0.8);
        Animated.parallel([
            Animated.timing(rippleScale, {
                toValue: 1.5,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(rippleOpacity, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, [scaleAnim, rippleScale, rippleOpacity]);

    const handlePressOut = useCallback(() => {
        // Scale back animation
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
        }).start();
    }, [scaleAnim]);

    return (
        <View style={[
            styles.sosButtonContainer,
            activeCase && !isCaseMinimized && styles.sosButtonContainerExpanded
        ]}>
            <Animated.View
                style={[
                    {
                        transform: [
                            { scale: Animated.multiply(pulseAnim, scaleAnim) }
                        ],
                    },
                ]}
            >
                {/* Ripple effect */}
                <Animated.View
                    style={{
                        position: 'absolute',
                        width: buttonSize * 1.5,
                        height: buttonSize * 1.5,
                        borderRadius: (buttonSize * 1.5) / 2,
                        backgroundColor: 'rgba(255, 107, 107, 0.3)',
                        transform: [{ scale: rippleScale }],
                        opacity: rippleOpacity,
                        top: -buttonSize * 0.25,
                        left: -buttonSize * 0.25,
                        zIndex: 0,
                    }}
                />
                <TouchableOpacity
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={1}
                    disabled={sendingSOS}
                    style={[
                        styles.sosButtonNeumorphic,
                        {
                            width: buttonSize,
                            height: buttonSize,
                            borderRadius: buttonSize / 2,
                            opacity: sendingSOS ? 0.7 : 1,
                            zIndex: 1,
                        }
                    ]}
                >
                    <View style={[styles.sosButtonInner, {
                        width: buttonSize * 0.85,
                        height: buttonSize * 0.85,
                        borderRadius: (buttonSize * 0.85) / 2,
                    }]}>
                        <View style={styles.sosButtonContent}>
                            {countdown > 0 ? (
                                <>
                                    <Text style={[styles.sosButtonText, { fontSize: buttonSize * 0.2 }]}>
                                        {countdown}
                                    </Text>
                                    <Text style={[styles.sosButtonSubtext, { fontSize: buttonSize * 0.08 }]}>
                                        Cancel?
                                    </Text>
                                </>
                            ) : sendingSOS ? (
                                <>
                                    <ActivityIndicator size="large" color="#FFFFFF" />
                                    <Text
                                        style={[
                                            styles.sosButtonSubtext,
                                            { fontSize: buttonSize * 0.08, marginTop: 8 },
                                        ]}
                                    >
                                        Sending...
                                    </Text>
                                </>
                            ) : (
                                <Text style={[styles.sosButtonText, { fontSize: buttonSize * 0.2 }]}>
                                    SOS
                                </Text>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>

            {/* Cancel Panel - Shows during countdown */}
            {countdown > 0 && (
                <View style={styles.cancelPanel}>
                    <Text style={styles.cancelPanelText}>Emergency SOS will be sent in {countdown} seconds</Text>
                    <TouchableOpacity
                        onPress={onCancelCountdown}
                        style={styles.cancelButton}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default SOSSection;
