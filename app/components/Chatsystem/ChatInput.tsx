import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Platform, TextInput, TouchableOpacity, View } from 'react-native';

interface ChatInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    sending: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ value, onChangeText, onSend, sending }) => {
    return (
        <View style={{
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: Platform.OS === 'ios' ? 0 : 8,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderTopColor: '#F0F0F0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
        }}>
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: 26,
                paddingHorizontal: 4,
                paddingVertical: 4,
                gap: 8,
            }}>
                <TextInput
                    style={{
                        flex: 1,
                        fontSize: 15,
                        color: '#1A1A1A',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        maxHeight: 100,
                        minHeight: 44,
                        textAlignVertical: 'center',
                        fontWeight: '400',
                        lineHeight: 20,
                        backgroundColor: '#F5F5F5',
                        borderRadius: 22,
                        borderWidth: 1,
                        borderColor: '#FF6666',
                    }}
                    placeholder="Type a message..."
                    placeholderTextColor="#FF6666"
                    value={value}
                    onChangeText={onChangeText}
                    multiline
                    maxLength={500}
                    editable={!sending}
                />
                <TouchableOpacity
                    style={{
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 8,
                    }}
                    onPress={onSend}
                    disabled={!value.trim() || sending}
                    activeOpacity={0.7}
                >
                    {sending ? (
                        <ActivityIndicator size="small" color="#FF6666" />
                    ) : (
                        <Ionicons name="send" size={24} color="#FF6666" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ChatInput;
