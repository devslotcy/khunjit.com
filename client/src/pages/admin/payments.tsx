import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Receipt, Filter, Download, TrendingUp, Wallet, RefreshCcw, AlertCircle } from "lucide-react";

interface PaymentItem {
  id: string;
  appointmentId: string;
  psychologistName: string;
  patientId: string;
  sessionDate: string;
  sessionStatus: string;
  grossAmount: string;
  vatAmount: string;
  platformFee: string;
  providerPayout: string;
  status: string;
  paidAt: string;
  currency: string;
  refunds: {
    id: string;
    status: string;
    amount: string;
    type: string;
  }[];
}

interface AdminPaymentsResponse {
  payments: PaymentItem[];
  summary: {
    totalPayments: number;
    totalGross: string;
    totalVat: string;
    totalPlatformFee: string;
    totalProviderPayout: string;
    completedCount: number;
    refundedCount: number;
    currency: string;
  };
}

export default function AdminPayments() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const queryParams = new URLSearchParams();
  if (statusFilter) queryParams.set("status", statusFilter);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);

  const { data, isLoading, refetch } = useQuery<AdminPaymentsResponse>({
    queryKey: ["/api/admin/payments", statusFilter, startDate, endDate],
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      completed: { variant: "default", label: "Tamamlandı" },
      pending: { variant: "secondary", label: "Bekliyor" },
      failed: { variant: "destructive", label: "Başarısız" },
      refunded: { variant: "outline", label: "İade Edildi" },
      refund_pending: { variant: "secondary", label: "İade Bekliyor" },
    };
    return statusMap[status] || { variant: "outline", label: status };
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold">Ödeme Raporu</h1>
            <p className="text-muted-foreground">Tüm platform ödemelerini görüntüleyin ve filtreleyin</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtreler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="refunded">İade Edildi</SelectItem>
                  <SelectItem value="failed">Başarısız</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[180px]"
                data-testid="input-start-date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[180px]"
                data-testid="input-end-date"
              />

              <Button variant="outline" onClick={() => refetch()} data-testid="button-apply-filter">
                Uygula
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setStatusFilter("");
                  setStartDate("");
                  setEndDate("");
                }}
                data-testid="button-clear-filter"
              >
                Temizle
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Toplam İşlem</p>
                      <p className="text-xl font-bold">{data?.summary.totalPayments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Toplam Brüt</p>
                      <p className="text-xl font-bold">{data?.summary.totalGross} {data?.summary.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-chart-1/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-chart-1" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Platform Komisyonu</p>
                      <p className="text-xl font-bold">{data?.summary.totalPlatformFee} {data?.summary.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                      <RefreshCcw className="w-5 h-5 text-chart-4" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">İade Sayısı</p>
                      <p className="text-xl font-bold">{data?.summary.refundedCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>İşlem Detayları</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.payments.length === 0 ? (
                  <div className="py-8 text-center">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">Seçilen kriterlere uygun işlem bulunamadı</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Tarih</th>
                          <th className="text-left py-3 px-2">Psikolog</th>
                          <th className="text-right py-3 px-2">Brüt</th>
                          <th className="text-right py-3 px-2">KDV</th>
                          <th className="text-right py-3 px-2">Komisyon</th>
                          <th className="text-right py-3 px-2">Psikolog Payı</th>
                          <th className="text-center py-3 px-2">Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data?.payments.map((payment) => {
                          const statusInfo = getStatusBadge(payment.status);
                          return (
                            <tr key={payment.id} className="border-b" data-testid={`row-payment-${payment.id}`}>
                              <td className="py-3 px-2">
                                {payment.sessionDate && format(new Date(payment.sessionDate), "d MMM yyyy", { locale: tr })}
                              </td>
                              <td className="py-3 px-2">{payment.psychologistName}</td>
                              <td className="py-3 px-2 text-right font-medium">{Number(payment.grossAmount).toFixed(2)}</td>
                              <td className="py-3 px-2 text-right">{Number(payment.vatAmount).toFixed(2)}</td>
                              <td className="py-3 px-2 text-right">{Number(payment.platformFee).toFixed(2)}</td>
                              <td className="py-3 px-2 text-right">{Number(payment.providerPayout).toFixed(2)}</td>
                              <td className="py-3 px-2 text-center">
                                <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                                {payment.refunds.length > 0 && (
                                  <Badge variant="outline" className="ml-1 text-xs">İade</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground">
              <p>Özet: {data?.summary.completedCount} tamamlanan, {data?.summary.refundedCount} iade edilen işlem</p>
              <p>Toplam KDV: {data?.summary.totalVat} {data?.summary.currency} | Psikolog Ödemeleri: {data?.summary.totalProviderPayout} {data?.summary.currency}</p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
