import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { usePsychologistStats, useUpcomingAppointments } from '../../hooks/useApi';

export function PsychologistDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = usePsychologistStats();
  const { data: upcomingAppointments, isLoading: appointmentsLoading, refetch: refetchAppointments } = useUpcomingAppointments();

  // Filter today's appointments (using startAt instead of scheduledAt)
  const todayAppointments = (upcomingAppointments || []).filter((apt: any) => {
    const aptDate = new Date(apt.startAt);
    if (isNaN(aptDate.getTime())) return false;

    const today = new Date();
    return aptDate.toDateString() === today.toDateString();
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchAppointments()]);
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return amount?.toLocaleString('tr-TR') || '0';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hoş geldiniz,</Text>
          <Text style={styles.userName}>{user?.firstName || 'Psikolog'}</Text>
          <Text style={styles.subtitle}>
            {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}
          </Text>
          {stats && stats.todaySessions > 0 && (
            <Text style={[styles.subtitle, { marginTop: 4, fontWeight: '600', color: colors.primary }]}>
              Bugün {stats.todaySessions} seansınız var
            </Text>
          )}
        </View>

        {/* Stats Cards - Web aligned */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="videocam-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.statLabel}>Bugünkü Seanslar</Text>
            <Text style={styles.statValue}>
              {statsLoading ? '-' : stats?.todaySessions || 0}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#22c55e15' }]}>
              <Ionicons name="cash-outline" size={20} color="#22c55e" />
            </View>
            <Text style={styles.statLabel}>Haftalık Kazanç</Text>
            <Text style={styles.statValue}>
              {statsLoading ? '-' : formatCurrency(stats?.weeklyEarnings || 0)}
            </Text>
            <Text style={styles.statCurrency}>TL</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#3b82f615' }]}>
              <Ionicons name="people-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.statLabel}>Toplam Hasta</Text>
            <Text style={styles.statValue}>
              {statsLoading ? '-' : stats?.totalPatients || 0}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#f59e0b15' }]}>
              <Ionicons name="time-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.statLabel}>Bekleyen Randevu</Text>
            <Text style={styles.statValue}>
              {statsLoading ? '-' : stats?.pendingAppointments || 0}
            </Text>
          </View>
        </View>

        {/* Upcoming Sessions - Web aligned */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Yaklaşan Seanslar</Text>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => navigation.navigate('PsychologistAppointments' as never)}
            >
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {appointmentsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
          ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
            <View style={styles.appointmentsGrid}>
              {upcomingAppointments.slice(0, 6).map((appointment: any) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onVideoCall={() => {
                    // Navigate to video call if within join window
                    (navigation as any).navigate('VideoCall', { appointmentId: appointment.id });
                  }}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Yaklaşan seansınız yok</Text>
              <Text style={styles.emptySubtitle}>
                Müsaitlik ayarlarınızı güncelleyerek randevu alabilirsiniz
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Availability' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Müsaitlik Ayarları</Text>
              <Text style={styles.quickActionSubtitle}>Çalışma saatlerinizi düzenleyin</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('PsychologistMessages' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#22c55e15' }]}>
              <Ionicons name="chatbubble-outline" size={24} color="#22c55e" />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Mesajlar</Text>
              <Text style={styles.quickActionSubtitle}>Hastalarınızla iletişim kurun</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('PsychologistAppointments' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#f59e0b15' }]}>
              <Ionicons name="calendar-outline" size={24} color="#f59e0b" />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Tüm Randevular</Text>
              <Text style={styles.quickActionSubtitle}>Randevu takviminizi yönetin</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Appointment Card Component (Web-aligned with video call join logic)
function AppointmentCard({ appointment, onVideoCall }: { appointment: any; onVideoCall: () => void }) {
  const startDate = new Date(appointment.startAt);
  const endDate = new Date(appointment.endAt);
  const now = new Date();

  // Check if date is valid
  const isValidDate = !isNaN(startDate.getTime());

  // Format full date: "17 Ocak 2026, Cumartesi"
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

  // Get remaining time: "17 saat sonra"
  const getRemainingTime = () => {
    if (!isValidDate || startDate < now) return '';
    try {
      return formatDistanceToNow(startDate, { addSuffix: true, locale: tr });
    } catch {
      return '';
    }
  };

  // Video call join window logic (matches web)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'ready':
        return colors.success;
      case 'payment_pending':
      case 'payment_review':
        return colors.warning;
      default:
        return colors.textMuted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Onaylandi';
      case 'ready':
        return 'Hazir';
      case 'payment_pending':
        return 'Odeme Bekleniyor';
      case 'payment_review':
        return 'Odeme Inceleniyor';
      case 'reserved':
        return 'Rezerve';
      default:
        return status;
    }
  };

  const remainingTime = getRemainingTime();

  return (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={styles.appointmentAvatarRow}>
          <View style={styles.appointmentAvatar}>
            <Text style={styles.appointmentAvatarText}>
              {appointment.patient?.fullName?.charAt(0) || appointment.patient?.firstName?.charAt(0) || 'H'}
            </Text>
          </View>
          <Text style={styles.patientName} numberOfLines={1}>
            {appointment.patient?.fullName || `${appointment.patient?.firstName || ''} ${appointment.patient?.lastName || ''}`.trim() || 'Hasta'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(appointment.status)}15` }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor(appointment.status) }]}>
            {getStatusText(appointment.status)}
          </Text>
        </View>
      </View>

      <View style={styles.appointmentDetails}>
        <View style={styles.appointmentDetailRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={styles.appointmentDetailText}>
            {isValidDate ? formatFullDate(startDate) : 'Tarih bilgisi yok'}
          </Text>
        </View>
        <View style={styles.appointmentDetailRow}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.appointmentDetailText}>{getTimeRange()}</Text>
        </View>
        {remainingTime && (
          <View style={styles.appointmentDetailRow}>
            <Ionicons name="hourglass-outline" size={14} color={colors.primary} />
            <Text style={[styles.appointmentDetailText, { color: colors.primary, fontWeight: '500' }]}>
              {remainingTime}
            </Text>
          </View>
        )}
      </View>

      {/* Video call button */}
      {canJoinVideoCall() ? (
        <TouchableOpacity style={styles.videoButton} onPress={onVideoCall}>
          <Ionicons name="videocam" size={16} color={colors.white} style={{ marginRight: 6 }} />
          <Text style={styles.videoButtonText}>Görüntülü Arama</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.videoButtonDisabled}>
          <Ionicons name="videocam-off" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.videoButtonDisabledText}>Seans henüz başlamadı</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: colors.textMuted,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconText: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statCurrency: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  appointmentsGrid: {
    gap: 12,
  },
  earningsCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginRight: 4,
  },
  earningsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  loader: {
    marginVertical: 20,
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  appointmentAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appointmentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  appointmentAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appointmentDetails: {
    gap: 6,
    marginBottom: 12,
  },
  appointmentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appointmentDetailText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  videoButton: {
    backgroundColor: colors.success,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  videoButtonDisabled: {
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoButtonDisabledText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  quickAction: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionIconText: {
    fontSize: 22,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  quickActionArrow: {
    fontSize: 18,
    color: colors.textMuted,
  },
});
