import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentCard } from "@/components/appointment-card";
import { 
  Calendar, 
  MessageCircle, 
  Search, 
  ArrowRight,
  Clock,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Appointment, PsychologistProfile } from "@shared/schema";

export default function PatientDashboard() {
  const { user } = useAuth();

  const { data: upcomingAppointments, isLoading: appointmentsLoading } = useQuery<
    (Appointment & { psychologist: PsychologistProfile })[]
  >({
    queryKey: ["/api/appointments", "upcoming"],
  });

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
            Hoş geldiniz, {user?.firstName || "Kullanıcı"}
          </h1>
          <p className="text-muted-foreground">
            Mental sağlığınız için yanınızdayız
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-card-border hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Yaklaşan Seanslar</p>
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
                  <p className="text-sm text-muted-foreground mb-1">Toplam Seans</p>
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
                  <p className="text-sm text-muted-foreground mb-1">Okunmamış Mesaj</p>
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
              <h2 className="font-serif text-xl font-semibold">Yaklaşan Randevular</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/appointments">
                  Tümünü Gör
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>

            {appointmentsLoading ? (
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
              <div className="space-y-4">
                {upcomingAppointments.slice(0, 3).map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    userRole="patient"
                    onJoin={() => window.location.href = `/dashboard/session/${appointment.id}`}
                    onMessage={() => window.location.href = `/dashboard/messages`}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-card-border">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">Henüz randevunuz yok</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Bir psikolog bularak ilk randevunuzu alın
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/psychologists">
                      <Search className="w-4 h-4 mr-2" />
                      Psikolog Bul
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-xl font-semibold">Hızlı İşlemler</h2>
            
            <Card className="border-card-border hover-elevate">
              <CardContent className="p-4">
                <Link href="/dashboard/psychologists" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Search className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Psikolog Bul</p>
                    <p className="text-sm text-muted-foreground">
                      Size uygun uzmanı keşfedin
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
                    <p className="font-medium">Mesajlar</p>
                    <p className="text-sm text-muted-foreground">
                      Psikologunuzla iletişime geçin
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
                    <p className="font-medium">Randevularım</p>
                    <p className="text-sm text-muted-foreground">
                      Tüm randevularınızı görüntüleyin
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
