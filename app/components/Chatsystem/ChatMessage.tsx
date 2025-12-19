import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { formatPhilippineTimeOnly } from '../../utils/philippineTime';

export interface Message {
    message_id: string;
    report_id: string;
    sender_id: string;
    sender_type: 'user' | 'police';
    receiver_id: string | null;
    message_content: string;
    timestamp: string;
}

interface ChatMessageProps {
    item: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ item }) => {
    const isUser = item.sender_type === 'user';
    const messageTime = formatPhilippineTimeOnly(item.timestamp);

    return (
        <View
            style={{
                marginBottom: 16,
                flexDirection: 'row',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                paddingHorizontal: 20,
                alignItems: 'flex-end',
            }}
        >
            {!isUser && (
                <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#FF6666',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 10,
                    marginBottom: 4,
                    shadowColor: '#FF6666',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3,
                }}>
                    <Ionicons name="shield" size={18} color="#FFFFFF" />
                </View>
            )}
            <View
                style={{
                    maxWidth: '70%',
                    borderRadius: 24,
                    borderBottomRightRadius: isUser ? 8 : 24,
                    borderBottomLeftRadius: isUser ? 24 : 8,
                    shadowColor: '#FF6666',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 4,
                    overflow: 'hidden',
                }}
            >
                <View
                    style={{
                        backgroundColor: '#FF6666',
                        paddingHorizontal: 18,
                        paddingVertical: 14,
                        borderRadius: 24,
                        borderBottomRightRadius: isUser ? 8 : 24,
                        borderBottomLeftRadius: isUser ? 24 : 8,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 15,
                            color: '#FFFFFF',
                            lineHeight: 20,
                            fontWeight: '400',
                        }}
                    >
                        {item.message_content}
                    </Text>
                    <Text
                        style={{
                            fontSize: 10,
                            color: 'rgba(255, 255, 255, 0.8)',
                            marginTop: 6,
                            fontWeight: '500',
                        }}
                    >
                        {messageTime}
                    </Text>
                </View>
            </View>
            {isUser && (
                <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#FF6666',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginLeft: 10,
                    marginBottom: 4,
                    shadowColor: '#FF6666',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3,
                }}>
                    <Ionicons name="person" size={18} color="#FFFFFF" />
                </View>
            )}
        </View>
    );
};

export default ChatMessage;
