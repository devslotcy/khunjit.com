import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, isAfter, isBefore } from "date-fns";
import { tr } from "date-fns/locale";

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
}

interface SlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  isLoading?: boolean;
}

export function SlotPicker({ 
  slots, 
  selectedSlot, 
  onSelectSlot,
  isLoading 
}: SlotPickerProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const slotsByDay = useMemo(() => {
    const grouped = new Map<string, TimeSlot[]>();
    
    weekDays.forEach(day => {
      const dayKey = format(day, "yyyy-MM-dd");
      grouped.set(dayKey, []);
    });

    slots.forEach(slot => {
      const dayKey = format(slot.startTime, "yyyy-MM-dd");
      const existing = grouped.get(dayKey);
      if (existing) {
        existing.push(slot);
      }
    });

    return grouped;
  }, [slots, weekDays]);

  const goToPreviousWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
  };

  const isPastWeek = isBefore(addDays(weekStart, 6), new Date());

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-lg">Randevu Saati Seçin</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToPreviousWeek}
              disabled={isPastWeek}
              data-testid="button-prev-week"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {format(weekStart, "d MMM", { locale: tr })} - {format(addDays(weekStart, 6), "d MMM yyyy", { locale: tr })}
            </span>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToNextWeek}
              data-testid="button-next-week"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <ScrollArea className="w-full">
            <div className="grid grid-cols-7 gap-2 min-w-[700px]">
              {weekDays.map((day, dayIndex) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const daySlots = slotsByDay.get(dayKey) || [];
                const isToday = isSameDay(day, new Date());
                const isPast = isBefore(day, new Date()) && !isToday;

                return (
                  <div key={dayIndex} className="space-y-2">
                    <div className={`text-center p-2 rounded-lg ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <p className="text-xs font-medium">
                        {format(day, "EEE", { locale: tr })}
                      </p>
                      <p className="text-lg font-semibold">
                        {format(day, "d")}
                      </p>
                    </div>

                    <div className="space-y-1">
                      {daySlots.length === 0 ? (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                          {isPast ? "Geçmiş" : "Müsait değil"}
                        </div>
                      ) : (
                        daySlots.map((slot, slotIndex) => {
                          const isSelected = selectedSlot && 
                            slot.startTime.getTime() === selectedSlot.startTime.getTime();
                          const isSlotPast = isBefore(slot.startTime, new Date());

                          return (
                            <Button
                              key={slotIndex}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className="w-full text-xs"
                              disabled={!slot.available || isSlotPast}
                              onClick={() => onSelectSlot(slot)}
                              data-testid={`slot-${format(slot.startTime, "HH-mm")}`}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              {format(slot.startTime, "HH:mm")}
                            </Button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {selectedSlot && (
          <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium">Seçilen Randevu:</p>
            <p className="text-lg font-semibold text-primary">
              {format(selectedSlot.startTime, "d MMMM yyyy, EEEE - HH:mm", { locale: tr })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
