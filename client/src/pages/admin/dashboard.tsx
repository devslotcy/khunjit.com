import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Calendar,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Video,
  Wallet,
  Receipt,
  CreditCard,
  PiggyBank,
  Building2
} from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalUsers: number;
    totalPsychologists: number;
    pendingVerifications: number;
    todaySessions: number;
    monthlyRevenue: number;
    reportedMessages: number;
    financials?: {
      totalGross: number;
      totalVat: number;
      totalPlatformFee: number;
      totalProviderPayout: number;
      refundedAmount: number;
    };
  }>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<{
    type: string;
    message: string;
    time: string;
  }[]>({
    queryKey: ["/api/admin/activity"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-2">Yönetici Paneli</h1>
          <p className="text-muted-foreground">
            Platform genel bakış - {format(new Date(), "d MMMM yyyy", { locale: enUS })}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-card-border hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Toplam Kullanıcı</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Bugünkü Seanslar</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold">{stats?.todaySessions || 0}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <Video className="w-6 h-6 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Aylık Gelir</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-3xl font-bold">{formatCurrency(stats?.monthlyRevenue || 0)}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Doğrulama Bekleyen</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold">{stats?.pendingVerifications || 0}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {(stats?.pendingVerifications || 0) > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <span className="font-medium">
                    {stats?.pendingVerifications} psikolog doğrulama bekliyor
                  </span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/verify">İncele</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary" />
              Finansal Özet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Toplam Gelir</span>
                </div>
                {statsLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p className="text-xl font-bold text-green-700">{formatCurrency(stats?.financials?.totalGross || 0)}</p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-muted-foreground">Platform Payı (%30)</span>
                </div>
                {statsLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p className="text-xl font-bold text-purple-700">{formatCurrency(stats?.financials?.totalPlatformFee || 0)}</p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-muted-foreground">Psikolog Payı (%70)</span>
                </div>
                {statsLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p className="text-xl font-bold text-orange-700">{formatCurrency(stats?.financials?.totalProviderPayout || 0)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-serif text-xl font-semibold">Son Aktiviteler</h2>

            <Card className="border-card-border h-[456px] flex flex-col">
              <CardContent className="p-0 flex-1 overflow-y-auto">
                {activityLoading ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="w-2 h-2 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    ))}
                  </div>
                ) : recentActivity && recentActivity.length > 0 ? (
                  <div className="divide-y divide-border">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="p-4 flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'success' ? 'bg-chart-2' :
                          activity.type === 'warning' ? 'bg-amber-500' :
                          activity.type === 'error' ? 'bg-destructive' :
                          'bg-primary'
                        }`} />
                        <span className="flex-1 text-sm">{activity.message}</span>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    Henüz aktivite yok
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-xl font-semibold">Hızlı İşlemler</h2>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-4">
                <Link href="/admin/verify" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Psikolog Doğrulama</p>
                    <p className="text-sm text-muted-foreground">
                      Bekleyen başvuruları incele
                    </p>
                  </div>
                  {(stats?.pendingVerifications || 0) > 0 && (
                    <Badge variant="destructive">{stats?.pendingVerifications}</Badge>
                  )}
                </Link>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-4">
                <Link href="/admin/users" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-chart-2" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Kullanıcı Yönetimi</p>
                    <p className="text-sm text-muted-foreground">
                      Tüm kullanıcıları yönet
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-4">
                <Link href="/admin/appointments" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-chart-3" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Randevular</p>
                    <p className="text-sm text-muted-foreground">
                      Tüm randevuları görüntüle
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-4">
                <Link href="/admin/payments" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-chart-1/10 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-chart-1" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Ödemeler</p>
                    <p className="text-sm text-muted-foreground">
                      Ödeme raporlarını incele
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardContent className="p-4">
                <Link href="/admin/bank-transfers" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-chart-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Havale Ödemeleri</p>
                    <p className="text-sm text-muted-foreground">
                      Havale onaylarını yönet
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
