import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const TITLE_OPTIONS = [
  { value: 'Psikolog', label: 'Psikolog' },
  { value: 'Klinik Psikolog', label: 'Klinik Psikolog' },
  { value: 'Uzman Psikolog', label: 'Uzman Psikolog' },
];

type Role = 'patient' | 'psychologist';

interface RegisterScreenProps {
  role: Role;
  onBack: () => void;
  onRegister: (data: any) => Promise<void>;
  onNavigateToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  role,
  onBack,
  onRegister,
  onNavigateToLogin,
}) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showTitlePicker, setShowTitlePicker] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    // Psychologist specific
    title: '',
    licenseNumber: '',
    yearsOfExperience: '',
    education: '',
    pricePerSession: '',
  });

  const isPsychologist = role === 'psychologist';
  const totalSteps = isPsychologist ? 3 : 2;

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.email || !formData.username || !formData.password || !formData.confirmPassword) {
        Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Hata', 'Şifreler eşleşmiyor');
        return false;
      }
      if (formData.password.length < 6) {
        Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
        return false;
      }
    }
    if (step === 2) {
      if (!formData.firstName || !formData.lastName) {
        Alert.alert('Hata', 'Ad ve soyad gereklidir');
        return false;
      }
    }
    if (step === 3 && isPsychologist) {
      if (!formData.title || !formData.licenseNumber) {
        Alert.alert('Hata', 'Unvan ve lisans numarası gereklidir');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        handleRegister();
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      await onRegister({ ...formData, role });
    } catch (error: any) {
      Alert.alert('Kayıt Başarısız', error.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <View
          key={i}
          style={[styles.stepDot, i < step ? styles.stepDotActive : styles.stepDotInactive]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="ornek@email.com"
            placeholderTextColor={colors.textMuted}
            value={formData.email}
            onChangeText={(v) => updateField('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Kullanıcı Adı *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="kullanici_adi"
            placeholderTextColor={colors.textMuted}
            value={formData.username}
            onChangeText={(v) => updateField('username', v)}
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Şifre *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="En az 6 karakter"
            placeholderTextColor={colors.textMuted}
            value={formData.password}
            onChangeText={(v) => updateField('password', v)}
            secureTextEntry={true}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Şifre Tekrar *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Şifrenizi tekrar girin"
            placeholderTextColor={colors.textMuted}
            value={formData.confirmPassword}
            onChangeText={(v) => updateField('confirmPassword', v)}
            secureTextEntry={true}
          />
        </View>
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfInput]}>
          <Text style={styles.label}>Ad *</Text>
          <TextInput
            style={styles.inputSimple}
            placeholder="Adınız"
            placeholderTextColor={colors.textMuted}
            value={formData.firstName}
            onChangeText={(v) => updateField('firstName', v)}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfInput]}>
          <Text style={styles.label}>Soyad *</Text>
          <TextInput
            style={styles.inputSimple}
            placeholder="Soyadınız"
            placeholderTextColor={colors.textMuted}
            value={formData.lastName}
            onChangeText={(v) => updateField('lastName', v)}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Telefon</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="call-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="0555 123 4567"
            placeholderTextColor={colors.textMuted}
            value={formData.phone}
            onChangeText={(v) => updateField('phone', v)}
            keyboardType="phone-pad"
          />
        </View>
      </View>
    </>
  );

  const renderStep3Psychologist = () => (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Unvan *</Text>
        <TouchableOpacity
          style={styles.inputWrapper}
          onPress={() => setShowTitlePicker(true)}
        >
          <Ionicons name="medical-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
          <Text style={[styles.input, !formData.title && { color: colors.textMuted }]}>
            {formData.title || 'Unvan seçin'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Title Picker Modal */}
      <Modal
        visible={showTitlePicker === true}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTitlePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTitlePicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Unvan Seçin</Text>
              <TouchableOpacity onPress={() => setShowTitlePicker(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TITLE_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    formData.title === item.value && styles.optionItemSelected,
                  ]}
                  onPress={() => {
                    updateField('title', item.value);
                    setShowTitlePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.title === item.value && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {formData.title === item.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Lisans Numarası *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="ribbon-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Mesleki lisans numaranız"
            placeholderTextColor={colors.textMuted}
            value={formData.licenseNumber}
            onChangeText={(v) => updateField('licenseNumber', v)}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfInput]}>
          <Text style={styles.label}>Deneyim (Yıl)</Text>
          <TextInput
            style={styles.inputSimple}
            placeholder="5"
            placeholderTextColor={colors.textMuted}
            value={formData.yearsOfExperience}
            onChangeText={(v) => updateField('yearsOfExperience', v)}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.inputGroup, styles.halfInput]}>
          <Text style={styles.label}>Seans Ücreti (TL)</Text>
          <TextInput
            style={styles.inputSimple}
            placeholder="500"
            placeholderTextColor={colors.textMuted}
            value={formData.pricePerSession}
            onChangeText={(v) => updateField('pricePerSession', v)}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Eğitim Bilgileri</Text>
        <TextInput
          style={[styles.inputSimple, styles.textArea]}
          placeholder="Üniversite, bölüm ve mezuniyet yılı..."
          placeholderTextColor={colors.textMuted}
          value={formData.education}
          onChangeText={(v) => updateField('education', v)}
          multiline={true}
          numberOfLines={3}
        />
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.backButtonText}>Geri</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.logoSection}>
          <Text style={styles.title}>
            {isPsychologist ? 'Psikolog Kaydı' : 'Hasta Kaydı'}
          </Text>
          <Text style={styles.subtitle}>Adım {step} / {totalSteps}</Text>
          {renderStepIndicator()}
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && isPsychologist && renderStep3Psychologist()}
        </View>

        {/* Buttons */}
        <View style={styles.buttonsSection}>
          <TouchableOpacity
            style={[styles.nextButton, isLoading && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={isLoading === true}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.nextButtonText}>
                {step === totalSteps ? 'Kayıt Ol' : 'İleri'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Zaten hesabınız var mı? </Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={styles.loginLinkText}>Giriş Yapın</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    marginLeft: 4,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 35,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 12,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    height: 6,
    borderRadius: 3,
  },
  stepDotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  stepDotInactive: {
    width: 24,
    backgroundColor: colors.border,
  },
  formSection: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputSimple: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  buttonsSection: {
    marginTop: 0,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
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
  // Picker styles
  chevron: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalClose: {
    fontSize: 20,
    color: colors.textMuted,
    padding: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionItemSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
});
