import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  AlertCircle,
  CreditCard,
  Calendar,
  User,
  Loader2,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { formatAppointmentTime } from "@/lib/datetime";
import type { Appointment, PsychologistProfile } from "@shared/schema";

// Initialize Stripe with publishable key
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

type AppointmentWithDetails = Appointment & {
  psychologist: PsychologistProfile;
};

interface PaymentBreakdown {
  sessionPrice: number;
  currency: string;
  platformFeeRate: number;
  platformFee: number;
  psychologistGross: number;
  countryCode: string;
  withholdingRate: number;
  withholdingAmount: number;
  psychologistNet: number;
  platformNet: number;
}

interface PaymentIntentResponse {
  success: boolean;
  clientSecret: string;
  paymentIntentId: string;
  paymentId: string;
  breakdown: PaymentBreakdown;
}

// Payment Form Component with Stripe Elements
function PaymentForm({
  appointmentId,
  amount,
  onSuccess,
}: {
  appointmentId: string;
  amount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/booking-success?appointmentId=${appointmentId}`,
        },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed. Please try again.");
        toast({
          title: "Payment Failed",
          description: error.message || "Please check your card details and try again.",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Confirm payment on backend (updates appointment status)
        // Try multiple methods to ensure confirmation
        let confirmed = false;

        // Method 1: Direct confirm endpoint
        try {
          const response = await fetch("/api/payments/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              appointmentId,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            confirmed = data.success === true;
            console.log("[Payment] Confirm response:", data);
          }
        } catch (confirmError) {
          console.warn("[Payment] Confirm failed:", confirmError);
        }

        // Method 2: Sync endpoint (fallback)
        if (!confirmed) {
          try {
            const response = await fetch("/api/payments/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ appointmentId }),
            });
            if (response.ok) {
              const data = await response.json();
              confirmed = data.success === true && data.status === "confirmed";
              console.log("[Payment] Sync response:", data);
            }
          } catch (syncError) {
            console.warn("[Payment] Sync failed:", syncError);
          }
        }

        if (confirmed) {
          console.log("[Payment] ✓ Payment confirmed successfully");
        } else {
          console.warn("[Payment] Could not confirm via API, but Stripe succeeded");
        }

        toast({
          title: "Payment Successful",
          description: "Your appointment has been confirmed!",
        });
        onSuccess();
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred. Please try again.");
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Stripe Payment Element */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing payment...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Pay {formatPrice(amount)}
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By proceeding, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [hasAttemptedCreate, setHasAttemptedCreate] = useState(false);

  const { data: appointment, isLoading, error: appointmentError } = useQuery<AppointmentWithDetails>({
    queryKey: [`/api/appointments/${id}`],
    enabled: !!id,
  });

  // Create Payment Intent when appointment is loaded
  const createIntentMutation = useMutation({
    mutationFn: async (): Promise<PaymentIntentResponse> => {
      const response = await apiRequest("POST", "/api/payments/create-intent", {
        appointmentId: id,
      });
      const data = await response.json();
      return data as PaymentIntentResponse;
    },
    onSuccess: (data) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        toast({
          title: "Error",
          description: "Failed to initialize payment",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    },
  });

  // Create payment intent when appointment is loaded and not already paid
  useEffect(() => {
    if (
      appointment &&
      !clientSecret &&
      !hasAttemptedCreate &&
      appointment.status !== "confirmed" &&
      appointment.status !== "completed"
    ) {
      setHasAttemptedCreate(true);
      createIntentMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment, clientSecret, hasAttemptedCreate]);

  const formatPrice = (amount: string | number | null) => {
    if (!amount) return "$0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const handlePaymentSuccess = () => {
    navigate(`/dashboard/booking-success?appointmentId=${id}`);
  };

  if (isLoading) {
    return (
      <DashboardLayout role="patient">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (appointmentError || !appointment) {
    return (
      <DashboardLayout role="patient">
        <div className="max-w-2xl mx-auto text-center py-16">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2">Appointment Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This appointment does not exist or has expired.
          </p>
          <Button onClick={() => navigate("/dashboard/appointments")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Appointments
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Check if appointment is already paid
  if (appointment.status === "confirmed" || appointment.status === "completed") {
    return (
      <DashboardLayout role="patient">
        <div className="max-w-2xl mx-auto text-center py-16">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2">Payment Already Complete</h2>
          <p className="text-muted-foreground mb-4">
            This appointment has already been paid for.
          </p>
          <Button onClick={() => navigate("/dashboard/appointments")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            View My Appointments
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const pricePerSession = parseFloat(appointment.psychologist.pricePerSession || "50");

  return (
    <DashboardLayout role="patient">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard/psychologists")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold font-serif mb-2">Complete Your Payment</h1>
          <p className="text-muted-foreground">
            Secure payment powered by Stripe
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Session Details
              </CardTitle>
              <CardDescription>Your appointment summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Psychologist
                  </span>
                  <span className="font-medium">{appointment.psychologist.fullName}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-muted-foreground">Date & Time</span>
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
                  <span className="text-sm text-muted-foreground">Session Duration</span>
                  <span className="font-medium">{appointment.psychologist.sessionDuration || 50} minutes</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(pricePerSession)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Method
              </CardTitle>
              <CardDescription>
                Enter your card details below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stripe Trust Badge */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>Secure Payment</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your payment is processed securely by Stripe. We never store your card details.
                </p>
              </div>

              {/* Payment Form or Loading */}
              {createIntentMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Initializing secure payment...</p>
                </div>
              ) : clientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "#7c3aed",
                        borderRadius: "8px",
                      },
                    },
                  }}
                >
                  <PaymentForm
                    appointmentId={id!}
                    amount={pricePerSession}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              ) : createIntentMutation.isError ? (
                <div className="text-center py-8 space-y-4">
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Failed to initialize payment. Please try again.
                  </p>
                  <Button onClick={() => createIntentMutation.mutate()} variant="outline">
                    Retry
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Info Box */}
        <Card>
          <CardContent className="p-6">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-2">What happens next?</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Enter your card details in the form above</li>
                    <li>Click "Pay" to complete the payment</li>
                    <li>Your appointment will be instantly confirmed</li>
                    <li>You'll receive a confirmation email with session details</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
