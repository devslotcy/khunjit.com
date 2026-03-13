import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { formatAppointmentTime } from "@/lib/datetime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, Clock, User, Loader2, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import type { Appointment, PsychologistProfile } from "@shared/schema";

// Initialize Stripe for checking payment intent status
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface AppointmentWithPsychologist extends Appointment {
  psychologist?: PsychologistProfile;
}

type PaymentStatus = "loading" | "succeeded" | "processing" | "failed" | "requires_action";

export default function BookingSuccess() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [appointment, setAppointment] = useState<AppointmentWithPsychologist | null>(null);
  const [countdown, setCountdown] = useState(8);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasCheckedPayment = useRef(false);

  // Get parameters from URL
  const params = new URLSearchParams(window.location.search);
  const appointmentId = params.get("appointmentId");
  const stripeSessionId = params.get("session_id");
  const paymentIntentClientSecret = params.get("payment_intent_client_secret");
  const redirectStatus = params.get("redirect_status");

  // Confirm payment on backend - ensures appointment gets confirmed even without webhooks
  const confirmPaymentOnBackend = useCallback(async (paymentIntentId: string) => {
    if (!appointmentId) return;

    let confirmed = false;

    // Method 1: Direct confirm endpoint
    try {
      const response = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paymentIntentId, appointmentId }),
      });

      if (response.ok) {
        const data = await response.json();
        confirmed = data.success === true;
        console.log("[BookingSuccess] Confirm response:", data);
      }
    } catch (err) {
      console.warn("[BookingSuccess] Confirm failed:", err);
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
          console.log("[BookingSuccess] Sync response:", data);
        }
      } catch (err) {
        console.warn("[BookingSuccess] Sync failed:", err);
      }
    }

    if (confirmed) {
      console.log("[BookingSuccess] ✓ Payment confirmed successfully");
    } else {
      console.warn("[BookingSuccess] Could not confirm via API");
    }
  }, [appointmentId]);

  // Check payment intent status if redirected from Stripe (3D Secure, etc.)
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (hasCheckedPayment.current) return;
      hasCheckedPayment.current = true;

      // If redirected from Stripe with client secret, verify payment status
      if (paymentIntentClientSecret) {
        try {
          const stripe = await stripePromise;
          if (!stripe) {
            setPaymentStatus("failed");
            setErrorMessage("Failed to initialize Stripe");
            return;
          }

          const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentClientSecret);

          if (!paymentIntent) {
            setPaymentStatus("failed");
            setErrorMessage("Could not retrieve payment information");
            return;
          }

          switch (paymentIntent.status) {
            case "succeeded":
              setPaymentStatus("succeeded");
              // Confirm payment on backend to ensure appointment is updated
              confirmPaymentOnBackend(paymentIntent.id);
              break;
            case "processing":
              setPaymentStatus("processing");
              break;
            case "requires_payment_method":
              setPaymentStatus("failed");
              setErrorMessage("Payment failed. Please try again with a different payment method.");
              break;
            case "requires_action":
              setPaymentStatus("requires_action");
              setErrorMessage("Additional authentication required.");
              break;
            default:
              setPaymentStatus("failed");
              setErrorMessage(`Unexpected payment status: ${paymentIntent.status}`);
          }
        } catch (err) {
          console.error("Error checking payment status:", err);
          // If we can't check, assume success if redirect_status is "succeeded"
          if (redirectStatus === "succeeded") {
            setPaymentStatus("succeeded");
          } else {
            setPaymentStatus("failed");
            setErrorMessage("Could not verify payment status");
          }
        }
      } else if (redirectStatus === "succeeded") {
        setPaymentStatus("succeeded");
      } else {
        // No payment info in URL, assume page was reached after successful payment
        setPaymentStatus("succeeded");
      }
    };

    checkPaymentStatus();
  }, [paymentIntentClientSecret, redirectStatus, confirmPaymentOnBackend]);

  // Fetch appointment details
  useEffect(() => {
    const fetchAppointment = async () => {
      setIsLoading(true);

      try {
        // If we have an appointment ID, fetch directly
        if (appointmentId) {
          const response = await fetch(`/api/appointments/${appointmentId}`, {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            setAppointment(data);
            setIsLoading(false);
            return;
          }
        }

        // If we have a Stripe session ID, fetch the latest confirmed appointment
        if (stripeSessionId) {
          const response = await fetch("/api/appointments/patient", {
            credentials: "include",
          });
          if (response.ok) {
            const appointments = await response.json();
            // Find the most recent confirmed appointment
            const confirmedAppointment = appointments.find(
              (apt: Appointment) => apt.status === "confirmed"
            );
            if (confirmedAppointment) {
              setAppointment(confirmedAppointment);
              setIsLoading(false);
              return;
            }
          }
        }

        // If no appointment found, wait a bit for webhook to process
        // and then try again
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Try fetching again
        if (appointmentId) {
          const response = await fetch(`/api/appointments/${appointmentId}`, {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            setAppointment(data);
            setIsLoading(false);
            return;
          }
        }

        // Still no appointment, just show success without details
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching appointment:", err);
        setIsLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId, stripeSessionId]);

  // Countdown timer and auto-redirect (only if payment succeeded)
  useEffect(() => {
    if (paymentStatus !== "succeeded" && paymentStatus !== "loading") {
      return;
    }

    if (countdown === 0) {
      setLocation("/dashboard");
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, setLocation, paymentStatus]);

  const formatPrice = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  // Show loading while checking payment status
  if (paymentStatus === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-gray-600 dark:text-gray-300">Verifying your payment...</p>
      </div>
    );
  }

  // Show error if payment failed
  if (paymentStatus === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4">
                <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-red-900 dark:text-red-100">
              Payment Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600 dark:text-gray-300">
              {errorMessage || "Your payment could not be processed."}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => appointmentId
                  ? setLocation(`/dashboard/payment/${appointmentId}`)
                  : setLocation("/dashboard/appointments")
                }
                className="w-full"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/dashboard")}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show processing status
  if (paymentStatus === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-full p-4">
                <Loader2 className="w-12 h-12 text-yellow-600 dark:text-yellow-400 animate-spin" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              Payment Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600 dark:text-gray-300">
              Your payment is being processed. This may take a few moments.
            </p>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              You will receive a confirmation email once the payment is complete.
            </p>
            <Button
              variant="outline"
              onClick={() => setLocation("/dashboard")}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show requires action status
  if (paymentStatus === "requires_action") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-4">
                <AlertCircle className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600 dark:text-gray-300">
              Additional authentication is required to complete your payment.
            </p>
            <Button
              onClick={() => appointmentId
                ? setLocation(`/dashboard/payment/${appointmentId}`)
                : setLocation("/dashboard/appointments")
              }
              className="w-full"
            >
              Complete Payment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-6">
              <CheckCircle className="w-20 h-20 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-4xl font-bold font-serif text-green-900 dark:text-green-100 mb-2">
            Congratulations!
          </CardTitle>
          <p className="text-xl text-green-700 dark:text-green-300">
            Your booking has been confirmed
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Appointment Details */}
          {appointment ? (
            <div className="bg-white dark:bg-gray-800 border-2 border-green-100 dark:border-green-800 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg mb-4 text-center text-gray-900 dark:text-gray-100">
                Appointment Details
              </h3>

              {/* Psychologist */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="bg-primary/10 p-3 rounded-full">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Psychologist</p>
                  <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                    {appointment.psychologist?.fullName || "—"}
                  </p>
                  {appointment.psychologist?.title && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t(`titles.${appointment.psychologist.title}`, appointment.psychologist.title)}
                    </p>
                  )}
                </div>
              </div>

              {/* Date and Time */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Date</p>
                  <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                    {formatAppointmentTime(appointment.startAt, appointment.endAt).date}
                  </p>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time & Duration</p>
                  <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                    {formatAppointmentTime(appointment.startAt, appointment.endAt).time}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {appointment.psychologist?.sessionDuration || 50} minutes
                  </p>
                </div>
              </div>

              {/* Amount */}
              {appointment.psychologist?.pricePerSession && (
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Total Amount</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(appointment.psychologist.pricePerSession)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border-2 border-green-100 dark:border-green-800 rounded-lg p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Your appointment has been confirmed. Check your email for details.
              </p>
            </div>
          )}

          {/* Success Message */}
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <p className="text-green-900 dark:text-green-100 font-medium mb-2">
              ✅ Your payment was successful
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              A confirmation email has been sent to your email address
            </p>
          </div>

          {/* Auto-redirect notice */}
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Redirecting to your dashboard in {countdown} seconds...
            </p>
            <button
              onClick={() => setLocation("/dashboard")}
              className="mt-4 text-primary hover:underline font-medium"
            >
              Go to dashboard now
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
