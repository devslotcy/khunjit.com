"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, Calendar as CalendarIcon, AlertCircle, XCircle } from "lucide-react";
import type { PsychologistProfile } from "@shared/schema";
import { cn } from "@/lib/utils";

interface BookingModalProps {
  psychologist: PsychologistProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export function BookingModal({ psychologist, open, onOpenChange }: BookingModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [availableDays, setAvailableDays] = useState<Date[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingDays, setIsLoadingDays] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<Date>(new Date());

  // Format price for display (Thailand - THB)
  const formatPrice = (price: string | null) => {
    if (!price) return "Not specified";
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(parseFloat(price));
  };

  // Fetch available days for the current month
  useEffect(() => {
    if (!open || !psychologist.id) return;

    const fetchAvailableDays = async () => {
      setIsLoadingDays(true);
      setError(null);

      try {
        const monthStr = format(month, "yyyy-MM");
        const response = await fetch(
          `/api/psychologists/${psychologist.id}/available-days?month=${monthStr}`
        );

        if (!response.ok) {
          const text = await response.text();
          console.error("Available days error:", text);
          throw new Error("Müsait günler yüklenemedi");
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Unexpected response type:", text.substring(0, 200));
          throw new Error("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");
        }

        const data = await response.json();
        const days = data.days.map((day: string) => new Date(day));
        setAvailableDays(days);
      } catch (err) {
        console.error("Fetch available days error:", err);
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setIsLoadingDays(false);
      }
    };

    fetchAvailableDays();
  }, [open, psychologist.id, month]);

  // Fetch available time slots when a date is selected
  useEffect(() => {
    if (!selectedDate || !psychologist.id) {
      setTimeSlots([]);
      return;
    }

    const fetchTimeSlots = async () => {
      setIsLoadingSlots(true);
      setError(null);
      setSelectedTime(undefined);

      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const response = await fetch(
          `/api/psychologists/${psychologist.id}/slots?date=${dateStr}`
        );

        if (!response.ok) {
          const text = await response.text();
          console.error("Time slots error:", text);
          throw new Error("Müsait saatler yüklenemedi");
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Unexpected response type:", text.substring(0, 200));
          throw new Error("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");
        }

        const data = await response.json();
        const slots: TimeSlot[] = data.slots.map((time: string) => ({
          time,
          available: true,
        }));
        setTimeSlots(slots);
      } catch (err) {
        console.error("Fetch time slots error:", err);
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
        setTimeSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchTimeSlots();
  }, [selectedDate, psychologist.id]);

  // Handle reservation
  const handleReserve = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsReserving(true);
    setError(null);

    try {
      const response = await fetch("/api/appointments/reserve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          psychologistId: psychologist.id,
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
          durationMin: psychologist.sessionDuration || 50,
          timezone: "Asia/Bangkok", // Thailand timezone
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          let errorMessage = errorData.message || "Rezervasyon yapılamadı";
          
          // Customize message for SLOT_CONFLICT
          if (errorData.code === "SLOT_CONFLICT") {
            errorMessage = "Bu saat dilimi başka bir kullanıcı tarafından seçildi. Lütfen başka bir saat seçiniz.";
          }
          
          throw new Error(errorMessage);
        } catch (e) {
          console.error("Reserve error:", text.substring(0, 200));
          throw new Error("Rezervasyon yapılamadı. Lütfen tekrar deneyin.");
        }
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Unexpected response type:", text.substring(0, 200));
        throw new Error("Beklenmeyen bir hata oluştu.");
      }

      const data = await response.json();

      // Navigate to PromptPay checkout page (Thailand payment flow)
      window.location.href = `/dashboard/promptpay-checkout?appointmentId=${data.id}`;

      // Close modal
      onOpenChange(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setIsReserving(false);
    }
  };

  // Helper to check if a date is available
  const isDateAvailable = (date: Date) => {
    return availableDays.some(
      (availableDay) =>
        format(availableDay, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setError(null);
      setTimeSlots([]);
    }
  }, [open]);

  const canProceed = selectedDate && selectedTime;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Randevu Al</DialogTitle>
          <DialogDescription>
            {psychologist.fullName} ile görüşme randevusu oluşturun
          </DialogDescription>
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="border-red-500/50 bg-red-50/50">
            <XCircle className="h-4 w-4" />
            <AlertTitle>İşlem Başarısız</AlertTitle>
            <AlertDescription className="mt-1">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Selected Date/Time Display */}
          {(selectedDate || selectedTime) && (
            <div className="bg-muted/30 rounded-lg p-4 border border-card-border">
              <p className="text-sm text-muted-foreground mb-2">Seçiminiz</p>
              <div className="flex items-center gap-4 text-lg">
                {selectedDate && (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    <span className="font-medium">
                      {format(selectedDate, "dd MMMM yyyy", {})}
                    </span>
                  </div>
                )}
                {selectedTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calendar */}
          <div className="space-y-3">
            <h3 className="font-semibold">Tarih Seçin</h3>
            <div className="flex justify-center bg-white rounded-xl border border-card-border p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={month}
                onMonthChange={setMonth}
                disabled={(date) => !isDateAvailable(date)}
                modifiers={{
                  available: availableDays,
                }}
                modifiersClassNames={{
                  available: "bg-primary/10 font-semibold text-primary hover:bg-primary/20",
                }}
                locale={undefined}
                className="rounded-md"
                weekStartsOn={1}
                fromDate={new Date()}
              />
            </div>
            {isLoadingDays && (
              <p className="text-sm text-muted-foreground text-center">
                Müsait günler yükleniyor...
              </p>
            )}
            {!isLoadingDays && availableDays.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Bu ayda müsait gün bulunmuyor
              </p>
            )}
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="space-y-3">
              <h3 className="font-semibold">Saat Seçin</h3>

              {isLoadingSlots ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : timeSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? "default" : "outline"}
                      className={cn(
                        "h-12 font-medium",
                        selectedTime === slot.time && "ring-2 ring-primary ring-offset-2"
                      )}
                      onClick={() => setSelectedTime(slot.time)}
                      disabled={!slot.available}
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/30">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Bu tarihte müsait seans bulunmuyor
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Summary Section */}
          {canProceed && (
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold">Randevu Özeti</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Psikolog</span>
                  <span className="font-medium">{psychologist.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tarih & Saat</span>
                  <span className="font-medium">
                    {selectedDate && format(selectedDate, "dd MMM yyyy", {})} - {selectedTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seans Süresi</span>
                  <span className="font-medium">{psychologist.sessionDuration || 50} dakika</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold">Seans Ücreti</span>
                  <span className="text-lg font-semibold text-primary">
                    {formatPrice(psychologist.pricePerSession)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isReserving}
            >
              İptal
            </Button>
            <Button
              className="flex-1"
              onClick={handleReserve}
              disabled={!canProceed || isReserving}
            >
              {isReserving ? "Rezerve Ediliyor..." : "Rezervasyona devam et"}
            </Button>
          </div>

          {/* Info Note */}
          <p className="text-xs text-muted-foreground text-center">
            Randevu 10 dakika süreyle rezerve edilecektir. Bu süre içinde ödemenizi tamamlamanız gerekmektedir.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
