import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, Plus, Trash2, Save } from "lucide-react";
import type { AvailabilityRule } from "@shared/schema";

const dayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

interface DaySchedule {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export default function AvailabilitySettings() {
  const { toast } = useToast();

  const { data: rules, isLoading } = useQuery<AvailabilityRule[]>({
    queryKey: ["/api/availability/rules"],
  });

  const [schedule, setSchedule] = useState<DaySchedule[]>(() => {
    return dayNames.map((_, index) => ({
      dayOfWeek: index + 1,
      enabled: index < 5,
      startTime: "09:00",
      endTime: "17:00",
    }));
  });

  const [slotDuration, setSlotDuration] = useState(50);

  const saveMutation = useMutation({
    mutationFn: async (data: { rules: DaySchedule[]; slotDuration: number }) => {
      return apiRequest("POST", "/api/availability/rules", data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Müsaitlik ayarlarınız kaydedildi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/rules"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Ayarlar kaydedilirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleToggleDay = (dayOfWeek: number) => {
    setSchedule(prev => prev.map(day => 
      day.dayOfWeek === dayOfWeek ? { ...day, enabled: !day.enabled } : day
    ));
  };

  const handleTimeChange = (dayOfWeek: number, field: "startTime" | "endTime", value: string) => {
    setSchedule(prev => prev.map(day => 
      day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
    ));
  };

  const handleSave = () => {
    saveMutation.mutate({
      rules: schedule.filter(day => day.enabled),
      slotDuration,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout role="psychologist">
        <div className="space-y-6 max-w-3xl">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Card className="border-card-border">
            <CardContent className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="psychologist">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-2">Müsaitlik Ayarları</h1>
          <p className="text-muted-foreground">
            Haftalık çalışma saatlerinizi belirleyin
          </p>
        </div>

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Seans Süresi</CardTitle>
            <CardDescription>Her seansın varsayılan süresi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(parseInt(e.target.value) || 50)}
                  className="w-24"
                  min={15}
                  max={120}
                  step={5}
                  data-testid="input-slot-duration"
                />
                <span className="text-muted-foreground">dakika</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Haftalık Program</CardTitle>
            <CardDescription>Hangi günler ve saatlerde müsait olduğunuzu belirleyin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {schedule.map((day) => (
              <div 
                key={day.dayOfWeek} 
                className={`flex items-center gap-4 p-4 rounded-lg ${day.enabled ? 'bg-muted/50' : 'bg-muted/20'}`}
              >
                <Switch
                  checked={day.enabled}
                  onCheckedChange={() => handleToggleDay(day.dayOfWeek)}
                  data-testid={`switch-day-${day.dayOfWeek}`}
                />
                <span className={`w-28 font-medium ${!day.enabled && 'text-muted-foreground'}`}>
                  {dayNames[day.dayOfWeek - 1]}
                </span>
                
                {day.enabled && (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={day.startTime}
                        onChange={(e) => handleTimeChange(day.dayOfWeek, "startTime", e.target.value)}
                        className="w-32"
                        data-testid={`input-start-${day.dayOfWeek}`}
                      />
                    </div>
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={day.endTime}
                      onChange={(e) => handleTimeChange(day.dayOfWeek, "endTime", e.target.value)}
                      className="w-32"
                      data-testid={`input-end-${day.dayOfWeek}`}
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
            className="gap-2"
            data-testid="button-save-availability"
          >
            {saveMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Kaydet
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
