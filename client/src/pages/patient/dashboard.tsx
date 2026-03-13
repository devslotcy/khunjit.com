import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppointmentCard } from "@/components/appointment-card";
import {
  Calendar,
  MessageCircle,
  Search,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { Appointment, PsychologistProfile } from "@shared/schema";

export default function PatientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
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
        title: t('appointments.cancelSuccess.title'),
        description: t('appointments.cancelSuccess.description'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patient/stats"] });
      setCancelDialogOpen(false);
      setAppointmentToCancel(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
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

  const { data: allAppointments, isLoading: appointmentsLoading } = useQuery<
    (Appointment & { psychologist: PsychologistProfile })[]
  >({
    queryKey: ["/api/appointments"],
  });

  // Filter upcoming appointments on client side
  const upcomingAppointments = allAppointments?.filter(apt =>
    ["reserved", "payment_pending", "payment_review", "confirmed", "ready"].includes(apt.status)
  );

  // Auto-sync payment_pending appointments to check if Stripe payment succeeded
  const hasSynced = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!upcomingAppointments) return;

    const pendingAppointments = upcomingAppointments.filter(
      apt => apt.status === "payment_pending" && !hasSynced.current.has(apt.id)
    );

    if (pendingAppointments.length === 0) return;

    // Sync each pending appointment
    const syncPayments = async () => {
      let anyUpdated = false;

      for (const apt of pendingAppointments) {
        hasSynced.current.add(apt.id);

        try {
          const response = await fetch("/api/payments/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ appointmentId: apt.id }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.status === "confirmed") {
              console.log(`[Dashboard] Synced appointment ${apt.id} -> confirmed`);
              anyUpdated = true;
            }
          }
        } catch (err) {
          console.warn(`[Dashboard] Sync failed for ${apt.id}:`, err);
        }
      }

      // Refresh appointments if any were updated
      if (anyUpdated) {
        queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/patient/stats"] });
      }
    };

    syncPayments();
  }, [upcomingAppointments, queryClient]);

  const { data: stats } = useQuery<{
    totalSessions: number;
    upcomingCount: number;
    unreadMessages: number;
  }>({
    queryKey: ["/api/patient/stats"],
  });

  return (
    <DashboardLayout role="patient">
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-2">
            {t('dashboard.patient.welcome', { firstName: user?.firstName || 'Kullanıcı' })}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.patient.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-card-border hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('dashboard.patient.stats.upcomingSessions')}</p>
                  <p className="text-3xl font-bold">{stats?.upcomingCount || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('dashboard.patient.stats.totalSessions')}</p>
                  <p className="text-3xl font-bold">{stats?.totalSessions || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('dashboard.patient.stats.unreadMessages')}</p>
                  <p className="text-3xl font-bold">{stats?.unreadMessages || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold">{t('dashboard.patient.upcomingAppointments.title')}</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/appointments">
                  {t('dashboard.patient.upcomingAppointments.viewAll')}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>

            {appointmentsLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
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
              <div className="grid md:grid-cols-2 gap-4">
                {upcomingAppointments.slice(0, 4).map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    userRole="patient"
                    onJoin={() => window.location.href = `/dashboard/session/${appointment.id}`}
                    onMessage={() => window.location.href = `/dashboard/messages`}
                    onCancel={() => handleCancelClick(appointment.id)}
                    onVideoCall={() => window.location.href = `/dashboard/video-call/${appointment.id}`}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-card-border">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">{t('dashboard.patient.upcomingAppointments.emptyTitle')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('dashboard.patient.upcomingAppointments.emptyDescription')}
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/psychologists">
                      <Search className="w-4 h-4 mr-2" />
                      {t('dashboard.patient.quickActions.findPsychologist.title')}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-xl font-semibold">{t('dashboard.patient.quickActions.title')}</h2>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-4">
                <Link href="/dashboard/psychologists" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Search className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{t('dashboard.patient.quickActions.findPsychologist.title')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.patient.quickActions.findPsychologist.description')}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-4">
                <Link href="/dashboard/messages" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-chart-2" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{t('dashboard.patient.quickActions.messages.title')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.patient.quickActions.messages.description')}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-4">
                <Link href="/dashboard/appointments" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-chart-3" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{t('dashboard.patient.quickActions.appointments.title')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.patient.quickActions.appointments.description')}
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
              {t('appointments.cancelDialog.title')}
            </DialogTitle>
            <DialogDescription>
              {t('appointments.cancelDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelMutation.isPending}
            >
              {t('appointments.cancelDialog.cancelButton')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? t('appointments.cancelDialog.confirmButtonLoading') : t('appointments.cancelDialog.confirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}