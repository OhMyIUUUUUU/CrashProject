import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { ActiveCase } from '../hooks/useActiveCase';
import { styles } from '../screens/Home/styles';

interface Message {
  message_id: string;
  report_id: string;
  sender_id: string;
  sender_type: string;
  receiver_id: string;
  message_content: string;
  timestamp: string;
}

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  activeCase: ActiveCase | null;
}

export const ChatModal: React.FC<ChatModalProps> = ({ visible, onClose, activeCase }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (visible && activeCase) {
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
  }, [visible, activeCase]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, visible]);

  const loadMessages = async () => {
    if (!activeCase) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tbl_messages')
        .select('*')
        .eq('report_id', activeCase.report_id)
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
    if (!activeCase) return;

    // Remove existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages-${activeCase.report_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tbl_messages',
          filter: `report_id=eq.${activeCase.report_id}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeCase || sending) return;

    try {
      setSending(true);
      const { data: { session } } = await supabase.auth.getSession();
      const senderId = session?.user?.id || null;

      if (!senderId) {
        Alert.alert('Error', 'Please log in to send messages');
        return;
      }

      // Get receiver_id (police office or admin)
      const receiverId = activeCase.assigned_office_id || null;

      const { error } = await supabase
        .from('tbl_messages')
        .insert([
          {
            report_id: activeCase.report_id,
            sender_id: senderId,
            sender_type: 'user',
            receiver_id: receiverId,
            message_content: newMessage.trim(),
            timestamp: new Date().toISOString(),
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#FF9500';
      case 'responding':
        return '#34C759';
      case 'resolved':
        return '#007AFF';
      default:
        return '#999';
    }
  };

  if (!activeCase) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.chatModalOverlay}>
        <View style={styles.chatModalContainer}>
          {/* Header */}
          <View style={styles.chatModalHeader}>
            <View style={styles.chatModalHeaderContent}>
              <View style={styles.chatModalHeaderLeft}>
                <Ionicons name="chatbubbles" size={24} color="#FF6B6B" />
                <View style={styles.chatModalTitleContainer}>
                  <Text style={styles.chatModalTitle}>Case Conversation</Text>
                  <Text style={styles.chatModalSubtitle}>Report #{activeCase.report_id.substring(0, 8)}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.chatModalCloseButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.chatModalContent}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* Office Info */}
            <View style={styles.chatModalOfficeInfo}>
              <View style={styles.chatModalOfficeHeader}>
                <View style={styles.chatModalOfficeIconContainer}>
                  <Ionicons name="business" size={20} color="#FF6B6B" />
                </View>
                <View style={styles.chatModalOfficeTextContainer}>
                  <Text style={styles.chatModalOfficeName}>
                    {activeCase.office_name || 'No office assigned'}
                  </Text>
                  <View style={styles.chatModalStatusContainer}>
                    <View
                      style={[
                        styles.chatModalStatusDot,
                        { backgroundColor: getStatusColor(activeCase.status) }
                      ]}
                    />
                    <Text style={styles.chatModalStatus}>
                      {activeCase.status.charAt(0).toUpperCase() + activeCase.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Messages */}
            <View style={styles.chatMessagesContainer}>
              {loading ? (
                <View style={styles.chatEmptyState}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#CCC" />
                  <Text style={styles.chatEmptyText}>Loading messages...</Text>
                </View>
              ) : messages.length === 0 ? (
                <View style={styles.chatEmptyState}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#CCC" />
                  <Text style={styles.chatEmptyText}>No messages yet</Text>
                  <Text style={styles.chatEmptySubtext}>Start the conversation!</Text>
                </View>
              ) : (
                messages.map((message) => {
                  const isUser = message.sender_type === 'user';
                  return (
                    <View
                      key={message.message_id}
                      style={[
                        styles.chatMessageWrapper,
                        isUser && styles.chatMessageWrapperUser,
                      ]}
                    >
                      <View
                        style={[
                          styles.chatMessage,
                          isUser ? styles.chatMessageUser : styles.chatMessagePolice,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chatMessageText,
                            isUser && styles.chatMessageTextUser,
                          ]}
                        >
                          {message.message_content}
                        </Text>
                        <Text
                          style={[
                            styles.chatMessageTime,
                            isUser ? styles.chatMessageTimeUser : styles.chatMessageTimePolice,
                          ]}
                        >
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>

          {/* Input */}
          <View style={styles.chatInputContainer}>
            <View style={styles.chatInputWrapper}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
                editable={!sending}
              />
              <TouchableOpacity
                style={[
                  styles.chatSendButton,
                  (!newMessage.trim() || sending) && styles.chatSendButtonDisabled
                ]}
                onPress={sendMessage}
                disabled={!newMessage.trim() || sending}
                activeOpacity={0.7}
              >
                {sending ? (
                  <Ionicons name="hourglass" size={20} color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="send"
                    size={20}
                    color={newMessage.trim() ? '#FFFFFF' : '#999'}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

