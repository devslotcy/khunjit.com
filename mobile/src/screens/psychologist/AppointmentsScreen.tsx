import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { colors } from '../../theme/colors';
import { useAppointments, useCancelAppointment } from '../../hooks/useApi';
import { canJoinVideoCall, formatTimeUntilSession } from '../../lib/video-call-utils';

type TabType = 'upcoming' | 'past';

export function PsychologistAppointmentsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const { data: appointments, isLoading, refetch } = useAppointments();
  const cancelMutation = useCancelAppointment();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const upcomingStatuses = ['reserved', 'payment_pending', 'payment_review', 'confirmed', 'ready', 'pending_approval'];
  const pastStatuses = ['completed', 'cancelled', 'no_show', 'expired', 'rejected', 'refunded'];

  const filteredAppointments = appointments?.filter((apt: any) => {
    if (activeTab === 'upcoming') {
      return upcomingStatuses.includes(apt.status);
    }
    return pastStatuses.includes(apt.status);
  });

  const handleCancel = (appointmentId: string) => {
    Alert.alert(
      'Randevu İptal',
      'Bu randevuyu iptal etmek istediğinizden emin misiniz?',
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet, İptal Et',
          style: 'destructive',
          onPress: () => {
            cancelMutation.mutate(appointmentId, {
              onSuccess: () => {
                Alert.alert('Başarılı', 'Randevu iptal edildi');
                refetch();
              },
              onError: (error: any) => {
                Alert.alert('Hata', error.message || 'Randevu iptal edilemedi');
              },
            });
          },
        },
      ]
    );
  };

  const handleVideoCall = (appointmentId: string) => {
    // TODO: Implement video call navigation when VideoCallScreen is ready
    // For now, show placeholder alert
    Alert.alert(
      'Video Call',
      `Video call için appointmentId: ${appointmentId}\n\nVideo call ekranı henüz implement edilmemiş.`,
      [{ text: 'Tamam' }]
    );
  };

  const handleMessage = (patientId: string) => {
    // TODO: Navigate to messages tab with selected patient
    // For now, show placeholder alert
    Alert.alert(
      'Mesajlar',
      `Hasta ile mesajlaşma açılacak.\nPatient ID: ${patientId}`,
      [{ text: 'Tamam' }]
    );
  };

  const renderAppointment = ({ item }: { item: any }) => {
    // CRITICAL: Use startAt and endAt, NOT scheduledAt
    const startAt = item.startAt ? new Date(item.startAt) : null;
    const endAt = item.endAt ? new Date(item.endAt) : null;
    const isValidDate = startAt && !isNaN(startAt.getTime());

    // Format date and time exactly like web
    const formattedDate = isValidDate
      ? format(startAt, "d MMMM yyyy, EEEE", { locale: tr })
      : 'Tarih bilgisi yok';

    const formattedTime = isValidDate && endAt && !isNaN(endAt.getTime())
      ? `${format(startAt, 'HH:mm', { locale: tr })} - ${format(endAt, 'HH:mm', { locale: tr })} (TR)`
      : 'Saat bilgisi yok';

    // Calculate remaining time
    const remainingTime = isValidDate && activeTab === 'upcoming' && ['confirmed', 'ready'].includes(item.status)
      ? formatTimeUntilSession(startAt)
      : null;

    // Video call join logic (matches web exactly)
    const videoCallResult = canJoinVideoCall(item);
    const canJoin = videoCallResult.canJoin;
    const videoButtonText = canJoin ? 'Seansa Katıl' : videoCallResult.message;

    // Show video button for these statuses
    const showVideoButton = ['confirmed', 'ready', 'in_session', 'reserved', 'payment_pending', 'payment_review'].includes(item.status);

    // Cancel logic: can cancel if more than 60 minutes before start
    const now = new Date();
    const canCancel = ['reserved', 'payment_pending', 'confirmed'].includes(item.status) &&
      isValidDate &&
      startAt.getTime() - now.getTime() > 60 * 60 * 1000;

    const statusInfo = getStatusInfo(item.status);

    // Get border color based on status (matches web)
    const getBorderColor = () => {
      switch (item.status) {
        case 'reserved':
          return '#f59e0b'; // amber
        case 'payment_pending':
        case 'payment_review':
          return '#fb923c'; // orange
        case 'confirmed':
        case 'ready':
          return '#10b981'; // emerald
        case 'in_session':
          return '#3b82f6'; // blue
        case 'completed':
          return '#94a3b8'; // slate
        case 'cancelled':
        case 'expired':
        case 'no_show':
          return '#ef4444'; // red
        default:
          return colors.border;
      }
    };

    return (
      <View style={[styles.card, { borderLeftColor: getBorderColor() }]}>
        {/* Header: Avatar + Name + Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.leftSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.patient?.firstName?.charAt(0)?.toUpperCase() || 'H'}
              </Text>
            </View>
            <View style={styles.nameSection}>
              <Text style={styles.patientName}>
                {item.patient?.firstName && item.patient?.lastName
                  ? `${item.patient.firstName} ${item.patient.lastName}`
                  : 'Hasta'}
              </Text>
              <Text style={styles.patientRole}>Hasta</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Date and Time Info */}
        <View style={styles.dateTimeSection}>
          <View style={styles.dateTimeRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formattedTime}</Text>
          </View>
          {remainingTime && (
            <Text style={styles.remainingTime}>{remainingTime}</Text>
          )}
        </View>

        {/* Payment Pending Warning */}
        {item.status === 'payment_pending' && (
          <View style={styles.warningBanner}>
            <Ionicons name="time-outline" size={16} color="#d97706" />
            <Text style={styles.warningText}>
              Hasta ödeme yapmalıdır
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          {/* Video Call Button */}
          {showVideoButton && (
            <TouchableOpacity
              style={[
                styles.videoButton,
                canJoin ? styles.videoButtonActive : styles.videoButtonDisabled,
              ]}
              onPress={() => canJoin && handleVideoCall(item.id)}
              disabled={!canJoin}
            >
              <Ionicons
                name="videocam"
                size={18}
                color={canJoin ? colors.white : colors.textMuted}
              />
              <Text
                style={[
                  styles.videoButtonText,
                  canJoin ? styles.videoButtonTextActive : styles.videoButtonTextDisabled,
                ]}
              >
                {videoButtonText}
              </Text>
            </TouchableOpacity>
          )}

          {/* Message Button */}
          {item.patient?.id && (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => handleMessage(item.patient.id)}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
            </TouchableOpacity>
          )}

          {/* Cancel Button */}
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(item.id)}
              disabled={cancelMutation.isPending}
            >
              <Ionicons name="close" size={18} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Randevularım</Text>
        <Text style={styles.headerSubtitle}>Tüm randevularınızı ve hasta bilgilerinizi buradan yönetin</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Yaklaşan
          </Text>
          {filteredAppointments && activeTab === 'upcoming' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filteredAppointments.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Geçmiş
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredAppointments}
          renderItem={renderAppointment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'upcoming' ? 'Yaklaşan randevu yok' : 'Geçmiş randevu yok'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'upcoming'
                  ? 'Yeni randevular burada görünecek'
                  : 'Tamamlanan seanslar burada listelenir'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// Status info helper (matches web)
const getStatusInfo = (status: string): { label: string; color: string; bg: string } => {
  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    reserved: { label: 'Rezerve', color: '#f59e0b', bg: '#fef3c7' },
    payment_pending: { label: 'Ödeme Bekleniyor', color: '#f97316', bg: '#fed7aa' },
    payment_review: { label: 'Ödeme İncelemede', color: '#f97316', bg: '#fed7aa' },
    confirmed: { label: 'Onaylandı', color: '#10b981', bg: '#d1fae5' },
    ready: { label: 'Hazır', color: '#10b981', bg: '#d1fae5' },
    in_session: { label: 'Seansta', color: '#3b82f6', bg: '#dbeafe' },
    completed: { label: 'Tamamlandı', color: '#64748b', bg: '#f1f5f9' },
    cancelled: { label: 'İptal Edildi', color: '#ef4444', bg: '#fee2e2' },
    expired: { label: 'Süresi Doldu', color: '#ef4444', bg: '#fee2e2' },
    refunded: { label: 'İade Edildi', color: '#64748b', bg: '#f1f5f9' },
    no_show: { label: 'Katılmadı', color: '#ef4444', bg: '#fee2e2' },
    rejected: { label: 'Reddedildi', color: '#ef4444', bg: '#fee2e2' },
    pending_approval: { label: 'Onay Bekleniyor', color: '#f59e0b', bg: '#fef3c7' },
  };
  return statusMap[status] || { label: status, color: colors.textMuted, bg: colors.card };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeTabText: {
    color: colors.white,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  nameSection: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  patientRole: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateTimeSection: {
    gap: 8,
    marginBottom: 16,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  timeRow: {
    marginLeft: 24,
  },
  timeText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  remainingTime: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 24,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: '#d97706',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  videoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  videoButtonActive: {
    backgroundColor: '#16a34a',
  },
  videoButtonDisabled: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  videoButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  videoButtonTextActive: {
    color: colors.white,
  },
  videoButtonTextDisabled: {
    color: colors.textMuted,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
