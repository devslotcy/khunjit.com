import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  addMonths,
  startOfDay,
  isToday,
  parseISO,
} from "date-fns";
import { enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
}

interface AvailabilityPanelProps {
  psychologistId: string;
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  sessionDuration?: number;
}

export function AvailabilityPanel({
  psychologistId,
  selectedSlot,
  onSelectSlot,
  sessionDuration = 50,
}: AvailabilityPanelProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [isLoadingDays, setIsLoadingDays] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Fetch available days when month changes
  useEffect(() => {
    const fetchAvailableDays = async () => {
      setIsLoadingDays(true);
      try {
        const monthStr = format(currentMonth, "yyyy-MM");
        const response = await fetch(
          `/api/psychologists/${psychologistId}/available-days?month=${monthStr}`
        );

        if (!response.ok) {
          throw new Error("Müsait günler yüklenemedi");
        }

        const data = await response.json();
        setAvailableDays(data.days || []);
      } catch (err) {
        console.error("Fetch available days error:", err);
        setAvailableDays([]);
      } finally {
        setIsLoadingDays(false);
      }
    };

    fetchAvailableDays();
  }, [psychologistId, currentMonth]);

  // Fetch time slots when date is selected
  useEffect(() => {
    if (!selectedDate) {
      setTimeSlots([]);
      return;
    }

    const fetchTimeSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const response = await fetch(
          `/api/psychologists/${psychologistId}/slots?date=${dateStr}`
        );

        if (!response.ok) {
          throw new Error("Müsait saatler yüklenemedi");
        }

        const data = await response.json();
        setTimeSlots(data.slots || []);
      } catch (err) {
        console.error("Fetch time slots error:", err);
        setTimeSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchTimeSlots();
  }, [psychologistId, selectedDate]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, -1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    if (availableDays.includes(dateStr)) {
      setSelectedDate(date);
    }
  };

  const handleTimeSlotClick = (time: string) => {
    if (!selectedDate) return;

    const [hours, minutes] = time.split(":");
    const startTime = new Date(selectedDate);
    startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + sessionDuration);

    onSelectSlot({
      startTime,
      endTime,
      available: true,
    });
  };

  const isDateAvailable = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availableDays.includes(dateStr);
  };

  const getAvailableSlotsCount = (date: Date) => {
    // This is a placeholder - in real implementation, you'd need to fetch this
    // For now, we'll just return a generic count for available days
    return isDateAvailable(date) ? 8 : 0;
  };

  return (
    <div className="space-y-6">
      <Card className="border-card-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-xl">Müsait Randevu Saatleri</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousMonth}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {format(currentMonth, "MMMM yyyy", { locale: enUS })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextMonth}
                data-testid="button-next-month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoadingDays ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Date Selection - Calendar Grid */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Tarih Seçin</h3>
                <div className="flex flex-wrap gap-3">
                  {monthDays.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const available = isDateAvailable(day);
                    const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
                    const isDaySelected = selectedDate && isSameDay(day, selectedDate);
                    const availableCount = getAvailableSlotsCount(day);
                    const dayIsToday = isToday(day);

                    return (
                      <button
                        key={dateStr}
                        disabled={isPast || !available}
                        className={cn(
                          "relative rounded-xl border-2 p-4 transition-all duration-200",
                          "flex flex-col items-center justify-center space-y-2",
                          "w-[calc(50%-6px)] min-w-[100px] sm:w-[132px] flex-shrink-0",
                          "disabled:cursor-not-allowed disabled:opacity-40",
                          isDaySelected
                            ? "border-primary bg-primary text-primary-foreground shadow-lg scale-105"
                            : available
                            ? "border-card-border bg-card hover:border-primary/50 hover:shadow-md hover:scale-[1.02]"
                            : "border-card-border bg-muted",
                          !isDaySelected && !isPast && available && "cursor-pointer"
                        )}
                        onClick={() => handleDateClick(day)}
                        data-testid={`date-card-${dateStr}`}
                      >
                        {/* Month label */}
                        <p
                          className={cn(
                            "text-xs font-medium uppercase tracking-wide",
                            isDaySelected ? "text-primary-foreground/80" : "text-muted-foreground"
                          )}
                        >
                          {format(day, "MMM", { locale: enUS })}
                        </p>

                        {/* Day number - Large */}
                        <p
                          className={cn(
                            "text-3xl font-bold tabular-nums",
                            isDaySelected && "text-primary-foreground"
                          )}
                        >
                          {format(day, "d")}
                        </p>

                        {/* Day name */}
                        <p
                          className={cn(
                            "text-xs font-medium",
                            isDaySelected ? "text-primary-foreground/90" : "text-foreground"
                          )}
                        >
                          {format(day, "EEEEEE", { locale: enUS })}
                        </p>

                        {/* Available slots badge */}
                        {available && availableCount > 0 && (
                          <Badge
                            variant={isDaySelected ? "secondary" : "default"}
                            className={cn(
                              "text-xs mt-1",
                              isDaySelected
                                ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
                                : "bg-primary/10 text-primary hover:bg-primary/20"
                            )}
                          >
                            {availableCount} müsait
                          </Badge>
                        )}

                        {/* Today indicator */}
                        {dayIsToday && (
                          <div
                            className={cn(
                              "absolute top-2 right-2 w-2 h-2 rounded-full",
                              isDaySelected ? "bg-primary-foreground" : "bg-primary"
                            )}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {!isLoadingDays && availableDays.length === 0 && (
                  <div className="text-center py-12 mt-6">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">Bu ayda müsait gün yok</h3>
                    <p className="text-sm text-muted-foreground">Lütfen başka bir ay seçin</p>
                  </div>
                )}
              </div>

              {/* Time Slots Selection */}
              {selectedDate && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Saat Seçin</h3>

                    {isLoadingSlots ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    ) : timeSlots.length > 0 ? (
                      <>
                        <p className="text-sm text-muted-foreground mb-3">
                          {format(selectedDate, "d MMMM yyyy, EEEE", { locale: enUS })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {timeSlots.map((time) => {
                            // Check if this time slot is selected
                            const isSelected =
                              selectedSlot &&
                              selectedDate &&
                              isSameDay(selectedSlot.startTime, selectedDate) &&
                              format(selectedSlot.startTime, "HH:mm") === time;

                            return (
                              <Button
                                key={time}
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                  "text-sm font-medium flex-shrink-0",
                                  "w-[100px] sm:w-[110px]",
                                  isSelected && "shadow-md ring-2 ring-primary/20"
                                )}
                                onClick={() => handleTimeSlotClick(time)}
                                data-testid={`slot-${time}`}
                              >
                                <Clock className="w-3 h-3 mr-1.5" />
                                {time}
                              </Button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">Bu gün için müsait slot yok</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Selected Slot Summary */}
              {selectedSlot && (
                <>
                  <Separator />
                  <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Seçili Randevu
                        </p>
                        <p className="text-lg font-semibold">
                          {format(selectedSlot.startTime, "d MMMM yyyy", { locale: enUS })}
                        </p>
                        <p className="text-base text-muted-foreground">
                          {format(selectedSlot.startTime, "EEEE, HH:mm", { locale: enUS })} -{" "}
                          {format(selectedSlot.endTime, "HH:mm")}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
