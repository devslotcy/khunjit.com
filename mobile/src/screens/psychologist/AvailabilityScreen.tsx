import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAvailabilityRules, useSaveAvailabilityRules } from '../../hooks/useApi';

const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

interface DaySchedule {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export function AvailabilityScreen() {
  const navigation = useNavigation();
  const { data: rules, isLoading, refetch } = useAvailabilityRules();
  const saveMutation = useSaveAvailabilityRules();
  const [refreshing, setRefreshing] = useState(false);

  const [schedule, setSchedule] = useState<DaySchedule[]>(() => {
    return dayNames.map((_, index) => ({
      dayOfWeek: index + 1,
      enabled: index < 5, // Mon-Fri enabled by default
      startTime: '09:00',
      endTime: '17:00',
    }));
  });

  const [slotDuration, setSlotDuration] = useState(50);

  // Load existing rules from database
  useEffect(() => {
    if (rules && rules.length > 0) {
      const loadedSchedule = dayNames.map((_, index) => {
        const dayOfWeek = index + 1;
        const existingRule = rules.find((r: any) => r.dayOfWeek === dayOfWeek);

        if (existingRule) {
          return {
            dayOfWeek,
            enabled: true,
            startTime: existingRule.startTime,
            endTime: existingRule.endTime,
          };
        }

        return {
          dayOfWeek,
          enabled: false,
          startTime: '09:00',
          endTime: '17:00',
        };
      });

      setSchedule(loadedSchedule);

      // Set slot duration from first rule
      if (rules[0].slotDurationMin) {
        setSlotDuration(rules[0].slotDurationMin);
      }
    }
  }, [rules]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleToggleDay = (dayOfWeek: number) => {
    setSchedule(prev => prev.map(day =>
      day.dayOfWeek === dayOfWeek ? { ...day, enabled: !day.enabled } : day
    ));
  };

  const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    // Validate time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(value) && value.length >= 5) {
      return; // Invalid format, don't update
    }

    setSchedule(prev => prev.map(day =>
      day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
    ));
  };

  const validateTimes = (): boolean => {
    for (const day of schedule) {
      if (day.enabled) {
        const [startHour, startMin] = day.startTime.split(':').map(Number);
        const [endHour, endMin] = day.endTime.split(':').map(Number);

        if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
          Alert.alert('Hata', 'Geçersiz saat formatı. HH:MM formatında giriniz (örn: 09:00)');
          return false;
        }

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (startMinutes >= endMinutes) {
          Alert.alert('Hata', `${dayNames[day.dayOfWeek - 1]}: Bitiş saati başlangıç saatinden sonra olmalıdır`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = () => {
    // Validate slot duration
    if (slotDuration < 15 || slotDuration > 180) {
      Alert.alert('Hata', 'Seans süresi 15-180 dakika arasında olmalıdır');
      return;
    }

    // Validate times
    if (!validateTimes()) {
      return;
    }

    saveMutation.mutate(
      {
        rules: schedule.filter(day => day.enabled),
        slotDuration,
      },
      {
        onSuccess: () => {
          Alert.alert('Başarılı', 'Müsaitlik ayarlarınız kaydedildi');
        },
        onError: (error: any) => {
          Alert.alert('Hata', error.message || 'Ayarlar kaydedilirken bir hata oluştu');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Müsaitlik Ayarları</Text>
        <Text style={styles.headerSubtitle}>Haftalık çalışma saatlerinizi belirleyin</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Seans Süresi Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Seans Süresi</Text>
          </View>
          <Text style={styles.cardDescription}>Her seansın varsayılan süresi</Text>
          <View style={styles.durationInputRow}>
            <TextInput
              style={styles.durationInput}
              value={String(slotDuration)}
              onChangeText={(text) => {
                const num = parseInt(text) || 50;
                if (num >= 15 && num <= 180) {
                  setSlotDuration(num);
                }
              }}
              keyboardType="number-pad"
              maxLength={3}
              selectTextOnFocus
            />
            <Text style={styles.durationLabel}>dakika</Text>
          </View>
          <Text style={styles.durationHint}>Min: 15, Max: 180 dakika</Text>
        </View>

        {/* Haftalık Program Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Haftalık Program</Text>
          </View>
          <Text style={styles.cardDescription}>
            Hangi günler ve saatlerde müsait olduğunuzu belirleyin
          </Text>

          <View style={styles.scheduleList}>
            {schedule.map((day) => (
              <View
                key={day.dayOfWeek}
                style={[
                  styles.dayContainer,
                  day.enabled && styles.dayContainerEnabled,
                ]}
              >
                {/* Day Header */}
                <View style={styles.dayHeader}>
                  <View style={styles.dayLeft}>
                    <Switch
                      value={day.enabled}
                      onValueChange={() => handleToggleDay(day.dayOfWeek)}
                      trackColor={{ false: colors.border, true: `${colors.primary}50` }}
                      thumbColor={day.enabled ? colors.primary : colors.card}
                    />
                    <Text
                      style={[
                        styles.dayName,
                        !day.enabled && styles.dayNameDisabled,
                      ]}
                    >
                      {dayNames[day.dayOfWeek - 1]}
                    </Text>
                  </View>
                </View>

                {/* Time Inputs */}
                {day.enabled && (
                  <View style={styles.timeInputsRow}>
                    <View style={styles.timeInputContainer}>
                      <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                      <TextInput
                        style={styles.timeInput}
                        value={day.startTime}
                        onChangeText={(text) => handleTimeChange(day.dayOfWeek, 'startTime', text)}
                        placeholder="09:00"
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        selectTextOnFocus
                      />
                    </View>
                    <Text style={styles.timeSeparator}>-</Text>
                    <View style={styles.timeInputContainer}>
                      <TextInput
                        style={styles.timeInput}
                        value={day.endTime}
                        onChangeText={(text) => handleTimeChange(day.dayOfWeek, 'endTime', text)}
                        placeholder="17:00"
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        selectTextOnFocus
                      />
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Time Slots Button */}
        <TouchableOpacity
          style={styles.timeSlotsButton}
          onPress={() => (navigation as any).navigate('TimeSlots')}
        >
          <View style={styles.timeSlotsButtonContent}>
            <View style={styles.timeSlotsButtonLeft}>
              <Ionicons name="calendar-number-outline" size={24} color={colors.primary} />
              <View>
                <Text style={styles.timeSlotsButtonTitle}>Günlük Saat Ayarları</Text>
                <Text style={styles.timeSlotsButtonSubtitle}>
                  Belirli günler için özel saatler belirleyin
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
            <Text style={styles.summaryTitle}>Özet</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Aktif Gün Sayısı</Text>
            <Text style={styles.summaryValue}>
              {schedule.filter(d => d.enabled).length} gün
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ortalama Çalışma Saati</Text>
            <Text style={styles.summaryValue}>
              {schedule
                .filter(d => d.enabled)
                .reduce((acc, d) => {
                  const [sh, sm] = d.startTime.split(':').map(Number);
                  const [eh, em] = d.endTime.split(':').map(Number);
                  const hours = (eh * 60 + em - sh * 60 - sm) / 60;
                  return acc + (isNaN(hours) ? 0 : hours);
                }, 0)
                .toFixed(1)}{' '}
              saat/gün
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  scrollContent: {
    padding: 16,
    paddingTop: 8,
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
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  durationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  durationInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    width: 80,
    textAlign: 'center',
  },
  durationLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  durationHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  scheduleList: {
    gap: 12,
    marginTop: 16,
  },
  dayContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayContainerEnabled: {
    backgroundColor: `${colors.primary}08`,
    borderColor: `${colors.primary}30`,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dayNameDisabled: {
    color: colors.textMuted,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingLeft: 48, // Align with day name
  },
  timeInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timeInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    padding: 0,
  },
  timeSeparator: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  timeSlotsButton: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeSlotsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeSlotsButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  timeSlotsButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timeSlotsButtonSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
