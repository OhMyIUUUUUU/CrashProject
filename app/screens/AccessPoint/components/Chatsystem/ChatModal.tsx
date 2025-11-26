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
import { ActiveCase } from '../../../../hooks/useActiveCase';
import { supabase } from '../../../../lib/supabase';
import { styles } from '../../../Home/styles';

interface Message {
  message_id: string;
  report_id: string;
  sender_id: string;
  sender_type: 'user' | 'police_office' | 'admin';
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
  const flatListRef = useRef<FlatList>(null);
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
        flatListRef.current?.scrollToEnd({ animated: true });
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

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender_type === 'user';
    const messageTime = new Date(item.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View
        style={[
          styles.chatMessageWrapper,
          isUser ? styles.chatMessageWrapperUser : styles.chatMessageWrapperLeft,
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
            {item.message_content}
          </Text>
          <Text
            style={[
              styles.chatMessageTime,
              isUser ? styles.chatMessageTimeUser : styles.chatMessageTimePolice,
            ]}
          >
            {messageTime}
          </Text>
        </View>
      </View>
    );
  };

  if (!activeCase) return null;

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

            {/* Messages List */}
            {loading ? (
              <View style={styles.chatEmptyState}>
                <ActivityIndicator size="large" color="#FF6B6B" />
                <Text style={styles.chatEmptyText}>Loading messages...</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.message_id}
                contentContainerStyle={[
                  styles.chatMessagesContainer,
                  messages.length === 0 && { flex: 1, justifyContent: 'center' },
                ]}
                ListEmptyComponent={
                  <View style={styles.chatEmptyState}>
                    <Ionicons name="chatbubbles-outline" size={48} color="#CCC" />
                    <Text style={styles.chatEmptyText}>No messages yet</Text>
                    <Text style={styles.chatEmptySubtext}>Start the conversation!</Text>
                  </View>
                }
                onContentSizeChange={() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }}
              />
            )}

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
                    <ActivityIndicator size="small" color="#FFFFFF" />
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
      </KeyboardAvoidingView>
    </Modal>
  );
};

