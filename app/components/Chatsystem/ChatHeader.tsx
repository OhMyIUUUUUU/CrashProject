import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, SafeAreaView, StatusBar, Text, TouchableOpacity, View } from 'react-native';

interface ChatHeaderProps {
    officeTitle: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ officeTitle }) => {
    const router = useRouter();

    return (
        <View style={{ backgroundColor: '#FF6666', paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0 }}>
            <SafeAreaView style={{ backgroundColor: '#FF6666' }}>
                <View
                    style={{
                        backgroundColor: '#FF6666',
                        paddingBottom: 16,
                        paddingHorizontal: 20,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                    }}
                >
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <TouchableOpacity
                                onPress={() => router.back()}
                                activeOpacity={0.7}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 12,
                                }}
                            >
                                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                            <View style={{
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 12,
                            }}>
                                <Ionicons name="chatbubbles" size={22} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        fontSize: 18,
                                        fontWeight: '700',
                                        color: '#FFFFFF',
                                        marginBottom: 2,
                                    }}
                                    numberOfLines={1}
                                >
                                    {officeTitle}
                                </Text>
                                <Text style={{
                                    fontSize: 13,
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontWeight: '500',
                                }}>
                                    We're here to help
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
};

export default ChatHeader;
