import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { AppointmentCard } from "@/components/appointment-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, CheckCircle2, X } from "lucide-react";
import { Link } from "wouter";
import type { Appointment, PsychologistProfile } from "@shared/schema";

type AppointmentWithPsychologist = Appointment & { psychologist: PsychologistProfile };

export default function PatientAppointments() {
  const [activeTab, setActiveTab] = useState("upcoming");

  const { data: appointments, isLoading } = useQuery<AppointmentWithPsychologist[]>({
    queryKey: ["/api/appointments", activeTab],
  });

  const upcomingAppointments = appointments?.filter(a => 
    ["reserved", "payment_pending", "confirmed", "ready"].includes(a.status)
  ) || [];

  const pastAppointments = appointments?.filter(a => 
    ["completed", "cancelled", "expired", "refunded", "no_show", "in_session"].includes(a.status)
  ) || [];

  const handleJoin = (appointmentId: string) => {
    window.location.href = `/dashboard/session/${appointmentId}`;
  };

  const handleCancel = (appointmentId: string) => {
    console.log("Cancel appointment:", appointmentId);
  };

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-2">Randevularım</h1>
          <p className="text-muted-foreground">
            Tüm randevularınızı buradan yönetin
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="upcoming" className="gap-2" data-testid="tab-upcoming">
              <Clock className="w-4 h-4" />
              Yaklaşan
              {upcomingAppointments.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
                  {upcomingAppointments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2" data-testid="tab-past">
              <CheckCircle2 className="w-4 h-4" />
              Geçmiş
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
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
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    userRole="patient"
                    onJoin={() => handleJoin(appointment.id)}
                    onCancel={() => handleCancel(appointment.id)}
                    onMessage={() => window.location.href = "/dashboard/messages"}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-card-border">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-2">Yaklaşan randevunuz yok</h3>
                  <p className="text-muted-foreground mb-6">
                    Bir psikolog bularak yeni randevu alabilirsiniz
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/psychologists">Psikolog Bul</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
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
              <div className="space-y-4">
                {pastAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    userRole="patient"
                    onMessage={() => window.location.href = "/dashboard/messages"}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-card-border">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-2">Geçmiş randevunuz yok</h3>
                  <p className="text-muted-foreground">
                    Tamamlanan seanslarınız burada görünecek
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
