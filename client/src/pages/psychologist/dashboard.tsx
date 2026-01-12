import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AppointmentCard } from "@/components/appointment-card";
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
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Appointment } from "@shared/schema";

export default function PsychologistDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery<{
    todaySessions: number;
    weeklyEarnings: number;
    totalPatients: number;
    pendingAppointments: number;
  }>({
    queryKey: ["/api/psychologist/stats"],
  });

  const { data: upcomingAppointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", "upcoming"],
  });

  const { data: profile } = useQuery<{ verified: boolean }>({
    queryKey: ["/api/psychologist/profile"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount);
  };

  return (
    <DashboardLayout role="psychologist">
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-2">
              Hoş geldiniz, {user?.firstName || "Psikolog"}
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}
            </p>
          </div>
          
          {profile?.verified === false && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-600 font-medium">
                Profiliniz doğrulama bekliyor
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-card-border hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Bugünkü Seanslar</p>
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
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Haftalık Kazanç</p>
                  <p className="text-3xl font-bold">{formatCurrency(stats?.weeklyEarnings || 0)}</p>
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
                  <p className="text-sm text-muted-foreground mb-1">Toplam Hasta</p>
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
                  <p className="text-sm text-muted-foreground mb-1">Bekleyen Randevu</p>
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
              <h2 className="font-serif text-xl font-semibold">Yaklaşan Seanslar</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/appointments">
                  Tümünü Gör
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
              <div className="space-y-4">
                {upcomingAppointments.slice(0, 4).map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    userRole="psychologist"
                    onJoin={() => window.location.href = `/dashboard/session/${appointment.id}`}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-card-border">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">Yaklaşan seansınız yok</h3>
                  <p className="text-sm text-muted-foreground">
                    Müsaitlik ayarlarınızı güncelleyerek randevu alabilirsiniz
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-xl font-semibold">Hızlı İşlemler</h2>
            
            <Card className="border-card-border hover-elevate">
              <CardContent className="p-4">
                <Link href="/dashboard/availability" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Müsaitlik Ayarları</p>
                    <p className="text-sm text-muted-foreground">
                      Çalışma saatlerinizi düzenleyin
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
                    <p className="font-medium">Kazançlar</p>
                    <p className="text-sm text-muted-foreground">
                      Gelir raporlarınızı görüntüleyin
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
                    <p className="font-medium">Profil</p>
                    <p className="text-sm text-muted-foreground">
                      Profil bilgilerinizi güncelleyin
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
