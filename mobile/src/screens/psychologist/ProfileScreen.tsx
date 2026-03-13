import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { usePsychologistProfile, useProfile } from '../../hooks/useApi';
import { ProfileHeaderCard } from '../../components/ProfileHeaderCard';

export function PsychologistProfileScreen() {
  const navigation = useNavigation();
  const { user, profile, logout } = useAuthStore();
  const { data: profileData } = useProfile();
  const { data: psychologistData } = usePsychologistProfile();

  const handleLogout = () => {
    Alert.alert(
      'Cikis Yap',
      'Hesabinizdan cikis yapmak istediginizden emin misiniz?',
      [
        { text: 'Hayir', style: 'cancel' },
        {
          text: 'Evet, Cikis Yap',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const getVerificationStatus = () => {
    if (psychologistData?.verified) {
      return { label: 'Dogrulanmis', color: colors.success, bg: `${colors.success}15` };
    }
    if (psychologistData?.verificationStatus === 'pending') {
      return { label: 'Onay Bekleniyor', color: colors.warning, bg: `${colors.warning}15` };
    }
    if (psychologistData?.verificationStatus === 'rejected') {
      return { label: 'Reddedildi', color: colors.error, bg: `${colors.error}15` };
    }
    return { label: 'Beklemede', color: colors.textMuted, bg: colors.card };
  };

  const verificationStatus = getVerificationStatus();

  const menuItems = [
    {
      icon: 'person-outline' as const,
      title: 'Profili Düzenle',
      subtitle: 'Kişisel ve mesleki bilgilerinizi güncelleyin',
      onPress: () => navigation.navigate('EditProfile' as never),
    },
    {
      icon: 'wallet-outline' as const,
      title: 'Kazanç Geçmişi',
      subtitle: 'Ödeme ve fatura detayları',
      onPress: () => {},
    },
    {
      icon: 'time-outline' as const,
      title: 'Müsaitlik Ayarları',
      subtitle: 'Çalışma saatlerinizi yönetin',
      onPress: () => navigation.navigate('Availability' as never),
    },
    {
      icon: 'notifications-outline' as const,
      title: 'Bildirimler',
      subtitle: 'Bildirim tercihlerinizi yönetin',
      onPress: () => {},
    },
    {
      icon: 'settings-outline' as const,
      title: 'Ayarlar',
      subtitle: 'Uygulama ayarları',
      onPress: () => navigation.navigate('Settings' as never),
    },
    {
      icon: 'help-circle-outline' as const,
      title: 'Yardım & Destek',
      subtitle: 'SSS ve iletişim',
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Card - Using New Component */}
        <ProfileHeaderCard
          firstName={user?.firstName}
          lastName={user?.lastName}
          fullName={psychologistData?.fullName}
          email={user?.email}
          title={psychologistData?.title || 'Dr.'}
          verified={psychologistData?.verified}
          verificationStatus={verificationStatus}
          role="psychologist"
        />

        {/* Info Cards */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Deneyim</Text>
            <Text style={styles.infoValue}>{psychologistData?.yearsOfExperience || 0} Yil</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Seans Ucreti</Text>
            <Text style={styles.infoValue}>
              {psychologistData?.pricePerSession?.toLocaleString('tr-TR') || 0} TL
            </Text>
          </View>
        </View>

        {/* Specialties */}
        {psychologistData?.specialties && psychologistData.specialties.length > 0 && (
          <View style={styles.specialtiesCard}>
            <Text style={styles.specialtiesTitle}>Uzmanlik Alanlari</Text>
            <View style={styles.specialtiesList}>
              {psychologistData.specialties.map((specialty: string, index: number) => (
                <View key={index} style={styles.specialtyTag}>
                  <Text style={styles.specialtyText}>{specialty}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={20} color={colors.text} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>KhunJit v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
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
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  specialtiesCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  specialtiesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  specialtiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    backgroundColor: `${colors.primary}10`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  specialtyText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  menuSection: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  versionText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
