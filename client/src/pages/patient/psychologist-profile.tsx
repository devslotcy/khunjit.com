import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { ProfileSidebar } from "@/components/profile-sidebar";
import { AvailabilityPanel, type TimeSlot } from "@/components/availability-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import type { PsychologistProfile } from "@shared/schema";

export default function PsychologistProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  console.log("[PsychologistProfile] Component loaded, id:", id);

  const { data: psychologist, isLoading } = useQuery<PsychologistProfile>({
    queryKey: [`/api/psychologists/${id}`],
    enabled: !!id,
  });

  const reserveMutation = useMutation({
    mutationFn: async (slotData: { startTime: Date; endTime: Date }) => {
      return apiRequest("POST", "/api/appointments/reserve", {
        psychologistId: id,
        startAt: slotData.startTime.toISOString(),
        endAt: slotData.endTime.toISOString(),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Randevu rezerve edildi",
        description: "Ödeme sayfasına yönlendiriliyorsunuz...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      navigate(`/dashboard/payment/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Randevu alınırken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const formatSlotTime = (slot: { startTime: Date; endTime: Date }) => {
    return `${format(slot.startTime, "d MMMM yyyy, EEEE - HH:mm", { locale: enUS })} - ${format(slot.endTime, "HH:mm")}`;
  };

  const handleBookAppointment = () => {
    if (!selectedSlot) {
      toast({
        title: "Randevu saati seçin",
        description: "Lütfen bir randevu saati seçin",
        variant: "destructive",
      });
      return;
    }

    reserveMutation.mutate({
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout role="patient">
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-3">
              <Skeleton className="h-[600px] w-full rounded-lg" />
            </div>
            <div className="md:col-span-9">
              <Skeleton className="h-[600px] w-full rounded-lg" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!psychologist) {
    return (
      <DashboardLayout role="patient">
        <div className="text-center py-16">
          <h2 className="font-serif text-2xl font-bold mb-2">Psikolog bulunamadı</h2>
          <p className="text-muted-foreground mb-4">
            Aradığınız psikolog mevcut değil veya profilini gizlemiş olabilir
          </p>
          <Button variant="outline" onClick={() => navigate("/dashboard/psychologists")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard/psychologists")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Sidebar - col-3 on desktop (>= md), col-12 on mobile */}
          <div className="md:col-span-3">
            <ProfileSidebar
              psychologist={psychologist}
              onBookAppointment={handleBookAppointment}
              selectedSlot={selectedSlot}
              isBooking={reserveMutation.isPending}
              formatSlotTime={formatSlotTime}
            />
          </div>

          {/* Right Panel - col-9 on desktop (>= md), col-12 on mobile */}
          <div className="md:col-span-9">
            <AvailabilityPanel
              psychologistId={id!}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              sessionDuration={psychologist.sessionDuration || 50}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
