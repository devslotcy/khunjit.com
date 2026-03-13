import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  CheckCircle2,
  Star,
  Clock,
  Languages,
  GraduationCap,
  Award,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { format, parseISO, startOfDay, isSameDay } from "date-fns";
import { enUS } from "date-fns/locale";
import type { PsychologistProfile } from "@shared/schema";

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export default function PsychologistDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const psychologistId = params.id;
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  console.log("[PsychologistDetail] COMPONENT RENDERED!");
  console.log("[PsychologistDetail] Current location:", location);
  console.log("[PsychologistDetail] Params object:", params);
  console.log("[PsychologistDetail] ID from params:", psychologistId);

  const { data: psychologist, isLoading: loadingProfile } = useQuery<PsychologistProfile>({
    queryKey: [`/api/psychologists/${psychologistId}`],
    enabled: !!psychologistId,
  });

  const { data: slots, isLoading: loadingSlots } = useQuery<TimeSlot[]>({
    queryKey: [`/api/psychologists/${psychologistId}/slots`],
    enabled: !!psychologistId,
  });

  const reserveMutation = useMutation({
    mutationFn: async (slotData: { startTime: string; endTime: string }) => {
      console.log("[Reserve] Starting reservation with data:", {
        psychologistId,
        startAt: slotData.startTime,
        endAt: slotData.endTime,
      });
      const response = await apiRequest("POST", "/api/appointments/reserve", {
        psychologistId,
        startAt: slotData.startTime,
        endAt: slotData.endTime,
      });
      const data = await response.json();
      console.log("[Reserve] Reservation successful, appointment data:", data);
      return data;
    },
    onSuccess: (data: any) => {
      console.log("[Reserve] onSuccess called with data:", data);
      console.log("[Reserve] Appointment ID:", data.id);

      if (!data.id) {
        console.error("[Reserve] No appointment ID received!");
        toast({
          title: "Hata",
          description: "Randevu ID'si alınamadı",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Randevu Rezerve Edildi",
        description: "Ödeme sayfasına yönlendiriliyorsunuz...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      const paymentUrl = `/dashboard/payment/${data.id}`;
      console.log("[Reserve] Navigating to:", paymentUrl);

      // Use window.location.href for more reliable navigation
      setTimeout(() => {
        window.location.href = paymentUrl;
      }, 500);
    },
    onError: (error: Error) => {
      console.error("[Reserve] Reservation failed:", error);
      toast({
        title: "Hata",
        description: error.message || "Randevu alınırken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: string | null) => {
    if (!price) return "฿0.00";
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(parseFloat(price));
  };

  // Group slots by date
  const slotsByDate = slots?.reduce((acc, slot) => {
    const date = startOfDay(parseISO(slot.startTime));
    const dateKey = date.toISOString();
    if (!acc[dateKey]) {
      acc[dateKey] = { date, slots: [] };
    }
    acc[dateKey].slots.push(slot);
    return acc;
  }, {} as Record<string, { date: Date; slots: TimeSlot[] }>);

  const availableDates = slotsByDate ? Object.values(slotsByDate) : [];

  const selectedDateSlots = selectedDate
    ? slotsByDate?.[startOfDay(selectedDate).toISOString()]?.slots || []
    : [];

  const handleBookNow = () => {
    if (!selectedSlot) {
      toast({
        title: "Saat Seçin",
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

  if (loadingProfile) {
    return (
      <DashboardLayout role="patient">
        <div className="space-y-6">
          <Skeleton className="h-10 w-full max-w-xs" />
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Skeleton className="w-32 h-32 rounded-xl" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!psychologist) {
    return (
      <DashboardLayout role="patient">
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-4">Psikolog Bulunamadı</h2>
          <p className="text-muted-foreground mb-6">
            Aradığınız psikolog mevcut değil veya aktif değil.
          </p>
          <Button onClick={() => navigate("/dashboard/psychologists")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Listeye Dön
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/psychologists")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-3xl font-bold">Psikolog Profili</h1>
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="p-2">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left side - Profile info */}
              <div className="flex-1">
                <div className="flex items-start gap-6 mb-6">
                  <Avatar className="w-32 h-32 rounded-xl">
                    <AvatarImage src={psychologist.profileImageUrl || undefined} />
                    <AvatarFallback className="rounded-xl text-2xl">
                      {psychologist.fullName?.split(" ").map((n) => n[0]).join("") || "P"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-4">
                    <div>
                      {/* Title first (top line) - secondary/lighter style */}
                      {psychologist.title && (
                        <p className="text-lg text-muted-foreground">
                          {t(`titles.${psychologist.title}`, psychologist.title)}
                        </p>
                      )}
                      {/* Name second (bottom line) - primary/bolder style */}
                      <div className="flex items-center gap-2">
                        <h2 className="font-serif text-2xl font-semibold">
                          {psychologist.fullName}
                        </h2>
                        {psychologist.verified && (
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      {psychologist.yearsOfExperience && (
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 text-primary" />
                          <span className="font-medium">
                            {psychologist.yearsOfExperience} yıl deneyim
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <span>{psychologist.sessionDuration || 50} dakika</span>
                      </div>
                      {psychologist.languages && psychologist.languages.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Languages className="w-5 h-5 text-muted-foreground" />
                          <span>{psychologist.languages.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {psychologist.bio && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-2">Hakkında</h3>
                    <p className="text-muted-foreground break-words">{psychologist.bio}</p>
                  </div>
                )}

                {/* Specialties */}
                {psychologist.specialties && psychologist.specialties.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-2">Uzmanlık Alanları</h3>
                    <div className="flex flex-wrap gap-2 break-words">
                      {psychologist.specialties.map((specialty, i) => (
                        <Badge key={i} variant="secondary" className="break-words max-w-full">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Therapy Approaches */}
                {psychologist.therapyApproaches && psychologist.therapyApproaches.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-2">Terapi Yaklaşımları</h3>
                    <div className="flex flex-wrap gap-2 break-words">
                      {psychologist.therapyApproaches.map((approach, i) => (
                        <Badge key={i} variant="outline" className="break-words max-w-full">
                          {approach}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {psychologist.education && (
                  <div className="mb-4">
                    <div className="flex items-start gap-2">
                      <GraduationCap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium mb-1">Eğitim</h3>
                        <p className="text-sm text-muted-foreground">
                          {psychologist.education}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {psychologist.certifications && psychologist.certifications.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-start gap-2">
                      <Award className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium mb-1">Sertifikalar</h3>
                        <p className="text-sm text-muted-foreground">
                          {psychologist.certifications.join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Office Address - commented out as field doesn't exist in schema */}
                {/* {psychologist.officeAddress && (
                  <div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium mb-1">Ofis Adresi</h3>
                        <p className="text-sm text-muted-foreground">
                          {psychologist.officeAddress}
                        </p>
                      </div>
                    </div>
                  </div>
                )} */}
              </div>

              {/* Right side - Price and Book button */}
              <div className="lg:w-80">
                <Card className="border-primary/20 bg-primary/5 sticky top-6">
                  <CardContent className="p-6 space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Seans Ücreti</p>
                      <p className="text-3xl font-bold text-primary">
                        {formatPrice(psychologist.pricePerSession)}
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => {
                        // Scroll to appointment section
                        document.getElementById("appointment-section")?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }}
                    >
                      <Calendar className="w-5 h-5 mr-2" />
                      Randevu Al
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      Randevu 10 dakika içinde ödeme yapılmazsa iptal edilir
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointment Section */}
        <Card id="appointment-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Müsait Randevu Saatleri
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 space-y-6">
            {loadingSlots ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : availableDates.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Şu an müsait randevu bulunmamaktadır.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Psikolog henüz müsaitlik saatlerini ayarlamamış olabilir.
                </p>
              </div>
            ) : (
              <>
                {/* Date Selection */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Tarih Seçin</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableDates.map(({ date, slots }) => {
                      const availableCount = slots.filter((s) => s.isAvailable).length;
                      const isSelected = selectedDate && isSameDay(date, selectedDate);

                      return (
                        <Button
                          key={date.toISOString()}
                          variant={isSelected ? "default" : "outline"}
                          className="h-auto py-3 w-full md:w-[132px] flex-row md:flex-col md:justify-center items-center"
                          onClick={() => setSelectedDate(date)}
                          disabled={availableCount === 0}
                        >
                          <span className="font-semibold w-1/3 md:w-auto text-left md:text-center">
                            {format(date, "d MMMM", { locale: enUS })}
                          </span>
                          <span className="md:hidden mx-2">|</span>
                          <span className="text-xs opacity-80 w-1/3 md:w-auto text-center md:mt-0">
                            {format(date, "EEEE", { locale: enUS })}
                          </span>
                          <span className="md:hidden mx-2">|</span>
                          <span className="text-xs w-1/3 md:w-auto md:mt-1 text-right md:text-center">{availableCount} müsait</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDate && selectedDateSlots.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Saat Seçin</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedDateSlots.map((slot) => {
                        const isSelected = selectedSlot?.startTime === slot.startTime;
                        const slotTime = format(parseISO(slot.startTime), "HH:mm");

                        return (
                          <Button
                            key={slot.startTime}
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => setSelectedSlot(slot)}
                            disabled={!slot.isAvailable}
                            className="h-12 w-[calc(50%-0.25rem)] md:w-[132px]"
                          >
                            {slotTime}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Booking Summary */}
                {selectedSlot && (
                  <div className="pt-4 border-t">
                    <div className="bg-muted rounded-lg p-4 mb-4">
                      <h3 className="font-medium mb-2">Seçili Randevu</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(selectedSlot.startTime), "d MMMM yyyy, EEEE", {
                          locale: enUS,
                        })}{" "}
                        -{" "}
                        {format(parseISO(selectedSlot.startTime), "HH:mm")} -{" "}
                        {format(parseISO(selectedSlot.endTime), "HH:mm")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Süre: {psychologist.sessionDuration || 50} dakika
                      </p>
                      <p className="text-lg font-semibold text-primary mt-2">
                        Ücret: {formatPrice(psychologist.pricePerSession)}
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleBookNow}
                      disabled={reserveMutation.isPending}
                    >
                      {reserveMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2" />
                          Rezerve Ediliyor...
                        </>
                      ) : (
                        <>
                          <Calendar className="w-5 h-5 mr-2" />
                          Randevu Al ve Ödemeye Geç
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
