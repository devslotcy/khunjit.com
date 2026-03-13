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
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { usePatientStats, useAppointments } from '../../hooks/useApi';

export function PatientDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = usePatientStats();
  const { data: appointments, isLoading: appointmentsLoading, refetch: refetchAppointments } = useAppointments();

  const upcomingAppointments = appointments?.filter((apt: any) =>
    ['reserved', 'payment_pending', 'payment_review', 'confirmed', 'ready'].includes(apt.status)
  ) || [];

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchAppointments()]);
    setRefreshing(false);
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
          <Text style={styles.userName}>{user?.firstName || 'Kullanıcı'}</Text>
          <Text style={styles.subtitle}>Mental sağlığınız için yanınızdayız</Text>
        </View>

        {/* Stats Cards - Full Width, Stacked (Web Design Style) */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Yaklaşan Seanslar</Text>
                <Text style={styles.statValue}>
                  {statsLoading ? '-' : stats?.upcomingCount || 0}
                </Text>
              </View>
              <View style={[styles.statIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Toplam Seans</Text>
                <Text style={styles.statValue}>
                  {statsLoading ? '-' : stats?.totalSessions || 0}
                </Text>
              </View>
              <View style={[styles.statIcon, { backgroundColor: '#22c55e15' }]}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#22c55e" />
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Okunmamış Mesaj</Text>
                <Text style={styles.statValue}>
                  {statsLoading ? '-' : stats?.unreadMessages || 0}
                </Text>
              </View>
              <View style={[styles.statIcon, { backgroundColor: '#f59e0b15' }]}>
                <Ionicons name="chatbubble-outline" size={24} color="#f59e0b" />
              </View>
            </View>
          </View>
        </View>

        {/* Upcoming Appointments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Yaklaşan Randevular</Text>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => navigation.navigate('PatientAppointments' as never)}
            >
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {appointmentsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
          ) : upcomingAppointments.length > 0 ? (
            upcomingAppointments.slice(0, 3).map((appointment: any) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Henüz randevunuz yok</Text>
              <Text style={styles.emptySubtitle}>
                Bir psikolog bularak ilk randevunuzu alın
              </Text>
              <TouchableOpacity
                style={styles.findButton}
                onPress={() => navigation.navigate('Psychologists' as never)}
              >
                <Ionicons name="search" size={16} color={colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.findButtonText}>Psikolog Bul</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Hızlı İşlemler</Text>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Psychologists' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="search" size={24} color={colors.primary} />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Psikolog Bul</Text>
              <Text style={styles.quickActionSubtitle}>Size uygun uzmanı keşfedin</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('PatientMessages' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#22c55e15' }]}>
              <Ionicons name="chatbubble-outline" size={24} color="#22c55e" />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Mesajlar</Text>
              <Text style={styles.quickActionSubtitle}>Psikologunuzla iletişime geçin</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('PatientAppointments' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#f59e0b15' }]}>
              <Ionicons name="calendar-outline" size={24} color="#f59e0b" />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Randevularım</Text>
              <Text style={styles.quickActionSubtitle}>Tüm randevularınızı görüntüleyin</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Appointment Card Component
function AppointmentCard({ appointment }: { appointment: any }) {
  // Parse dates - use startAt/endAt from backend
  const startDate = new Date(appointment.startAt);
  const endDate = new Date(appointment.endAt);

  // Check if date is valid
  const isValidDate = !isNaN(startDate.getTime());

  const formatFullDate = (date: Date) => {
    const days = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
    const months = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}, ${dayName}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRange = () => {
    if (!isValidDate) return 'Tarih bilgisi yok';
    return `${formatTime(startDate)} - ${formatTime(endDate)} (TR)`;
  };

  const getRemainingTime = () => {
    if (!isValidDate) return '';
    try {
      return formatDistanceToNow(startDate, { addSuffix: true, locale: tr });
    } catch {
      return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'ready':
        return colors.success;
      case 'payment_pending':
      case 'payment_review':
        return colors.warning;
      case 'cancelled':
      case 'rejected':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'ready':
        return `${colors.success}15`;
      case 'payment_pending':
      case 'payment_review':
        return `${colors.warning}15`;
      case 'cancelled':
      case 'rejected':
        return `${colors.error}15`;
      default:
        return `${colors.textMuted}15`;
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
      case 'cancelled':
        return 'Iptal Edildi';
      case 'rejected':
        return 'Reddedildi';
      case 'completed':
        return 'Tamamlandi';
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
              {appointment.psychologist?.fullName?.charAt(0) || 'P'}
            </Text>
          </View>
          <Text style={styles.appointmentName}>
            {appointment.psychologist?.fullName || 'Psikolog'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(appointment.status) }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor(appointment.status) }]}>
            {getStatusText(appointment.status)}
          </Text>
        </View>
      </View>

      <View style={styles.appointmentDetails}>
        <View style={styles.appointmentDetailRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={styles.appointmentDetailText}>
            {isValidDate ? formatFullDate(startDate) : 'Tarih bilgisi yok'}
          </Text>
        </View>
        <View style={styles.appointmentDetailRow}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          <Text style={styles.appointmentDetailText}>{getTimeRange()}</Text>
        </View>
        {remainingTime && (
          <View style={styles.appointmentDetailRow}>
            <Ionicons name="hourglass-outline" size={16} color={colors.primary} />
            <Text style={[styles.appointmentDetailText, { color: colors.primary, fontWeight: '500' }]}>
              {remainingTime}
            </Text>
          </View>
        )}
      </View>
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
  statsContainer: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statTextContainer: {
    flex: 1,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconText: {
    fontSize: 22,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
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
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
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
    marginBottom: 16,
  },
  findButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  findButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  appointmentAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  appointmentName: {
    fontSize: 16,
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
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    gap: 8,
  },
  appointmentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appointmentDetailText: {
    fontSize: 14,
    color: colors.textMuted,
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
