import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { format, isToday, isYesterday } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Message {
  id: string;
  text: string;
  senderUserId: string;
  createdAt: string;
  readAt?: string | null;
}

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  otherUserName: string;
  otherUserInitials?: string;
  onSendMessage: (text: string) => void;
  isSending?: boolean;
}

export function MessageThread({
  messages,
  currentUserId,
  otherUserName,
  otherUserInitials = 'U',
  onSendMessage,
  isSending = false,
}: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard opens
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim() && !isSending) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
      // Scroll to bottom after sending
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return `Dün ${format(date, 'HH:mm')}`;
    }
    return format(date, 'd MMM HH:mm', { locale: tr });
  };

  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];

    messages.forEach((message) => {
      const dateKey = format(new Date(message.createdAt), 'yyyy-MM-dd');
      const existingGroup = groups.find((g) => g.date === dateKey);

      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({ date: dateKey, messages: [message] });
      }
    });

    return groups;
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Bugün';
    if (isYesterday(date)) return 'Dün';
    return format(date, 'd MMMM yyyy', { locale: tr });
  };

  return (
    <View style={styles.container}>
      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={[
          styles.messagesContainer,
          keyboardHeight > 0 && { maxHeight: 500 }  // Limit height when keyboard is open
        ]}
        contentContainerStyle={[
          styles.messagesContent,
          {
            paddingBottom: keyboardHeight > 0
              ? keyboardHeight + 20  // Klavye açıkken: keyboard height + extra space
              : 100  // Klavye kapalıyken: input için yeterli alan (80px input + 20px margin)
          },
        ]}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyText}>Henüz mesaj yok. İlk mesajı gönderin!</Text>
          </View>
        ) : (
          groupMessagesByDate().map((group) => (
            <View key={group.date} style={styles.messageGroup}>
              {/* Date separator */}
              <View style={styles.dateSeparator}>
                <View style={styles.dateSeparatorLine} />
                <Text style={styles.dateSeparatorText}>{formatDateHeader(group.date)}</Text>
                <View style={styles.dateSeparatorLine} />
              </View>

              {/* Messages */}
              {group.messages.map((message) => {
                const isOwn = message.senderUserId === currentUserId;

                return (
                  <View
                    key={message.id}
                    style={[styles.messageWrapper, isOwn && styles.messageWrapperOwn]}
                  >
                    {/* Avatar for other user's messages */}
                    {!isOwn && (
                      <View style={styles.avatarSmall}>
                        <Text style={styles.avatarSmallText}>
                          {otherUserInitials[0]?.toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
                      <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
                        {message.text}
                      </Text>
                      <View style={styles.messageFooter}>
                        <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>
                          {formatMessageDate(message.createdAt)}
                        </Text>
                        {isOwn && (
                          <Ionicons
                            name={message.readAt ? 'checkmark-done' : 'checkmark'}
                            size={14}
                            color={message.readAt ? colors.primary : colors.textMuted}
                            style={styles.checkmark}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Input area - Fixed at bottom with proper spacing */}
      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom: keyboardHeight > 0 ? 0 : insets.bottom, // SafeArea bottom padding when keyboard closed
            marginBottom: keyboardHeight > 0
              ? (Platform.OS === 'android' ? keyboardHeight + 20 : keyboardHeight - 20)  // Android & iOS: keyboard height + 20px yukarı
              : 0  // No extra margin, SafeArea handles it
          }
        ]}
      >
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Mesajınızı yazın..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || isSending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!newMessage.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="send" size={20} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  messageGroup: {
    marginBottom: 20,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: 12,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    maxWidth: '80%',
  },
  messageWrapperOwn: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarSmallText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  ownMessageText: {
    color: colors.white,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textMuted,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  checkmark: {
    marginTop: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
