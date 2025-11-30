import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from './ChatBox.styles';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBoxProps {
  onSendMessage?: (message: string) => void;
  initialMessages?: Message[];
  showFloatingButton?: boolean; // Control whether to show internal floating button
}

export interface ChatBoxRef {
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const ChatBox = React.forwardRef<ChatBoxRef, ChatBoxProps>(({ onSendMessage, initialMessages = [], showFloatingButton = true }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const chatAnimation = useRef(new Animated.Value(0)).current;
  const messagesEndRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      // Scroll to bottom when new message is added
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isOpen]);

  const toggleChat = () => {
    const toValue = isOpen ? 0 : 1;
    setIsOpen(!isOpen);
    
    Animated.spring(chatAnimation, {
      toValue,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const openChat = () => {
    // Always open the chat, even if already open (brings it to front)
    setIsOpen(true);
    Animated.spring(chatAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
    
    // Scroll to bottom when opening
    setTimeout(() => {
      messagesEndRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const closeChat = () => {
    if (isOpen) {
      setIsOpen(false);
      Animated.spring(chatAnimation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    openChat,
    closeChat,
    toggleChat,
  }));

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Call parent callback if provided
    if (onSendMessage) {
      onSendMessage(newMessage.text);
    }

    // Simulate response (replace with actual API call)
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Thank you for your message. We will get back to you soon.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  const chatTranslateY = chatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  const chatOpacity = chatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      {/* Chat Bubble */}
      <Animated.View
        style={[
          styles.chatBubbleContainer,
          {
            transform: [{ translateY: chatTranslateY }],
            opacity: chatOpacity,
          },
        ]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatBubble}
        >
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderInfo}>
              <View style={styles.chatAvatar}>
                <Ionicons name="shield" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.chatHeaderTitle}>Support</Text>
                <Text style={styles.chatHeaderSubtitle}>Online</Text>
              </View>
            </View>
            <TouchableOpacity onPress={toggleChat} style={styles.chatCloseButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={messagesEndRef}
            style={styles.chatMessages}
            contentContainerStyle={styles.chatMessagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyChatContainer}>
                <Text style={styles.emptyChatText}>Start a conversation</Text>
              </View>
            ) : (
              messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    msg.isUser ? styles.userMessage : styles.supportMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.isUser ? styles.userMessageText : styles.supportMessageText,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.chatSendButton, !message.trim() && styles.chatSendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!message.trim()}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* Floating Chat Button - Only show when chat is closed and showFloatingButton is true */}
      {!isOpen && showFloatingButton && (
        <TouchableOpacity
          style={styles.floatingChatButton}
          onPress={toggleChat}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={28}
            color="#fff"
          />
        </TouchableOpacity>
      )}
    </>
  );
});

ChatBox.displayName = 'ChatBox';

export default ChatBox;

