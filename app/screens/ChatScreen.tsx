import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
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
  TouchableOpacity,
  View
} from 'react-native';
import ChatHeader from '../components/Chatsystem/ChatHeader';
import ChatInput from '../components/Chatsystem/ChatInput';
import ChatMessage, { Message } from '../components/Chatsystem/ChatMessage';
import { supabase } from '../lib/supabase';

const ChatScreen: React.FC = () => {
  const router = useRouter();
  const { report_id, office_name } = useLocalSearchParams<{ report_id: string; office_name?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);
  const receiverIdRef = useRef<string | null>(null);

  const officeTitle = Array.isArray(office_name)
    ? office_name[0]
    : office_name || 'Police Station';

  useEffect(() => {
    if (report_id) {
      loadMessages();
      subscribeToMessages();
      // Fetch and cache receiver_id once
      fetchReceiverId();
    }

    return () => {
      // Cleanup subscription on unmount
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      receiverIdRef.current = null;
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

  const fetchReceiverId = async () => {
    if (!report_id) return;

    try {
      const { data: reportData, error: reportError } = await supabase
        .from('tbl_reports')
        .select('assigned_office_id')
        .eq('report_id', report_id)
        .single();

      if (!reportError && reportData) {
        receiverIdRef.current = reportData.assigned_office_id || null;
      }
    } catch (error: any) {
      console.error('[ChatScreen] Error fetching receiver ID:', error.message || error);
    }
  };

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
        console.error('[ChatScreen] Failed to load messages:', error.message || error);
        Alert.alert('Error', 'Failed to load messages. Please try again.');
      } else {
        setMessages(data || []);
      }
    } catch (error: any) {
      console.error('[ChatScreen] Error loading messages:', error.message || error);
      Alert.alert('Error', 'Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const playReceiveSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/bubble_pop.mp3')
      );
      await sound.playAsync();
      // Unload from memory when finished
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Error playing sound:', error);
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
        async (payload) => {
          const newMessage = payload.new as Message;

          // Play sound if message is from others (not current user)
          if (newMessage.sender_type !== 'user') {
            playReceiveSound();
          }

          // Append new message to state instead of reloading all
          setMessages((prev) => {
            // Check if message already exists (avoid duplicates)
            const exists = prev.some(msg => msg.message_id === newMessage.message_id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Fallback to reloading messages on error
          loadMessages();
        }
      });

    channelRef.current = channel;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !report_id || sending) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      setSending(true);
      const { data: { session } } = await supabase.auth.getSession();
      const senderId = session?.user?.id || null;

      if (!senderId) {
        Alert.alert('Error', 'Please log in to send messages');
        setSending(false);
        setNewMessage(messageText); // Restore message on error
        return;
      }

      // Use cached receiver_id, fetch if not available
      let receiverId = receiverIdRef.current;
      if (receiverId === null) {
        await fetchReceiverId();
        receiverId = receiverIdRef.current;
      }

      const { data, error } = await supabase
        .from('tbl_messages')
        .insert([
          {
            report_id: report_id,
            sender_id: senderId,
            sender_type: 'user',
            receiver_id: receiverId,
            message_content: messageText,
            // timestamp is handled by database DEFAULT CURRENT_TIMESTAMP
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('[ChatScreen] Failed to send message:', error.message || error);
        Alert.alert('Error', 'Failed to send message. Please try again.');
        setNewMessage(messageText); // Restore message on error
      } else if (data) {
        // Optimistically add message to UI (real-time subscription will also add it)
        setMessages((prev) => {
          const exists = prev.some(msg => msg.message_id === data.message_id);
          if (exists) return prev;
          return [...prev, data];
        });
      }
    } catch (error: any) {
      console.error('[ChatScreen] Error sending message:', error.message || error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
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
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6666" />

      <ChatHeader officeTitle={officeTitle} />

      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>

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
              renderItem={({ item }) => <ChatMessage item={item} />}
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
      </View>

      <ChatInput
        value={newMessage}
        onChangeText={setNewMessage}
        onSend={sendMessage}
        sending={sending}
      />
      <SafeAreaView style={{ backgroundColor: '#FFFFFF' }} />
    </View>
  );
};

export default ChatScreen;