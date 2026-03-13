import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useConversationMessages, useSendMessageToConversation } from '../../hooks/useApi';
import { useAuthStore } from '../../store/authStore';
import { MessageThread } from '../../components/MessageThread';

type ChatScreenRouteProp = RouteProp<
  { Chat: { conversationId: string; patientName: string; patientInitials?: string } },
  'Chat'
>;

export function PsychologistChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { conversationId, patientName, patientInitials } = route.params;

  const { data: messages, isLoading, refetch } = useConversationMessages(conversationId);
  const sendMutation = useSendMessageToConversation();

  // Refetch messages when screen comes into focus
  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleSendMessage = (text: string) => {
    sendMutation.mutate(
      { conversationId, text },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {patientInitials || patientName?.[0]?.toUpperCase() || 'H'}
            </Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{patientName || 'Hasta'}</Text>
            <Text style={styles.headerSubtitle}>Hasta</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {/* Placeholder for future actions */}
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
        </View>
      ) : (
        <MessageThread
          messages={messages || []}
          currentUserId={user?.id || ''}
          otherUserName={patientName || 'Hasta'}
          otherUserInitials={patientInitials || patientName?.[0]}
          onSendMessage={handleSendMessage}
          isSending={sendMutation.isPending}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  headerActions: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },
});
