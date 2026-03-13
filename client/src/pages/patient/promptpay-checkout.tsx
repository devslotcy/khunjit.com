import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { formatAppointmentTime } from "@/lib/datetime";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, AlertCircle, QrCode, RefreshCw, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, PsychologistProfile } from "@shared/schema";

interface AppointmentWithPsychologist extends Appointment {
  psychologist?: PsychologistProfile;
}

interface PaymentInfo {
  id: string;
  amount: number;
  currency: string;
  status: string;
  qrImageUrl: string;
  expiresAt: string;
}

export default function PromptPayCheckout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const appointmentId = new URLSearchParams(window.location.search).get("appointmentId");

  const [appointment, setAppointment] = useState<AppointmentWithPsychologist | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");

  // Fetch appointment details
  useEffect(() => {
    if (!appointmentId) {
      return;
    }

    const fetchAppointment = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/appointments/${appointmentId}`);

        if (!response.ok) {
          throw new Error("Appointment details could not be loaded");
        }

        const data = await response.json();
        setAppointment(data);
      } catch (err) {
        console.error("Error fetching appointment:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId]);

  // Create payment when appointment loads
  const createPayment = useCallback(async () => {
    if (!appointmentId) return;

    setIsCreatingPayment(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/promptpay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create payment");
      }

      const data = await response.json();
      setPayment(data.payment);
      setPaymentStatus("pending");
    } catch (err) {
      console.error("Error creating payment:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsCreatingPayment(false);
    }
  }, [appointmentId]);

  // Create payment on mount
  useEffect(() => {
    if (appointment && !payment && !isCreatingPayment) {
      createPayment();
    }
  }, [appointment, payment, isCreatingPayment, createPayment]);

  // Countdown timer
  useEffect(() => {
    if (!payment?.expiresAt) return;

    const updateTimer = () => {
      const expiresAt = new Date(payment.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setPaymentStatus("expired");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [payment?.expiresAt]);

  // Poll for payment status
  useEffect(() => {
    if (!payment?.id || paymentStatus !== "pending") return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/payments/${payment.id}/status`);
        if (response.ok) {
          const data = await response.json();

          if (data.status === "paid") {
            setPaymentStatus("paid");
            toast({
              title: "Payment Successful!",
              description: "Your booking is now confirmed. Redirecting...",
            });
            setTimeout(() => setLocation(`/patient/booking-success?appointmentId=${appointmentId}`), 1000);
          } else if (data.status === "failed") {
            setPaymentStatus("failed");
          } else if (data.status === "expired") {
            setPaymentStatus("expired");
          }
        }
      } catch (err) {
        console.error("Error checking payment status:", err);
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [payment?.id, paymentStatus, toast, setLocation]);

  const handleRegenerateQR = async () => {
    if (!appointmentId) return;

    setIsCreatingPayment(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/${appointmentId}/regenerate-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to regenerate QR code");
      }

      const data = await response.json();
      setPayment(data.payment);
      setPaymentStatus("pending");

      toast({
        title: "New QR Code Generated",
        description: "Please scan the new QR code to complete payment",
      });
    } catch (err) {
      console.error("Error regenerating QR:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointmentId) return;

    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Could not cancel appointment");
      }

      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled.",
      });

      setLocation("/patient/appointments");
    } catch (err) {
      console.error("Error cancelling appointment:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const formatPrice = (amount: number, currency: string = "THB") => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle missing appointmentId
  useEffect(() => {
    if (!appointmentId && !isLoading) {
      setLocation("/patient/psychologists");
    }
  }, [appointmentId, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!appointmentId || !appointment || !appointment.psychologist) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Appointment Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error || "Could not access this appointment"}
            </p>
            <Button onClick={() => setLocation("/patient/psychologists")}>
              Back to Therapists
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-serif mb-2">PromptPay Payment</h1>
        <p className="text-muted-foreground">
          Scan the QR code with your Thai banking app to pay
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Order Summary
            </CardTitle>
            <CardDescription>Appointment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-muted-foreground">Therapist</span>
                <span className="font-medium">{appointment.psychologist.fullName}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-muted-foreground">Date / Time</span>
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
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="font-medium">{appointment.psychologist.sessionDuration || 50} minutes</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary">
                  {payment ? formatPrice(payment.amount, payment.currency) : formatPrice(parseFloat(appointment.psychologist.pricePerSession || "500"))}
                </span>
              </div>
            </div>

            {/* Payment Completion Button */}
            <div className="mt-6 pt-6 border-t">
              <Button
                onClick={() => setLocation("/dashboard")}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xl py-8"
                size="lg"
              >
                <CheckCircle className="w-6 h-6 mr-3" />
                Ödemeyi tamamladım
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Ödemenizi yaptıktan sonra bu butona tıklayın
              </p>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              PromptPay QR Code
            </CardTitle>
            <CardDescription>
              Scan with your banking app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment Status Banner */}
            {paymentStatus === "paid" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Payment Successful!</p>
                  <p className="text-sm text-green-700">Your booking is confirmed</p>
                </div>
              </div>
            )}

            {paymentStatus === "expired" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-900">QR Code Expired</p>
                    <p className="text-sm text-amber-700">Please generate a new one</p>
                  </div>
                </div>
                <Button
                  onClick={handleRegenerateQR}
                  disabled={isCreatingPayment}
                  className="w-full"
                >
                  {isCreatingPayment ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Generate New QR Code
                </Button>
              </div>
            )}

            {paymentStatus === "failed" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">Payment Failed</p>
                    <p className="text-sm text-red-700">Please try again</p>
                  </div>
                </div>
                <Button
                  onClick={handleRegenerateQR}
                  disabled={isCreatingPayment}
                  className="w-full"
                >
                  {isCreatingPayment ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Try Again
                </Button>
              </div>
            )}

            {/* QR Code Display */}
            {paymentStatus === "pending" && payment?.qrImageUrl && (
              <>
                {/* Timer */}
                {timeRemaining !== null && timeRemaining > 0 && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">QR kod süresi</p>
                    <p className={`text-2xl font-mono font-bold ${timeRemaining < 60 ? "text-red-600" : "text-primary"}`}>
                      {formatTimeRemaining(timeRemaining)}
                    </p>
                  </div>
                )}

                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl border-2 shadow-sm">
                    <img
                      src={payment.qrImageUrl}
                      alt="PromptPay QR Code"
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                </div>

                {/* Waiting indicator */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ödeme onayı bekleniyor...</span>
                </div>

                {/* Referans Kodu Display */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Referans Kodu</span>
                  </div>
                  <div className="bg-white border border-blue-300 rounded-md p-3 text-center">
                    <code className="text-2xl font-mono font-bold text-blue-900 tracking-wider">
                      {payment.id.slice(-8).toUpperCase()}
                    </code>
                  </div>
                </div>

                {/* Manual payment completion button */}
                <Button
                  onClick={async () => {
                    if (!payment?.id) return;
                    try {
                      const response = await fetch(`/api/payments/${payment.id}/simulate-complete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                      });
                      if (response.ok) {
                        toast({
                          title: "Ödeme Onaylandı!",
                          description: "Randevunuz onaylandı, yönlendiriliyorsunuz...",
                        });
                        setPaymentStatus("paid");
                        setTimeout(() => setLocation(`/patient/booking-success?appointmentId=${appointmentId}`), 1000);
                      } else {
                        throw new Error("Ödeme onaylanamadı");
                      }
                    } catch (err) {
                      console.error("Payment completion error:", err);
                      toast({
                        title: "Hata",
                        description: "Ödeme onaylanamadı",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-6"
                  size="lg"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Ödemeyi tamamladım
                </Button>
              </>
            )}

            {/* Loading state */}
            {isCreatingPayment && !payment && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Generating QR code...</p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Error</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-2">How to Pay with PromptPay</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open your Thai banking app (KBank, SCB, Bangkok Bank, etc.)</li>
                  <li>Select "Scan QR" or "PromptPay"</li>
                  <li>Scan the QR code above</li>
                  <li>Confirm the payment in your app</li>
                  <li>Your booking will be confirmed automatically</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCancelDialog(true)}
              disabled={isCreatingPayment || isCancelling || paymentStatus === "paid"}
            >
              Cancel Booking
            </Button>
          </div>

          {/* Cancel Confirmation Dialog */}
          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Appointment</DialogTitle>
                <DialogDescription>
                  Are you sure you want to cancel this appointment? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={isCancelling}
                >
                  No, Keep It
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelAppointment}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Yes, Cancel
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
