import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { AppointmentCard } from "@/components/appointment-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, CheckCircle2, X, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, PsychologistProfile } from "@shared/schema";

type AppointmentWithPsychologist = Appointment & { psychologist: PsychologistProfile };

export default function PatientAppointments() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery<AppointmentWithPsychologist[]>({
    queryKey: ["/api/appointments"],
  });

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
        throw new Error(error.message || t('common.error'));
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

  const upcomingAppointments = appointments?.filter(a =>
    ["reserved", "payment_pending", "payment_review", "confirmed", "ready"].includes(a.status)
  ) || [];

  const pastAppointments = appointments?.filter(a => 
    ["completed", "cancelled", "expired", "refunded", "no_show", "in_session"].includes(a.status)
  ) || [];

  const handleVideoCall = (appointmentId: string) => {
    window.location.href = `/dashboard/video-call/${appointmentId}`;
  };

  const handleCancelClick = (appointmentId: string) => {
    setAppointmentToCancel(appointmentId);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (appointmentToCancel) {
      cancelMutation.mutate(appointmentToCancel);
    }
  };

  const handleMessage = async (psychologistId: string) => {
    try {
      const response = await fetch("/api/conversations/find-or-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ psychologistId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Store conversation ID in localStorage to auto-select it on messages page
        localStorage.setItem('selectedConversationId', data.conversationId);
        window.location.href = "/dashboard/messages";
      } else {
        console.error("Failed to create conversation");
        window.location.href = "/dashboard/messages";
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      window.location.href = "/dashboard/messages";
    }
  };

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-2">{t('appointments.title')}</h1>
          <p className="text-muted-foreground">
            {t('appointments.description')}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="upcoming" className="gap-2" data-testid="tab-upcoming">
              <Clock className="w-4 h-4" />
              {t('appointments.tabs.upcoming')}
              {upcomingAppointments.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
                  {upcomingAppointments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2" data-testid="tab-past">
              <CheckCircle2 className="w-4 h-4" />
              {t('appointments.tabs.past')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="border-card-border">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : upcomingAppointments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {upcomingAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    userRole="patient"
                    onCancel={() => handleCancelClick(appointment.id)}
                    onMessage={() => appointment.psychologist && handleMessage(appointment.psychologist.id)}
                    onVideoCall={() => handleVideoCall(appointment.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-card-border">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-2">{t('appointments.empty.upcomingTitle')}</h3>
                  <p className="text-muted-foreground mb-6">
                    {t('appointments.empty.upcomingDescription')}
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/psychologists">{t('dashboard.patient.quickActions.findPsychologist.title')}</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="border-card-border">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pastAppointments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pastAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    userRole="patient"
                    onMessage={() => appointment.psychologist && handleMessage(appointment.psychologist.id)}
                    onVideoCall={() => handleVideoCall(appointment.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-card-border">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-2">{t('appointments.empty.pastTitle')}</h3>
                  <p className="text-muted-foreground">
                    {t('appointments.empty.pastDescription')}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
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
