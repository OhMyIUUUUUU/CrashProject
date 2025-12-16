import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { styles } from '../../screens/styles';
import { formatPhilippineTimeOnly } from '../../utils/philippineTime';

interface Message {
  message_id: string;
  report_id: string;
  sender_id: string;
  sender_type: 'user' | 'police';
  receiver_id: string;
  message_content: string;
  timestamp: string;
}

interface SOSChatModalProps {
  visible: boolean;
  onClose: () => void;
  report_id: string | null;
}

export const SOSChatModal: React.FC<SOSChatModalProps> = ({ visible, onClose, report_id }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (visible && report_id) {
      loadMessages();
      subscribeToMessages();
    } else {
      setMessages([]);
      // Cleanup subscription when modal closes
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }

    return () => {
      // Cleanup subscription on unmount
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [visible, report_id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && visible) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, visible]);

  const loadMessages = async () => {
    if (!report_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tbl_messages')
        .select('*')
        .eq('report_id', report_id)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error in loadMessages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!report_id) return;

    // Remove existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages-${report_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tbl_messages',
          filter: `report_id=eq.${report_id}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !report_id || sending) return;

    try {
      setSending(true);
      const { data: { session } } = await supabase.auth.getSession();
      const senderId = session?.user?.id || null;

      if (!senderId) {
        Alert.alert('Error', 'Please log in to send messages');
        return;
      }

      // Fetch report to get assigned_office_id (receiver_id)
      const { data: reportData, error: reportError } = await supabase
        .from('tbl_reports')
        .select('assigned_office_id')
        .eq('report_id', report_id)
        .single();

      if (reportError) {
        console.error('Error fetching report:', reportError);
      }

      const receiverId = reportData?.assigned_office_id || null;

      const { error } = await supabase
        .from('tbl_messages')
        .insert([
          {
            report_id: report_id,
            sender_id: senderId,
            sender_type: 'user',
            receiver_id: receiverId,
            message_content: newMessage.trim(),
            // timestamp is handled by database DEFAULT CURRENT_TIMESTAMP
          },
        ]);

      if (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Failed to send message. Please try again.');
      } else {
        setNewMessage('');
        // Reload messages to ensure UI updates immediately
        await loadMessages();
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender_type === 'user';
    const messageTime = formatPhilippineTimeOnly(item.timestamp);

    return (
      <View
        style={{
          marginBottom: 12,
          flexDirection: 'row',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{
            maxWidth: '75%',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 20,
            backgroundColor: isUser ? '#34C759' : '#007AFF',
            borderBottomRightRadius: isUser ? 4 : 20,
            borderBottomLeftRadius: isUser ? 20 : 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: '#FFFFFF',
              lineHeight: 22,
              marginBottom: 4,
            }}
          >
            {item.message_content}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: 'rgba(255, 255, 255, 0.85)',
              textAlign: isUser ? 'right' : 'left',
              fontWeight: '500',
            }}
          >
            {messageTime}
          </Text>
        </View>
      </View>
    );
  };

  if (!report_id) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableOpacity
          style={styles.chatModalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.chatModalContainer}>
              {/* Drag Handle */}
              <View style={{
                alignItems: 'center',
                paddingTop: 12,
                paddingBottom: 8,
              }}>
                <View style={{
                  width: 40,
                  height: 4,
                  backgroundColor: '#E0E0E0',
                  borderRadius: 2,
                }} />
              </View>

              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#F5F5F5',
              }}>
                <Ionicons name="chatbubbles" size={24} color="#FF6B6B" />
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#F5F5F5',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="close" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              {/* Messages List */}
              {loading ? (
                <View style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingVertical: 60,
                }}>
                  <ActivityIndicator size="large" color="#FF6B6B" />
                  <Text style={{
                    marginTop: 16,
                    fontSize: 15,
                    color: '#8E8E93',
                    fontWeight: '500',
                  }}>
                    Loading messages...
                  </Text>
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.message_id}
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    flexGrow: 1,
                  }}
                  style={{ flex: 1 }}
                  ListEmptyComponent={
                    <View style={{
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingVertical: 60,
                    }}>
                      <View style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: '#F5F5F5',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 16,
                      }}>
                        <Ionicons name="chatbubbles-outline" size={40} color="#C7C7CC" />
                      </View>
                      <Text style={{
                        fontSize: 17,
                        fontWeight: '600',
                        color: '#1A1A1A',
                        marginBottom: 4,
                      }}>
                        No messages yet
                      </Text>
                      <Text style={{
                        fontSize: 15,
                        color: '#8E8E93',
                      }}>
                        Start the conversation!
                      </Text>
                    </View>
                  }
                  onContentSizeChange={() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }}
                />
              )}

              {/* Input */}
              <View style={{
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: Platform.OS === 'ios' ? 28 : 16,
                borderTopWidth: 1,
                borderTopColor: '#F5F5F5',
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  backgroundColor: '#F8F8F8',
                  borderRadius: 24,
                  paddingHorizontal: 4,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                }}>
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: '#1A1A1A',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      maxHeight: 100,
                      textAlignVertical: 'top',
                    }}
                    placeholder="Type a message..."
                    placeholderTextColor="#8E8E93"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                    maxLength={500}
                    editable={!sending}
                  />
                  <TouchableOpacity
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: newMessage.trim() && !sending ? '#FF6B6B' : '#E0E0E0',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginLeft: 4,
                    }}
                    onPress={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    activeOpacity={0.7}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons
                        name="send"
                        size={18}
                        color={newMessage.trim() ? '#FFFFFF' : '#8E8E93'}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

