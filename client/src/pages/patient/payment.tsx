import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  Shield, 
  ArrowLeft,
  Calendar,
  AlertCircle
} from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import { tr } from "date-fns/locale";
import { useState, useEffect } from "react";
import type { Appointment, PsychologistProfile, Payment } from "@shared/schema";

type AppointmentWithDetails = Appointment & { 
  psychologist: PsychologistProfile;
  payment?: Payment;
};

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const { data: appointment, isLoading } = useQuery<AppointmentWithDetails>({
    queryKey: ["/api/appointments", id],
    enabled: !!id,
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/payments/checkout`, {
        appointmentId: id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Ödeme başarılı",
        description: "Randevunuz onaylandı!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      navigate("/dashboard/appointments");
    },
    onError: (error: Error) => {
      toast({
        title: "Ödeme hatası",
        description: error.message || "Ödeme işlemi başarısız oldu",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (appointment?.reservedUntil) {
      const interval = setInterval(() => {
        const now = new Date();
        const reservedUntil = new Date(appointment.reservedUntil!);
        const diff = differenceInSeconds(reservedUntil, now);
        
        if (diff <= 0) {
          clearInterval(interval);
          toast({
            title: "Süre doldu",
            description: "Randevu rezervasyonunuz sona erdi",
            variant: "destructive",
          });
          navigate("/dashboard/appointments");
        } else {
          setTimeLeft(diff);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [appointment?.reservedUntil, navigate, toast]);

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPrice = (amount: string | number | null) => {
    if (!amount) return "0,00 ₺";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(num);
  };

  if (isLoading) {
    return (
      <DashboardLayout role="patient">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Card className="border-card-border">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!appointment) {
    return (
      <DashboardLayout role="patient">
        <div className="max-w-2xl mx-auto text-center py-16">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2">Randevu bulunamadı</h2>
          <p className="text-muted-foreground mb-4">
            Bu randevu mevcut değil veya süresi dolmuş olabilir
          </p>
          <Button onClick={() => navigate("/dashboard/appointments")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Randevulara Dön
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const pricePerSession = parseFloat(appointment.psychologist.pricePerSession || "0");
  const vatRate = 0.20;
  const vatAmount = pricePerSession * vatRate;
  const netOfVat = pricePerSession - vatAmount;
  const platformFeeRate = 0.15;
  const platformFee = netOfVat * platformFeeRate;

  return (
    <DashboardLayout role="patient">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard/appointments")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </Button>

        {timeLeft > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-amber-600 font-medium">
                Ödeme için kalan süre
              </span>
            </div>
            <span className="text-2xl font-bold text-amber-600">
              {formatTimeLeft(timeLeft)}
            </span>
          </div>
        )}

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Randevu Detayları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{appointment.psychologist.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.psychologist.title || "Klinik Psikolog"}
                </p>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tarih</span>
                <span className="font-medium">
                  {format(new Date(appointment.startAt), "d MMMM yyyy, EEEE", { locale: tr })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saat</span>
                <span className="font-medium">
                  {format(new Date(appointment.startAt), "HH:mm")} - {format(new Date(appointment.endAt), "HH:mm")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Süre</span>
                <span className="font-medium">
                  {appointment.psychologist.sessionDuration || 50} dakika
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Ödeme Detayları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Seans Ücreti</span>
                <span>{formatPrice(pricePerSession)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">KDV (%20)</span>
                <span>{formatPrice(vatAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Toplam</span>
                <span className="text-primary">{formatPrice(pricePerSession)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>256-bit SSL şifreleme ile güvenli ödeme</span>
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full" 
          size="lg"
          onClick={() => payMutation.mutate()}
          disabled={payMutation.isPending}
          data-testid="button-pay"
        >
          {payMutation.isPending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              {formatPrice(pricePerSession)} Öde
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Ödeme yaparak <a href="#" className="underline">kullanım koşullarını</a> kabul etmiş olursunuz
        </p>
      </div>
    </DashboardLayout>
  );
}
