import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { AppointmentCard } from "@/components/appointment-card";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Appointment, UserProfile } from "@shared/schema";

type AppointmentWithPatient = Appointment & {
  patient?: UserProfile;
  patientName?: string;
};

export default function PsychologistAppointments() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("upcoming");

  const { data: appointments, isLoading } = useQuery<AppointmentWithPatient[]>({
    queryKey: ["/api/appointments"],
  });

  // Yaklaşan: reserved, payment_pending, payment_review, confirmed, ready
  const upcomingAppointments = appointments?.filter(a =>
    ["reserved", "payment_pending", "payment_review", "confirmed", "ready"].includes(a.status)
  ) || [];

  // Geçmiş: completed, cancelled, expired, refunded, no_show, in_session
  const pastAppointments = appointments?.filter(a =>
    ["completed", "cancelled", "expired", "refunded", "no_show", "in_session"].includes(a.status)
  ) || [];

  const handleVideoCall = (appointmentId: string) => {
    window.location.href = `/dashboard/video-call/${appointmentId}`;
  };

  const handleCancel = (appointmentId: string) => {
    console.log("Cancel appointment:", appointmentId);
  };

  const handleMessage = async (patientId: string) => {
    try {
      const response = await fetch("/api/conversations/find-or-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ psychologistId: patientId }),
      });

      if (response.ok) {
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
    <DashboardLayout role="psychologist">
      <div className="space-y-6 w-full">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-2">{t("appointments.title")}</h1>
          <p className="text-muted-foreground">
            {t("appointments.description")}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 sm:w-auto sm:inline-flex">
            <TabsTrigger value="upcoming" className="gap-1.5 sm:gap-2 px-2 sm:px-4" data-testid="tab-upcoming">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm truncate">{t("appointments.tabs.upcoming")}</span>
              {upcomingAppointments.length > 0 && (
                <span className="ml-0.5 sm:ml-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs">
                  {upcomingAppointments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-1.5 sm:gap-2 px-2 sm:px-4" data-testid="tab-past">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm truncate">{t("appointments.tabs.past")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-card-border">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2 min-w-0">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                        <Skeleton className="h-6 w-20 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : upcomingAppointments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment as any}
                    userRole="psychologist"
                    onCancel={() => handleCancel(appointment.id)}
                    onMessage={() => handleMessage(appointment.patientId)}
                    onVideoCall={() => handleVideoCall(appointment.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-card-border">
                <CardContent className="p-8 sm:p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t("appointments.empty.upcomingTitle")}</h3>
                  <p className="text-muted-foreground">
                    {t("appointments.empty.upcomingDescription")}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-card-border">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2 min-w-0">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                        <Skeleton className="h-6 w-20 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pastAppointments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment as any}
                    userRole="psychologist"
                    onMessage={() => handleMessage(appointment.patientId)}
                    onVideoCall={() => handleVideoCall(appointment.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-card-border">
                <CardContent className="p-8 sm:p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t("appointments.empty.pastTitle")}</h3>
                  <p className="text-muted-foreground">
                    {t("appointments.empty.pastDescription")}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
