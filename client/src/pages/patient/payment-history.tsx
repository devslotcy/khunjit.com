import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Receipt, RefreshCcw, AlertCircle, CheckCircle2, Clock } from "lucide-react";

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
  paidAt: string | null;
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
  appointmentStatus?: string;
  bankTransferStatus?: string;
  reservedUntil?: string;
}

export default function PatientPaymentHistory() {
  const { t } = useTranslation();
  const { data: payments, isLoading, error } = useQuery<PaymentHistoryItem[]>({
    queryKey: ["/api/payments/patient/history"],
  });

  console.log("💳 Payment History - isLoading:", isLoading);
  console.log("💳 Payment History - data:", payments);
  console.log("💳 Payment History - error:", error);

  const getStatusBadge = (status: string, refund: PaymentHistoryItem["refund"], appointmentStatus?: string) => {
    if (refund) {
      const refundStatusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon?: any }> = {
        pending: { variant: "secondary", label: t('paymentHistory.statuses.refund_pending'), icon: AlertCircle },
        approved: { variant: "default", label: t('paymentHistory.statuses.refund_approved'), icon: CheckCircle2 },
        processed: { variant: "default", label: t('paymentHistory.statuses.refund_processed'), icon: CheckCircle2 },
        rejected: { variant: "destructive", label: t('paymentHistory.statuses.refund_rejected'), icon: AlertCircle },
      };
      return refundStatusMap[refund.status] || { variant: "outline", label: refund.status };
    }

    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon?: any }> = {
      reserved: { variant: "outline", label: t('paymentHistory.statuses.reserved'), icon: AlertCircle },
      payment_pending: { variant: "secondary", label: t('paymentHistory.statuses.payment_pending'), icon: AlertCircle },
      payment_review: { variant: "secondary", label: t('paymentHistory.statuses.payment_review'), icon: AlertCircle },
      completed: { variant: "default", label: t('paymentHistory.statuses.completed'), icon: CheckCircle2 },
      pending: { variant: "secondary", label: t('paymentHistory.statuses.pending'), icon: AlertCircle },
      failed: { variant: "destructive", label: t('paymentHistory.statuses.failed'), icon: AlertCircle },
      refunded: { variant: "outline", label: t('paymentHistory.statuses.refunded'), icon: RefreshCcw },
    };

    // For appointment-based statuses
    if (appointmentStatus && ["reserved", "payment_pending", "payment_review"].includes(appointmentStatus)) {
      return statusMap[appointmentStatus] || { variant: "outline", label: status };
    }

    return statusMap[status] || { variant: "outline", label: status };
  };

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold">{t('paymentHistory.title')}</h1>
          <p className="text-muted-foreground">{t('paymentHistory.subtitle')}</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : payments?.length === 0 ? (
              <div className="py-12 text-center">
                <Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{t('paymentHistory.empty')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('paymentHistory.table.psychologist')}</TableHead>
                    <TableHead>{t('paymentHistory.table.appointmentDate')}</TableHead>
                    <TableHead>{t('paymentHistory.table.amount')}</TableHead>
                    <TableHead>{t('paymentHistory.table.vat')}</TableHead>
                    <TableHead>{t('paymentHistory.table.total')}</TableHead>
                    <TableHead>{t('paymentHistory.table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.map((payment) => {
                    const statusInfo = getStatusBadge(payment.status, payment.refund, payment.appointmentStatus);
                    const isReserved = payment.appointmentStatus === "reserved";
                    const isPaymentPending = ["payment_pending", "payment_review"].includes(payment.appointmentStatus || "");

                    return (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.psychologistName}</p>
                            {isReserved && payment.reservedUntil && (
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <p className="text-xs text-amber-600">
                                  {t('paymentHistory.reservedUntil', { time: format(new Date(payment.reservedUntil), "HH:mm", { locale: enUS }) })}
                                </p>
                              </div>
                            )}
                            {isPaymentPending && (
                              <div className="flex items-center gap-1 mt-1">
                                <AlertCircle className="w-3 h-3 text-blue-600" />
                                <p className="text-xs text-blue-600">
                                  {payment.appointmentStatus === "payment_review"
                                    ? t('paymentHistory.paymentReview')
                                    : t('paymentHistory.paymentPending')}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.sessionDate && (
                            <div>
                              <p>{format(new Date(payment.sessionDate), "d MMMM yyyy", { locale: enUS })}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(payment.sessionDate), "HH:mm", { locale: enUS })}
                              </p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <p>{Number(payment.netOfVat).toFixed(2)} {payment.currency}</p>
                          <p className="text-xs text-muted-foreground">{t('paymentHistory.table.netAmount')}</p>
                        </TableCell>
                        <TableCell>
                          <p>{Number(payment.vatAmount).toFixed(2)} {payment.currency}</p>
                          <p className="text-xs text-muted-foreground">%{payment.vatRate}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">{Number(payment.grossAmount).toFixed(2)} {payment.currency}</p>
                          <p className="text-xs text-muted-foreground">{t('paymentHistory.table.totalAmount')}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {statusInfo.icon && <statusInfo.icon className="w-4 h-4" />}
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </div>
                          {payment.paidAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(payment.paidAt), "d MMM HH:mm", { locale: enUS })}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
