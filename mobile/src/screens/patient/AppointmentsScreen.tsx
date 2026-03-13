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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { colors } from '../../theme/colors';
import { useAppointments, useCancelAppointment } from '../../hooks/useApi';

type TabType = 'upcoming' | 'past';

export function PatientAppointmentsScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const { data: appointments, isLoading, refetch } = useAppointments();
  const cancelMutation = useCancelAppointment();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filter appointments based on tab
  const now = new Date();
  const filteredAppointments = appointments?.filter((apt: any) => {
    const startAt = new Date(apt.startAt);
    const isValidDate = !isNaN(startAt.getTime());

    if (activeTab === 'upcoming') {
      // Upcoming: future appointments that are not cancelled/completed
      const upcomingStatuses = ['reserved', 'payment_pending', 'payment_review', 'confirmed', 'ready', 'in_session'];
      return upcomingStatuses.includes(apt.status) && (!isValidDate || startAt >= now);
    } else {
      // Past: completed, cancelled, or past date
      const pastStatuses = ['completed', 'cancelled', 'no_show', 'expired', 'refunded'];
      return pastStatuses.includes(apt.status) || (isValidDate && startAt < now && apt.status === 'completed');
    }
  });

  // Count upcoming appointments for badge
  const upcomingCount = appointments?.filter((apt: any) => {
    const upcomingStatuses = ['reserved', 'payment_pending', 'payment_review', 'confirmed', 'ready', 'in_session'];
    return upcomingStatuses.includes(apt.status);
  })?.length || 0;

  const handleCancel = (appointmentId: string) => {
    Alert.alert(
      'Randevu Iptal',
      'Bu randevuyu iptal etmek istediginizden emin misiniz?',
      [
        { text: 'Hayir', style: 'cancel' },
        {
          text: 'Evet, Iptal Et',
          style: 'destructive',
          onPress: () => {
            cancelMutation.mutate(appointmentId, {
              onSuccess: () => {
                Alert.alert('Basarili', 'Randevu iptal edildi');
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

  const renderAppointment = ({ item }: { item: any }) => (
    <AppointmentCard
      appointment={item}
      onCancel={() => handleCancel(item.id)}
      onVideoCall={() => {
        (navigation as any).navigate('VideoCall', { appointmentId: item.id });
      }}
      onChat={() => {
        // Navigate to chat with psychologist
        (navigation as any).navigate('Chat', {
          recipientId: item.psychologistId,
          recipientName: item.psychologist?.fullName || 'Psikolog',
        });
      }}
      isCancelling={cancelMutation.isPending}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Randevularim</Text>
      </View>

      {/* Tabs with count badge */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'upcoming' ? colors.primary : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Yaklasan
          </Text>
          {upcomingCount > 0 && (
            <View style={[styles.tabBadge, activeTab === 'upcoming' && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, activeTab === 'upcoming' && styles.activeTabBadgeText]}>
                {upcomingCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Ionicons
            name="checkmark-done-outline"
            size={16}
            color={activeTab === 'past' ? colors.primary : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Gecmis
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
              <View style={styles.emptyIconContainer}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'upcoming' ? 'Yaklasan randevu yok' : 'Gecmis randevu yok'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'upcoming'
                  ? 'Bir psikolog secip randevu alabilirsiniz'
                  : 'Henuz tamamlanmis randevunuz bulunmuyor'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// Appointment Card Component
interface AppointmentCardProps {
  appointment: any;
  onCancel: () => void;
  onVideoCall: () => void;
  onChat: () => void;
  isCancelling: boolean;
}

function AppointmentCard({ appointment, onCancel, onVideoCall, onChat, isCancelling }: AppointmentCardProps) {
  // Parse dates - use startAt/endAt from backend
  const startDate = new Date(appointment.startAt);
  const endDate = new Date(appointment.endAt);
  const now = new Date();

  // Check if date is valid
  const isValidDate = !isNaN(startDate.getTime());

  // Format date: "17 Ocak 2026, Cumartesi"
  const formatFullDate = (date: Date) => {
    const days = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
    const months = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}, ${dayName}`;
  };

  // Format time: "08:00"
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get time range: "08:00 - 08:50 (TR)"
  const getTimeRange = () => {
    if (!isValidDate) return 'Tarih bilgisi yok';
    return `${formatTime(startDate)} - ${formatTime(endDate)} (TR)`;
  };

  // Get remaining time: "18 saat sonra"
  const getRemainingTime = () => {
    if (!isValidDate) return '';
    if (startDate < now) return '';
    try {
      return formatDistanceToNow(startDate, { addSuffix: true, locale: tr });
    } catch {
      return '';
    }
  };

  // WebRTC join rules - matches web implementation
  const canJoinVideoCall = () => {
    if (!isValidDate) return false;

    // Status must be confirmed, ready, or in_session
    const allowedStatuses = ['confirmed', 'ready', 'in_session'];
    if (!allowedStatuses.includes(appointment.status)) return false;

    // Join window: 10 minutes before start to 15 minutes after start
    const tenMinutesBefore = new Date(startDate.getTime() - 10 * 60 * 1000);
    const fifteenMinutesAfter = new Date(startDate.getTime() + 15 * 60 * 1000);

    return now >= tenMinutesBefore && now <= fifteenMinutesAfter;
  };

  // Status info
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bg: string }> = {
      reserved: { label: 'Rezerve', color: colors.primary, bg: `${colors.primary}15` },
      payment_pending: { label: 'Odeme Bekleniyor', color: colors.warning, bg: `${colors.warning}15` },
      payment_review: { label: 'Odeme Inceleniyor', color: colors.warning, bg: `${colors.warning}15` },
      confirmed: { label: 'Onaylandi', color: colors.success, bg: `${colors.success}15` },
      ready: { label: 'Hazir', color: colors.success, bg: `${colors.success}15` },
      in_session: { label: 'Devam Ediyor', color: colors.primary, bg: `${colors.primary}15` },
      completed: { label: 'Tamamlandi', color: colors.textMuted, bg: colors.card },
      cancelled: { label: 'Iptal Edildi', color: colors.error, bg: `${colors.error}15` },
      no_show: { label: 'Katilmadi', color: colors.error, bg: `${colors.error}15` },
      expired: { label: 'Suresi Doldu', color: colors.textMuted, bg: colors.card },
      refunded: { label: 'Iade Edildi', color: colors.textMuted, bg: colors.card },
    };
    return statusMap[status] || { label: status, color: colors.textMuted, bg: colors.card };
  };

  const statusInfo = getStatusInfo(appointment.status);
  const canCancel = ['reserved', 'payment_pending', 'confirmed'].includes(appointment.status);
  const videoEnabled = canJoinVideoCall();
  const remainingTime = getRemainingTime();
  const isPast = ['completed', 'cancelled', 'no_show', 'expired', 'refunded'].includes(appointment.status);

  return (
    <View style={styles.card}>
      {/* Header: Avatar + Name/Title + Status Badge */}
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {appointment.psychologist?.fullName?.charAt(0) || 'P'}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.psychologistName}>
            {appointment.psychologist?.fullName || 'Psikolog'}
          </Text>
          <Text style={styles.psychologistTitle}>
            {appointment.psychologist?.title || 'Dr.'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      {/* Date/Time Details */}
      <View style={styles.dateTimeSection}>
        <View style={styles.dateTimeRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={styles.dateTimeText}>
            {isValidDate ? formatFullDate(startDate) : 'Tarih bilgisi yok'}
          </Text>
        </View>
        <Text style={styles.timeRangeText}>{getTimeRange()}</Text>
        {remainingTime && !isPast && (
          <Text style={styles.remainingTimeText}>{remainingTime}</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.cardActions}>
        {/* Video Call Button */}
        <TouchableOpacity
          style={[
            styles.videoButton,
            videoEnabled ? styles.videoButtonActive : styles.videoButtonDisabled,
          ]}
          onPress={videoEnabled ? onVideoCall : undefined}
          disabled={!videoEnabled}
        >
          <Ionicons
            name="videocam-outline"
            size={18}
            color={videoEnabled ? colors.white : colors.textMuted}
          />
          <Text style={[
            styles.videoButtonText,
            videoEnabled ? styles.videoButtonTextActive : styles.videoButtonTextDisabled,
          ]}>
            {videoEnabled ? 'Goruntulu Arama' : 'Seans henuz baslamadi'}
          </Text>
        </TouchableOpacity>

        {/* Chat Button */}
        <TouchableOpacity style={styles.chatButton} onPress={onChat}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Cancel Button (only for cancellable statuses) */}
      {canCancel && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={isCancelling}
        >
          <Ionicons name="close-circle-outline" size={16} color={colors.error} style={{ marginRight: 4 }} />
          <Text style={styles.cancelButtonText}>
            {isCancelling ? 'Iptal Ediliyor...' : 'Randevuyu Iptal Et'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

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
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: `${colors.primary}10`,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeTabText: {
    color: colors.primary,
  },
  tabBadge: {
    marginLeft: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  activeTabBadge: {
    backgroundColor: colors.primary,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeTabBadgeText: {
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  cardInfo: {
    flex: 1,
  },
  psychologistName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  psychologistTitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateTimeSection: {
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTimeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  timeRangeText: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 24,
  },
  remainingTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 24,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  videoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  videoButtonActive: {
    backgroundColor: colors.primary,
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
  chatButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
    backgroundColor: `${colors.error}05`,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
