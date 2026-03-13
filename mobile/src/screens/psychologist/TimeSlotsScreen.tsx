import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { colors } from '../../theme/colors';
import {
  useAvailabilitySlots,
  useCreateAvailabilitySlot,
  useDeleteAvailabilitySlot,
} from '../../hooks/useApi';

interface TimeSlot {
  startTime: string;
  endTime: string;
}

export function TimeSlotsScreen() {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [newSlot, setNewSlot] = useState<TimeSlot>({ startTime: '09:00', endTime: '10:00' });

  // Fetch slots for selected date range (today + 30 days)
  const startDate = format(startOfDay(new Date()), 'yyyy-MM-dd');
  const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
  const { data: exceptions, isLoading, refetch } = useAvailabilitySlots(startDate, endDate);

  const createSlotMutation = useCreateAvailabilitySlot();
  const deleteSlotMutation = useDeleteAvailabilitySlot();

  // Get exception for selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dateException = exceptions?.find((e: any) =>
    format(new Date(e.date), 'yyyy-MM-dd') === selectedDateStr
  );

  const customSlots: TimeSlot[] = dateException?.customSlots || [];

  // Generate date chips (today + 14 days)
  const dateChips = Array.from({ length: 15 }, (_, i) => addDays(new Date(), i));

  const handleAddSlot = () => {
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newSlot.startTime) || !timeRegex.test(newSlot.endTime)) {
      Alert.alert('Hata', 'Geçersiz saat formatı. HH:MM formatında giriniz (örn: 09:00)');
      return;
    }

    // Validate start < end
    const [startH, startM] = newSlot.startTime.split(':').map(Number);
    const [endH, endM] = newSlot.endTime.split(':').map(Number);
    if (startH * 60 + startM >= endH * 60 + endM) {
      Alert.alert('Hata', 'Bitiş saati başlangıç saatinden sonra olmalıdır');
      return;
    }

    const updatedSlots = [...customSlots, newSlot];

    createSlotMutation.mutate(
      {
        date: selectedDateStr,
        customSlots: updatedSlots,
        isOff: false,
      },
      {
        onSuccess: () => {
          setShowAddSlotModal(false);
          setNewSlot({ startTime: '09:00', endTime: '10:00' });
          refetch();
        },
        onError: (error: any) => {
          Alert.alert('Hata', error.message || 'Slot eklenirken bir hata oluştu');
        },
      }
    );
  };

  const handleDeleteSlot = (slotIndex: number) => {
    if (!dateException) return;

    const updatedSlots = customSlots.filter((_, index) => index !== slotIndex);

    if (updatedSlots.length === 0) {
      // If no slots left, delete the exception
      deleteSlotMutation.mutate(dateException.id, {
        onSuccess: () => refetch(),
        onError: (error: any) => {
          Alert.alert('Hata', error.message || 'Slot silinirken bir hata oluştu');
        },
      });
    } else {
      // Update with remaining slots
      createSlotMutation.mutate(
        {
          date: selectedDateStr,
          customSlots: updatedSlots,
          isOff: false,
        },
        {
          onSuccess: () => refetch(),
          onError: (error: any) => {
            Alert.alert('Hata', error.message || 'Slot silinirken bir hata oluştu');
          },
        }
      );
    }
  };

  const handleMarkAsOff = () => {
    createSlotMutation.mutate(
      {
        date: selectedDateStr,
        customSlots: [],
        isOff: true,
        reason: 'İzin günü',
      },
      {
        onSuccess: () => refetch(),
        onError: (error: any) => {
          Alert.alert('Hata', error.message || 'İşlem sırasında bir hata oluştu');
        },
      }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Müsait Saatler</Text>
          <Text style={styles.headerSubtitle}>Belirli günler için saat ayarlayın</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Date Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gün Seçin</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateChipsContainer}
          >
            {dateChips.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const hasException = exceptions?.some((e: any) =>
                isSameDay(new Date(e.date), date)
              );

              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text
                    style={[
                      styles.dateChipDay,
                      isSelected && styles.dateChipTextSelected,
                    ]}
                  >
                    {format(date, 'EEE', { locale: tr })}
                  </Text>
                  <Text
                    style={[
                      styles.dateChipDate,
                      isSelected && styles.dateChipTextSelected,
                    ]}
                  >
                    {format(date, 'd MMM', { locale: tr })}
                  </Text>
                  {hasException && (
                    <View style={styles.dateChipDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Date Info */}
        <View style={styles.selectedDateCard}>
          <View style={styles.selectedDateHeader}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.selectedDateText}>
              {format(selectedDate, 'd MMMM yyyy EEEE', { locale: tr })}
            </Text>
          </View>
        </View>

        {/* Time Slots */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Müsait Saatler</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddSlotModal(true)}
            >
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : customSlots.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Bu gün için özel saat belirlenmemiş</Text>
              <Text style={styles.emptySubtext}>
                Genel çalışma saatleriniz geçerli olacak
              </Text>
              <TouchableOpacity
                style={styles.markOffButton}
                onPress={handleMarkAsOff}
                disabled={createSlotMutation.isPending}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                <Text style={styles.markOffButtonText}>İzinli Olarak İşaretle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.slotsList}>
              {customSlots.map((slot, index) => (
                <View key={index} style={styles.slotCard}>
                  <View style={styles.slotTimeContainer}>
                    <Ionicons name="time" size={20} color={colors.primary} />
                    <Text style={styles.slotTime}>
                      {slot.startTime} - {slot.endTime}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteSlot(index)}
                    style={styles.deleteSlotButton}
                    disabled={deleteSlotMutation.isPending || createSlotMutation.isPending}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Slot Modal */}
      <Modal
        visible={showAddSlotModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddSlotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Saat Aralığı</Text>
              <TouchableOpacity onPress={() => setShowAddSlotModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.timeInputsContainer}>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Başlangıç</Text>
                <View style={styles.timeInputRow}>
                  <Ionicons name="time-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    style={styles.timeInput}
                    value={newSlot.startTime}
                    onChangeText={(text) => setNewSlot({ ...newSlot, startTime: text })}
                    placeholder="09:00"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>

              <Text style={styles.timeSeparator}>-</Text>

              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Bitiş</Text>
                <View style={styles.timeInputRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={newSlot.endTime}
                    onChangeText={(text) => setNewSlot({ ...newSlot, endTime: text })}
                    placeholder="10:00"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalSaveButton, createSlotMutation.isPending && styles.modalSaveButtonDisabled]}
              onPress={handleAddSlot}
              disabled={createSlotMutation.isPending}
            >
              {createSlotMutation.isPending ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                  <Text style={styles.modalSaveButtonText}>Ekle</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  addButton: {
    padding: 4,
  },
  dateChipsContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  dateChip: {
    width: 70,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dateChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateChipDay: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  dateChipDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dateChipTextSelected: {
    color: colors.white,
  },
  dateChipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.success,
    marginTop: 4,
  },
  selectedDateCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  loader: {
    marginVertical: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  markOffButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  markOffButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.error,
  },
  slotsList: {
    gap: 12,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  deleteSlotButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  timeInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  timeInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    padding: 0,
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 20,
  },
  modalSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  modalSaveButtonDisabled: {
    opacity: 0.7,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
