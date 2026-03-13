import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type Role = 'patient' | 'psychologist';

interface RoleSelectScreenProps {
  onBack: () => void;
  onSelectRole: (role: Role) => void;
}

export const RoleSelectScreen: React.FC<RoleSelectScreenProps> = ({
  onBack,
  onSelectRole,
}) => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      onSelectRole(selectedRole);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.backButtonText}>Geri</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>Hoş Geldiniz!</Text>
        <Text style={styles.subtitle}>Platformu nasıl kullanmak istediğinizi seçin</Text>
      </View>

      {/* Role Cards */}
      <View style={styles.cardsSection}>
        {/* Patient Card */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === 'patient' && styles.roleCardSelected,
          ]}
          onPress={() => setSelectedRole('patient')}
        >
          <View
            style={[
              styles.roleIconContainer,
              selectedRole === 'patient' && styles.roleIconSelected,
            ]}
          >
            <Ionicons
              name="person"
              size={28}
              color={selectedRole === 'patient' ? colors.white : colors.text}
            />
          </View>
          <Text style={styles.roleTitle}>Hasta / Danışan</Text>
          <Text style={styles.roleDescription}>
            Psikolog bulun, randevu alın ve online görüşmeler yapın
          </Text>
        </TouchableOpacity>

        {/* Psychologist Card */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === 'psychologist' && styles.roleCardSelected,
          ]}
          onPress={() => setSelectedRole('psychologist')}
        >
          <View
            style={[
              styles.roleIconContainer,
              selectedRole === 'psychologist' && styles.roleIconSelected,
            ]}
          >
            <Ionicons
              name="medical"
              size={28}
              color={selectedRole === 'psychologist' ? colors.white : colors.text}
            />
          </View>
          <Text style={styles.roleTitle}>Psikolog</Text>
          <Text style={styles.roleDescription}>
            Danışanlarınızla online seanslar yapın ve kazanç elde edin
          </Text>
        </TouchableOpacity>
      </View>

      {/* Continue Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedRole && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={selectedRole === null}
        >
          <Text style={styles.continueButtonText}>Devam Et</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <View style={styles.loginLink}>
          <Text style={styles.loginText}>Zaten hesabınız var mı? </Text>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.loginLinkText}>Giriş Yapın</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    marginLeft: 4,
  },
  titleSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  cardsSection: {
    paddingHorizontal: 20,
  },
  roleCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  roleIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIconSelected: {
    backgroundColor: colors.primary,
  },
  roleIcon: {
    fontSize: 28,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSection: {
    padding: 20,
    paddingBottom: 30,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  arrowIcon: {
    color: colors.white,
    fontSize: 18,
    marginLeft: 8,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  loginLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
