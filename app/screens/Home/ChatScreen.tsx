import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface Message {
  message_id: string;
  report_id: string;
  sender_id: string;
  sender_type: 'user' | 'police_office' | 'admin';
  message_content: string;
  timestamp: string;
}

const ChatScreen: React.FC = () => {
  const router = useRouter();
  const { report_id } = useLocalSearchParams<{ report_id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (report_id) {
      loadMessages();
      subscribeToMessages();
    }

    return () => {
      // Cleanup subscription on unmount
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [report_id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

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
        Alert.alert('Error', 'Failed to load messages. Please try again.');
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error in loadMessages:', error);
      Alert.alert('Error', 'Failed to load messages. Please try again.');
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
          event: 'INSERT',
          schema: 'public',
          table: 'tbl_messages',
          filter: `report_id=eq.${report_id}`,
        },
        () => {
          // Reload messages when a new message is inserted
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
        setSending(false);
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

  if (!report_id) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="alert-circle" size={48} color="#FF6666" />
          <Text style={{ fontSize: 16, color: '#FF6666', marginTop: 16, textAlign: 'center' }}>
            No report ID provided
          </Text>
          <TouchableOpacity
            style={{ marginTop: 16 }}
            onPress={() => router.back()}
          >
            <Text style={{ fontSize: 16, color: '#FF6666', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: '#FF6666',
            paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
            paddingBottom: 16,
            paddingHorizontal: 20,
            shadowColor: '#FF6666',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
            zIndex: 10,
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
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="chatbubbles" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  marginBottom: 2,
                }}>
                  Support Chat
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

        {/* Messages List */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {loading ? (
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 60,
              backgroundColor: '#FFFFFF',
            }}>
              <ActivityIndicator size="large" color="#FF6666" />
              <Text style={{
                marginTop: 16,
                fontSize: 15,
                color: '#FF6666',
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
                paddingVertical: 20,
                paddingBottom: 100,
              }}
              style={{ flex: 1, backgroundColor: '#FFFFFF' }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingVertical: 80,
                }}>
                  <View style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: '#FFFFFF',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 20,
                    shadowColor: '#FF6666',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 4,
                  }}>
                    <Ionicons name="chatbubbles-outline" size={48} color="#FF6666" />
                  </View>
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: '#FF6666',
                    marginBottom: 8,
                  }}>
                    No messages yet
                  </Text>
                  <Text style={{
                    fontSize: 15,
                    color: '#FF6666',
                    textAlign: 'center',
                    paddingHorizontal: 40,
                  }}>
                    Start the conversation with our support team
                  </Text>
                </View>
              }
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
            />
          )}
        </KeyboardAvoidingView>

        {/* Input Container - Fixed at Bottom */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: Platform.OS === 'ios' ? 30 : 18,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 0,
          shadowColor: '#FF6666',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
          zIndex: 20,
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
              value={newMessage}
              onChangeText={setNewMessage}
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
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
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
      </View>
    </SafeAreaView>
  );
};

export default ChatScreen;

