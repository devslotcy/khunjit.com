import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Wallet, TrendingUp, Clock, Receipt } from "lucide-react";

interface PaymentItem {
  id: string;
  appointmentId: string;
  sessionDate: string;
  sessionStatus: string;
  grossAmount: string;
  vatAmount: string;
  platformFee: string;
  platformFeeRate: string;
  providerPayout: string;
  status: string;
  paidAt: string;
  refund: {
    id: string;
    status: string;
    amount: string;
    percentage: string;
  } | null;
  currency: string;
}

interface PaymentHistoryResponse {
  payments: PaymentItem[];
  summary: {
    totalEarnings: string;
    pendingPayouts: string;
    completedPayouts: string;
    totalSessions: number;
    currency: string;
  };
}

export default function PsychologistPaymentHistory() {
  const { data, isLoading } = useQuery<PaymentHistoryResponse>({
    queryKey: ["/api/payments/psychologist/history"],
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      completed: { variant: "default", label: "Tamamlandı" },
      pending: { variant: "secondary", label: "Bekliyor" },
      failed: { variant: "destructive", label: "Başarısız" },
      refunded: { variant: "outline", label: "İade Edildi" },
    };
    return statusMap[status] || { variant: "outline", label: status };
  };

  return (
    <DashboardLayout role="psychologist">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold">Kazanç Geçmişi</h1>
          <p className="text-muted-foreground">Seans bazlı kazançlarınızı ve ödemelerinizi görüntüleyin</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Toplam Kazanç</p>
                      <p className="text-xl font-bold">{data?.summary.totalEarnings} {data?.summary.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tamamlanan Ödemeler</p>
                      <p className="text-xl font-bold">{data?.summary.completedPayouts} {data?.summary.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-chart-4" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bekleyen Ödemeler</p>
                      <p className="text-xl font-bold">{data?.summary.pendingPayouts} {data?.summary.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-chart-1/10 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-chart-1" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Toplam Seans</p>
                      <p className="text-xl font-bold">{data?.summary.totalSessions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {data?.payments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Henüz kazanç geçmişiniz bulunmuyor</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <h2 className="font-semibold text-lg">Seans Detayları</h2>
                {data?.payments.map((payment) => {
                  const statusInfo = getStatusBadge(payment.status);
                  
                  return (
                    <Card key={payment.id} data-testid={`card-earning-${payment.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <p className="font-medium">
                              {payment.sessionDate && format(new Date(payment.sessionDate), "d MMMM yyyy, HH:mm", { locale: tr })}
                            </p>
                            <p className="text-sm text-muted-foreground capitalize">{payment.sessionStatus}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            {payment.refund && (
                              <Badge variant="outline" className="ml-2">İade: %{payment.refund.percentage}</Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Brüt</p>
                            <p className="font-medium">{Number(payment.grossAmount).toFixed(2)} {payment.currency}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">KDV</p>
                            <p className="font-medium">{Number(payment.vatAmount).toFixed(2)} {payment.currency}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Komisyon (%{payment.platformFeeRate})</p>
                            <p className="font-medium">{Number(payment.platformFee).toFixed(2)} {payment.currency}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Net Kazanç</p>
                            <p className="font-semibold text-chart-2">{Number(payment.providerPayout).toFixed(2)} {payment.currency}</p>
                          </div>
                          {payment.paidAt && (
                            <div>
                              <p className="text-muted-foreground">Ödeme Tarihi</p>
                              <p className="font-medium">{format(new Date(payment.paidAt), "d MMM yyyy", { locale: tr })}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
