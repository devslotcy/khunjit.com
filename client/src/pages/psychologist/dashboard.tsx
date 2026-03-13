import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppointmentCard } from "@/components/appointment-card";
import { useTranslation } from "react-i18next";
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Clock,
  ArrowRight,
  Video,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import type { Appointment } from "@shared/schema";

export default function PsychologistDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);

  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Randevu iptal edilemedi");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("appointments.cancelSuccess.title"),
        description: t("appointments.cancelSuccess.description"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/psychologist/stats"] });
      setCancelDialogOpen(false);
      setAppointmentToCancel(null);
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCancelClick = (appointmentId: string) => {
    setAppointmentToCancel(appointmentId);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (appointmentToCancel) {
      cancelMutation.mutate(appointmentToCancel);
    }
  };

  const { data: stats } = useQuery<{
    todaySessions: number;
    weeklyEarnings: number;
    weeklyEarningsGross?: number;
    weeklyEarningsNet?: number;
    totalPlatformFee?: number;
    totalWithholdingTax?: number;
    currency?: string;
    totalPatients: number;
    pendingAppointments: number;
  }>({
    queryKey: ["/api/psychologist/stats"],
  });

  const { data: upcomingAppointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/upcoming"],
  });

  const { data: profile } = useQuery<{ verified: boolean; verificationStatus: string; status: string }>({
    queryKey: ["/api/psychologist/profile"],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  return (
    <DashboardLayout role="psychologist">
      <div className="space-y-8">
        {profile && (!profile.verified || profile.verificationStatus !== "approved" || profile.status !== "active") && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-1">
                    {t("dashboard.psychologist.pendingApproval.title")}
                  </h3>
                  <p className="text-sm text-amber-700">
                    {t("dashboard.psychologist.pendingApproval.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-2">
              {t("dashboard.psychologist.welcome", { firstName: user?.firstName || "Psikolog" })}
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(), "d MMMM yyyy, EEEE", { locale: enUS })}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-card-border hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("dashboard.psychologist.stats.todaySessions")}</p>
                  <p className="text-3xl font-bold">{stats?.todaySessions || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Video className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">{t("dashboard.psychologist.stats.weeklyEarnings")}</p>
                  <p className="text-3xl font-bold">{formatCurrency(stats?.weeklyEarnings || 0)}</p>
                  {stats?.totalWithholdingTax && stats.totalWithholdingTax > 0 && (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        Brüt: {formatCurrency(stats.weeklyEarningsGross || 0)}
                      </p>
                      <p className="text-xs text-amber-600">
                        Vergi: -{formatCurrency(stats.totalWithholdingTax)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("dashboard.psychologist.stats.totalClients")}</p>
                  <p className="text-3xl font-bold">{stats?.totalPatients || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("dashboard.psychologist.stats.pendingAppointments")}</p>
                  <p className="text-3xl font-bold">{stats?.pendingAppointments || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-chart-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold">{t("dashboard.psychologist.upcomingSessions.title")}</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/appointments">
                  {t("dashboard.psychologist.upcomingSessions.viewAll")}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="border-card-border">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingAppointments.slice(0, 6).map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    userRole="psychologist"
                    onCancel={() => handleCancelClick(appointment.id)}
                    onVideoCall={() => window.location.href = `/dashboard/video-call/${appointment.id}`}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-card-border">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">{t("dashboard.psychologist.upcomingSessions.emptyTitle")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.psychologist.upcomingSessions.emptyDescription")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-xl font-semibold">{t("dashboard.psychologist.quickActions.title")}</h2>
            
            <Card className="border-card-border hover-elevate">
              <CardContent className="p-4">
                <Link href="/dashboard/availability" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{t("dashboard.psychologist.quickActions.availability.title")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("dashboard.psychologist.quickActions.availability.description")}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-4">
                <Link href="/dashboard/earnings" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-chart-2" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{t("dashboard.psychologist.quickActions.earnings.title")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("dashboard.psychologist.quickActions.earnings.description")}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-4">
                <Link href="/dashboard/profile" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-chart-3" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{t("dashboard.psychologist.quickActions.profile.title")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("dashboard.psychologist.quickActions.profile.description")}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancel Appointment Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              {t("appointments.cancelDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("appointments.cancelDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelMutation.isPending}
            >
              {t("appointments.cancelDialog.cancelButton")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? t("appointments.cancelDialog.confirmButtonLoading") : t("appointments.cancelDialog.confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
