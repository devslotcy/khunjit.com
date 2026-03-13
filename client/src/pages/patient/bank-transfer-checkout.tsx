import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { formatAppointmentTime } from "@/lib/datetime";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, CheckCircle, Clock, AlertCircle, Building2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, PsychologistProfile } from "@shared/schema";

interface AppointmentWithPsychologist extends Appointment {
  psychologist?: PsychologistProfile;
}

export default function BankTransferCheckout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get appointmentId from URL query params
  const appointmentId = new URLSearchParams(window.location.search).get("appointmentId");

  const [appointment, setAppointment] = useState<AppointmentWithPsychologist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const bankInfo = {
    bankName: "İş Bankası",
    accountHolder: "KhunJit Teknoloji A.Ş.",
    iban: "TR33 0006 4000 0011 2345 6789 01",
  };

  useEffect(() => {
    if (!appointmentId) {
      setLocation("/patient/psychologists");
      return;
    }

    const fetchAppointment = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/appointments/${appointmentId}`);

        if (!response.ok) {
          throw new Error("Randevu bilgileri yüklenemedi");
        }

        const data = await response.json();
        setAppointment(data);
      } catch (err) {
        console.error("Error fetching appointment:", err);
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId, setLocation]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Kopyalandı",
        description: `${label} panoya kopyalandı`,
      });
    } catch (err) {
      toast({
        title: "Kopyalama başarısız",
        description: "Lütfen manuel olarak kopyalayın",
        variant: "destructive",
      });
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointmentId) return;

    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Randevu iptal edilemedi");
      }

      toast({
        title: "Randevu İptal Edildi",
        description: "Randevunuz başarıyla iptal edilmiştir.",
      });

      setLocation("/dashboard/appointments");
    } catch (err) {
      console.error("Error cancelling appointment:", err);
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const handleSubmitTransfer = async () => {
    if (!appointmentId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/appointments/bank-transfer/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Transfer bildirimi gönderilemedi");
      }

      // Show success message
      toast({
        title: "✅ Rezervasyon Gerçekleştirildi",
        description: "Ödemeniz kontrol edildikten sonra randevunuz onaylanacak. Ana sayfaya yönlendiriliyorsunuz...",
        duration: 5000,
      });

      // Redirect to appointments page after 5 seconds
      setTimeout(() => {
        setLocation("/dashboard/appointments");
      }, 5000);
    } catch (err) {
      console.error("Error submitting transfer:", err);
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: string | null) => {
    if (!price) return "Not specified";
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(parseFloat(price));
  };

  const generateReferenceCode = (id: string) => {
    return `MW-${id.substring(0, 8).toUpperCase()}`;
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!appointment || !appointment.psychologist) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Randevu bulunamadı</h2>
            <p className="text-muted-foreground mb-4">
              {error || "Bu randevuya erişim sağlanamadı"}
            </p>
            <Button onClick={() => setLocation("/psychologists")}>
              Psikologlar Listesine Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const referenceCode = generateReferenceCode(appointment.id);

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-serif mb-2">Havale ile Ödeme</h1>
        <p className="text-muted-foreground">
          Randevu ödemenizi havale/EFT ile gerçekleştirin
        </p>
      </div>

      <div className="space-y-6">
        {/* Order Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Sipariş Özeti
            </CardTitle>
            <CardDescription>Randevu detayları</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-muted-foreground">Psikolog</span>
                <span className="font-medium">{appointment.psychologist.fullName}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-muted-foreground">Tarih / Saat</span>
                <div className="text-right">
                  <div className="font-medium">
                    {formatAppointmentTime(appointment.startAt, appointment.endAt).date}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatAppointmentTime(appointment.startAt, appointment.endAt).time}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-muted-foreground">Süre</span>
                <span className="font-medium">{appointment.psychologist.sessionDuration || 50} dakika</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-semibold">Ücret</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(appointment.psychologist.pricePerSession)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Transfer Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Havale Bilgileri
            </CardTitle>
            <CardDescription>
              Aşağıdaki hesap bilgilerine havale/EFT yapın
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bank Name */}
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Banka Adı
              </label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{bankInfo.bankName}</span>
              </div>
            </div>

            {/* Account Holder */}
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Alıcı Adı Soyadı
              </label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                <span className="font-medium">{bankInfo.accountHolder}</span>
              </div>
            </div>

            {/* IBAN */}
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                IBAN
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-muted/50 rounded-lg border font-mono text-sm">
                  {bankInfo.iban}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(bankInfo.iban, "IBAN")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Reference Code */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 mb-2">
                    Önemli: Açıklama alanına mutlaka randevu kodunu yazın
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded font-mono text-base font-bold text-amber-900">
                      {referenceCode}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(referenceCode, "Randevu kodu")}
                      className="border-amber-300"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Kopyala
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Transfer Tutarı</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(appointment.psychologist.pricePerSession)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Hata</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Button */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Ödeme Onay Süreci</p>
                  <p>
                    Havale/EFT işleminizi tamamladıktan sonra aşağıdaki butona tıklayın.
                    Ödemeniz kontrol edildikten sonra randevunuz onaylanacak ve size bildirim gönderilecektir.
                    Bu işlem genellikle 1-2 iş günü içinde tamamlanır.
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-12 text-base"
              size="lg"
              onClick={handleSubmitTransfer}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Transferi Gerçekleştirdim
                </>
              )}
            </Button>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCancelDialog(true)}
                disabled={isSubmitting || isCancelling}
              >
                İptal
              </Button>
            </div>

            {/* Cancel Confirmation Dialog */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Randevuyu İptal Et</DialogTitle>
                  <DialogDescription>
                    Bu randevuyu iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelDialog(false)}
                    disabled={isCancelling}
                  >
                    Hayır, Devam Et
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelAppointment}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        İptal Ediliyor...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Evet, İptal Et
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
