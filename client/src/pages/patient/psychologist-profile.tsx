import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { SlotPicker, type TimeSlot } from "@/components/slot-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  CheckCircle2, 
  Star, 
  Clock, 
  Languages, 
  GraduationCap,
  Award,
  ArrowLeft,
  Calendar
} from "lucide-react";
import { format, addMinutes } from "date-fns";
import { tr } from "date-fns/locale";
import type { PsychologistProfile } from "@shared/schema";

export default function PsychologistProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const { data: psychologist, isLoading } = useQuery<PsychologistProfile>({
    queryKey: ["/api/psychologists", id],
  });

  const { data: slots, isLoading: slotsLoading } = useQuery<TimeSlot[]>({
    queryKey: ["/api/psychologists", id, "slots"],
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

  const formatPrice = (price: string | null) => {
    if (!price) return "Belirtilmemiş";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(parseFloat(price));
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
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-card-border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    <Skeleton className="w-24 h-24 rounded-xl" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Skeleton className="h-64 w-full rounded-lg" />
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

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-card-border">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <Avatar className="w-24 h-24 rounded-xl">
                    <AvatarImage src={psychologist.profileImageUrl || undefined} />
                    <AvatarFallback className="rounded-xl text-2xl">
                      {psychologist.fullName?.split(' ').map(n => n[0]).join('') || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h1 className="font-serif text-2xl font-bold">
                          {psychologist.fullName}
                        </h1>
                        {psychologist.verified && (
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <p className="text-muted-foreground">
                        {psychologist.title || "Klinik Psikolog"}
                      </p>
                    </div>

                    {psychologist.bio && (
                      <p className="text-muted-foreground">
                        {psychologist.bio}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm">
                      {psychologist.yearsOfExperience && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-primary" />
                          <span>{psychologist.yearsOfExperience} yıl deneyim</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{psychologist.sessionDuration || 50} dakika seans</span>
                      </div>
                      {psychologist.languages && psychologist.languages.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Languages className="w-4 h-4 text-muted-foreground" />
                          <span>{psychologist.languages.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {psychologist.specialties && psychologist.specialties.length > 0 && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Uzmanlık Alanları</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {psychologist.specialties.map((specialty, i) => (
                      <Badge key={i} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(psychologist.education || (psychologist.certifications && psychologist.certifications.length > 0)) && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Eğitim ve Sertifikalar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {psychologist.education && (
                    <div className="flex items-start gap-3">
                      <GraduationCap className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Eğitim</p>
                        <p className="text-sm text-muted-foreground">{psychologist.education}</p>
                      </div>
                    </div>
                  )}
                  {psychologist.certifications && psychologist.certifications.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Award className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Sertifikalar</p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {psychologist.certifications.map((cert, i) => (
                            <li key={i}>{cert}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <SlotPicker
              slots={slots || []}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              isLoading={slotsLoading}
            />
          </div>

          <div className="space-y-4">
            <Card className="border-card-border sticky top-6">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Randevu Al</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Seans ücreti</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(psychologist.pricePerSession)}
                  </span>
                </div>

                <Separator />

                {selectedSlot ? (
                  <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-medium">Seçilen Randevu</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {format(selectedSlot.startTime, "d MMMM yyyy", { locale: tr })}
                    </p>
                    <p className="text-muted-foreground">
                      {format(selectedSlot.startTime, "EEEE, HH:mm", { locale: tr })} - {format(selectedSlot.endTime, "HH:mm")}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Randevu almak için yukarıdan bir saat seçin
                  </p>
                )}

                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={!selectedSlot || reserveMutation.isPending}
                  onClick={handleBookAppointment}
                  data-testid="button-book-appointment"
                >
                  {reserveMutation.isPending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
                  ) : (
                    <>
                      <Calendar className="w-5 h-5 mr-2" />
                      Randevu Al
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Randevu 10 dakika içinde ödeme yapılmazsa iptal edilir
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
