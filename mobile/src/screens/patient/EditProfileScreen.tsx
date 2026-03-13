import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { useProfile, useUpdateProfile } from '../../hooks/useApi';

const cities = [
  "Adana", "Ankara", "Antalya", "Bursa", "Denizli", "Diyarbakır", "Eskişehir",
  "Gaziantep", "İstanbul", "İzmir", "Kayseri", "Kocaeli", "Konya", "Mersin",
  "Muğla", "Samsun", "Trabzon", "Diğer"
];

const timezones = [
  { value: "Europe/Istanbul", label: "Türkiye (GMT+3)" },
  { value: "Europe/London", label: "Londra (GMT)" },
  { value: "Europe/Berlin", label: "Berlin (GMT+1)" },
  { value: "America/New_York", label: "New York (GMT-5)" },
];

export function EditProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  const [formData, setFormData] = useState({
    phone: '',
    birthDate: null as Date | null,
    gender: '',
    city: '',
    profession: '',
    bio: '',
    timezone: 'Europe/Istanbul',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);

  useEffect(() => {
    if (profile) {
      let parsedDate: Date | null = null;
      if (profile.birthDate) {
        const date = new Date(profile.birthDate);
        // Validate: must be after 1900 and before today
        const minDate = new Date(1900, 0, 1);
        const maxDate = new Date();
        if (isValid(date) && date >= minDate && date <= maxDate) {
          parsedDate = date;
        }
      }

      setFormData({
        phone: profile.phone || '',
        birthDate: parsedDate,
        gender: profile.gender || '',
        city: profile.city || '',
        profession: profile.profession || '',
        bio: profile.bio || '',
        timezone: profile.timezone || 'Europe/Istanbul',
      });
    }
  }, [profile]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      // Validate: must be after 1900 and before today
      const minDate = new Date(1900, 0, 1);
      const maxDate = new Date();
      if (selectedDate >= minDate && selectedDate <= maxDate) {
        updateField('birthDate', selectedDate);
      }
    }
  };

  const handleSave = async () => {
    // Validation
    if (formData.phone && formData.phone.length < 10) {
      Alert.alert('Hata', 'Telefon numarası en az 10 karakter olmalıdır');
      return;
    }

    if (formData.bio && formData.bio.length > 500) {
      Alert.alert('Hata', 'Hakkımda kısmı en fazla 500 karakter olabilir');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        ...formData,
        birthDate: formData.birthDate ? formData.birthDate.toISOString() : null,
      });
      Alert.alert('Başarılı', 'Profiliniz güncellendi', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Profil güncellenirken bir hata oluştu');
    }
  };

  const formatBirthDate = () => {
    if (!formData.birthDate) return '';
    if (!isValid(formData.birthDate)) return '';
    return format(formData.birthDate, 'd MMMM yyyy', { locale: tr });
  };

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Profil Ayarları</Text>
            <Text style={styles.headerSubtitle}>Kişisel bilgilerinizi güncelleyin</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card */}
          <View style={styles.card}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Hesap bilgilerinizi burada güncelleyebilirsiniz
            </Text>

            {/* Name Row (readonly) */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Ad</Text>
                <View style={styles.disabledInput}>
                  <Text style={styles.disabledText}>{user?.firstName || '-'}</Text>
                </View>
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Soyad</Text>
                <View style={styles.disabledInput}>
                  <Text style={styles.disabledText}>{user?.lastName || '-'}</Text>
                </View>
              </View>
            </View>

            {/* Email (readonly) */}
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.disabledInput}>
                <Text style={styles.disabledText}>{user?.email || '-'}</Text>
              </View>
            </View>

            {/* Phone */}
            <View style={styles.field}>
              <Text style={styles.label}>Telefon</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="0555 123 4567"
                  placeholderTextColor={colors.textMuted}
                  value={formData.phone}
                  onChangeText={(value) => updateField('phone', value)}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Birth Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Doğum Tarihi</Text>
              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <Text style={[styles.selectText, !formData.birthDate && styles.placeholderText]}>
                  {formatBirthDate() || 'Tarih seçin'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={formData.birthDate || new Date(1990, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  locale="tr"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.datePickerDone}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerDoneText}>Tamam</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Gender */}
            <View style={styles.field}>
              <Text style={styles.label}>Cinsiyet</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioOption, formData.gender === 'male' && styles.radioSelected]}
                  onPress={() => updateField('gender', 'male')}
                >
                  <View style={[styles.radioCircle, formData.gender === 'male' && styles.radioCircleSelected]}>
                    {formData.gender === 'male' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel}>Erkek</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioOption, formData.gender === 'female' && styles.radioSelected]}
                  onPress={() => updateField('gender', 'female')}
                >
                  <View style={[styles.radioCircle, formData.gender === 'female' && styles.radioCircleSelected]}>
                    {formData.gender === 'female' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel}>Kadın</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioOption, formData.gender === 'other' && styles.radioSelected]}
                  onPress={() => updateField('gender', 'other')}
                >
                  <View style={[styles.radioCircle, formData.gender === 'other' && styles.radioCircleSelected]}>
                    {formData.gender === 'other' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel}>Diğer</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* City */}
            <View style={styles.field}>
              <Text style={styles.label}>Şehir</Text>
              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => setShowCityPicker(!showCityPicker)}
              >
                <Ionicons name="location-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <Text style={[styles.selectText, !formData.city && styles.placeholderText]}>
                  {formData.city || 'Şehir seçin'}
                </Text>
                <Ionicons name={showCityPicker ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {showCityPicker && (
                <View style={styles.dropdownContainer}>
                  <ScrollView style={styles.dropdown} nestedScrollEnabled>
                    {cities.map((city) => (
                      <TouchableOpacity
                        key={city}
                        style={[styles.dropdownItem, formData.city === city && styles.dropdownItemSelected]}
                        onPress={() => {
                          updateField('city', city);
                          setShowCityPicker(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, formData.city === city && styles.dropdownItemTextSelected]}>
                          {city}
                        </Text>
                        {formData.city === city && (
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Profession */}
            <View style={styles.field}>
              <Text style={styles.label}>Meslek</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="briefcase-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mesleğiniz"
                  placeholderTextColor={colors.textMuted}
                  value={formData.profession}
                  onChangeText={(value) => updateField('profession', value)}
                />
              </View>
            </View>

            {/* Bio */}
            <View style={styles.field}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.label}>Hakkımda</Text>
                <Text style={[styles.label, { color: colors.textMuted, fontWeight: '400' }]}>
                  {formData.bio.length}/500
                </Text>
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Kendinizi kısaca tanıtın..."
                placeholderTextColor={colors.textMuted}
                value={formData.bio}
                onChangeText={(value) => {
                  if (value.length <= 500) {
                    updateField('bio', value);
                  }
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
            </View>

            {/* Timezone */}
            <View style={styles.field}>
              <Text style={styles.label}>Zaman Dilimi</Text>
              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => setShowTimezonePicker(!showTimezonePicker)}
              >
                <Ionicons name="time-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <Text style={styles.selectText}>
                  {timezones.find(tz => tz.value === formData.timezone)?.label || 'Seçin'}
                </Text>
                <Ionicons name={showTimezonePicker ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {showTimezonePicker && (
                <View style={styles.dropdownContainer}>
                  <View style={styles.dropdown}>
                    {timezones.map((tz) => (
                      <TouchableOpacity
                        key={tz.value}
                        style={[styles.dropdownItem, formData.timezone === tz.value && styles.dropdownItemSelected]}
                        onPress={() => {
                          updateField('timezone', tz.value);
                          setShowTimezonePicker(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, formData.timezone === tz.value && styles.dropdownItemTextSelected]}>
                          {tz.label}
                        </Text>
                        {formData.timezone === tz.value && (
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, updateProfileMutation.isPending && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
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
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    height: '100%',
  },
  disabledInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
  },
  disabledText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  datePickerContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  datePickerDone: {
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  radioSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: 15,
    color: colors.text,
  },
  dropdownContainer: {
    marginTop: 8,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  dropdownItemText: {
    fontSize: 15,
    color: colors.text,
  },
  dropdownItemTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  textArea: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
