import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Receipt, RefreshCcw, AlertCircle, CheckCircle2 } from "lucide-react";

interface PaymentHistoryItem {
  id: string;
  appointmentId: string;
  psychologistName: string;
  sessionDate: string;
  grossAmount: string;
  vatRate: string;
  vatAmount: string;
  netOfVat: string;
  platformFee: string;
  platformFeeRate: string;
  status: string;
  paidAt: string;
  refund: {
    id: string;
    status: string;
    amount: string;
    percentage: string;
    type: string;
    reason: string;
    processedAt: string;
  } | null;
  currency: string;
}

export default function PatientPaymentHistory() {
  const { data: payments, isLoading } = useQuery<PaymentHistoryItem[]>({
    queryKey: ["/api/payments/patient/history"],
  });

  const getStatusBadge = (status: string, refund: PaymentHistoryItem["refund"]) => {
    if (refund) {
      const refundStatusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
        pending: { variant: "secondary", label: "İade Bekliyor" },
        approved: { variant: "default", label: "İade Onaylandı" },
        processed: { variant: "default", label: "İade Edildi" },
        rejected: { variant: "destructive", label: "İade Reddedildi" },
      };
      return refundStatusMap[refund.status] || { variant: "outline", label: refund.status };
    }
    
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      completed: { variant: "default", label: "Tamamlandı" },
      pending: { variant: "secondary", label: "Bekliyor" },
      failed: { variant: "destructive", label: "Başarısız" },
      refunded: { variant: "outline", label: "İade Edildi" },
    };
    return statusMap[status] || { variant: "outline", label: status };
  };

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold">Ödeme Geçmişi</h1>
          <p className="text-muted-foreground">Tüm ödeme işlemlerinizi görüntüleyin</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : payments?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Henüz ödeme geçmişiniz bulunmuyor</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {payments?.map((payment) => {
              const statusInfo = getStatusBadge(payment.status, payment.refund);
              
              return (
                <Card key={payment.id} data-testid={`card-payment-${payment.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{payment.psychologistName}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {payment.sessionDate && format(new Date(payment.sessionDate), "d MMMM yyyy, HH:mm", { locale: tr })}
                        </p>
                      </div>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Brüt Tutar</p>
                        <p className="font-semibold">{Number(payment.grossAmount).toFixed(2)} {payment.currency}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">KDV (%{payment.vatRate})</p>
                        <p className="font-semibold">{Number(payment.vatAmount).toFixed(2)} {payment.currency}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Platform Komisyonu (%{payment.platformFeeRate})</p>
                        <p className="font-semibold">{Number(payment.platformFee).toFixed(2)} {payment.currency}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">KDV Hariç</p>
                        <p className="font-semibold">{Number(payment.netOfVat).toFixed(2)} {payment.currency}</p>
                      </div>
                    </div>

                    {payment.refund && (
                      <div className="mt-4 p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-2">
                          <RefreshCcw className="w-4 h-4" />
                          <span className="font-medium">İade Bilgileri</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">İade Tutarı: </span>
                            <span className="font-medium">{Number(payment.refund.amount).toFixed(2)} {payment.currency}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Oran: </span>
                            <span className="font-medium">%{payment.refund.percentage}</span>
                          </div>
                          {payment.refund.reason && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Sebep: </span>
                              <span>{payment.refund.reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {payment.paidAt && (
                      <p className="mt-4 text-xs text-muted-foreground">
                        Ödeme tarihi: {format(new Date(payment.paidAt), "d MMMM yyyy, HH:mm", { locale: tr })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
