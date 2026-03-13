import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  XCircle,
} from "lucide-react";

interface StripeAccountStatus {
  enabled: boolean;
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  currentlyDue: string[];
  status: "NOT_CONNECTED" | "INCOMPLETE" | "ACTIVE";
}

export function StripeConnectCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch Stripe Connect status
  const { data: status, isLoading, refetch } = useQuery<StripeAccountStatus>({
    queryKey: ["/api/stripe/connect/status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/stripe/connect/status");
      return response.json();
    },
    retry: false,
  });

  // Check for return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_return") === "true") {
      // Remove query params
      window.history.replaceState({}, "", window.location.pathname);
      // Refresh status
      refetch();
      toast({
        title: t("common.success"),
        description: t("profile.stripeConnect.notConnected.description"),
      });
    }
    if (params.get("stripe_refresh") === "true") {
      // Remove query params
      window.history.replaceState({}, "", window.location.pathname);
      // Refresh status
      refetch();
    }
  }, [refetch, toast, t]);

  // Start onboarding mutation
  const startOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        status?.stripeAccountId
          ? "/api/stripe/connect/refresh"
          : "/api/stripe/connect/start"
      );
      return response.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        // Redirect to Stripe onboarding
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error.message || t("profile.stripeConnect.errors.connectionFailed"),
        variant: "destructive",
      });
      setIsConnecting(false);
    },
  });

  // Get dashboard link mutation
  const getDashboardLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/stripe/connect/dashboard");
      return response.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        // Open in new tab
        window.open(data.url, "_blank");
      }
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("profile.stripeConnect.errors.statusFailed"),
        variant: "destructive",
      });
    },
  });

  const handleConnect = () => {
    setIsConnecting(true);
    startOnboardingMutation.mutate();
  };

  const handleManage = () => {
    getDashboardLinkMutation.mutate();
  };

  // Don't show the card if Stripe Connect is not enabled
  if (!isLoading && status && !status.enabled) {
    return null;
  }

  if (isLoading) {
    return (
      <>
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {t("profile.stripeConnect.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("profile.stripeConnect.description")}
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  const accountStatus = status?.status || "NOT_CONNECTED";

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          {t("profile.stripeConnect.title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("profile.stripeConnect.description")}
        </p>
      </div>
      <Card>
        <CardContent className="space-y-4 pt-6">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {accountStatus === "NOT_CONNECTED" && (
            <>
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <Badge variant="secondary">
                {t("profile.stripeConnect.notConnected.status")}
              </Badge>
            </>
          )}
          {accountStatus === "INCOMPLETE" && (
            <>
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                {t("profile.stripeConnect.incomplete.status")}
              </Badge>
            </>
          )}
          {accountStatus === "ACTIVE" && (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <Badge variant="outline" className="border-green-500 text-green-700">
                {t("profile.stripeConnect.active.status")}
              </Badge>
            </>
          )}
        </div>

        {/* Description based on status */}
        {accountStatus === "NOT_CONNECTED" && (
          <Alert>
            <AlertDescription>
              {t("profile.stripeConnect.notConnected.description")}
            </AlertDescription>
          </Alert>
        )}

        {accountStatus === "INCOMPLETE" && (
          <Alert className="border-yellow-500/50 text-yellow-700 dark:text-yellow-500">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("profile.stripeConnect.incomplete.description")}
            </AlertDescription>
          </Alert>
        )}

        {accountStatus === "ACTIVE" && (
          <Alert className="border-green-500/50 text-green-700 dark:text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              {t("profile.stripeConnect.active.description")}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {accountStatus === "NOT_CONNECTED" && (
            <Button
              onClick={handleConnect}
              disabled={isConnecting || startOnboardingMutation.isPending}
              className="w-full"
            >
              {isConnecting || startOnboardingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t("profile.stripeConnect.notConnected.button")}
                </>
              )}
            </Button>
          )}

          {accountStatus === "INCOMPLETE" && (
            <Button
              onClick={handleConnect}
              disabled={isConnecting || startOnboardingMutation.isPending}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isConnecting || startOnboardingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {t("profile.stripeConnect.incomplete.button")}
                </>
              )}
            </Button>
          )}

          {accountStatus === "ACTIVE" && (
            <Button
              onClick={handleManage}
              disabled={getDashboardLinkMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {getDashboardLinkMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("profile.stripeConnect.active.button")}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Debug info (only in development) */}
        {process.env.NODE_ENV === "development" && status?.stripeAccountId && (
          <div className="text-xs text-muted-foreground pt-4 border-t">
            <div>Account ID: {status.stripeAccountId}</div>
            <div>Charges: {status.chargesEnabled ? "✓" : "✗"}</div>
            <div>Payouts: {status.payoutsEnabled ? "✓" : "✗"}</div>
            {status.currentlyDue.length > 0 && (
              <div>Requirements: {status.currentlyDue.join(", ")}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}
