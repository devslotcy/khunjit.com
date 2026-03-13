import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { format, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { Wallet, TrendingUp, Clock, Receipt, CheckCircle2, Calendar } from "lucide-react";

// Types for the new earnings endpoint
interface EarningItem {
  id: string;
  appointmentId: string;
  amount: string;
  amountGross: string;
  platformFee: string;
  withholdingTax: string;
  withholdingRate: string;
  currency: string;
  countryCode: string;
  status: string;
  sessionDate: string;
  patientName: string;
  createdAt: string;
  paidAt: string | null;
  stripeTransferId: string | null;
}

interface EarningsResponse {
  earnings: EarningItem[];
  summary: {
    totalEarnings: string;
    thisMonthEarnings: string;
    thisWeekEarnings: string;
    pendingPayout: string;
    paidOut: string;
    totalWithholdingTax: string;
    totalSessions: number;
    currency: string;
  };
}

// Types for the legacy payments endpoint (for backwards compatibility)
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
  const { t } = useTranslation();

  // Try new earnings endpoint first
  const { data: earningsData, isLoading: earningsLoading, error: earningsError } = useQuery<EarningsResponse>({
    queryKey: ["/api/psychologist/earnings"],
  });

  // Fallback to legacy payments endpoint
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<PaymentHistoryResponse>({
    queryKey: ["/api/payments/psychologist/history"],
    enabled: !!earningsError, // Only fetch if earnings endpoint fails
  });

  const isLoading = earningsLoading || (earningsError && paymentsLoading);

  // Use earnings data if available, otherwise fallback to payments
  const useEarnings = !earningsError && earningsData;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      earned: { variant: "default", label: t("earnings.earned") },
      pending_payout: { variant: "secondary", label: t("earnings.pendingPayout") },
      paid: { variant: "outline", label: t("earnings.paid") },
      completed: { variant: "default", label: t("earnings.completed") },
      pending: { variant: "secondary", label: t("earnings.pending") },
      failed: { variant: "destructive", label: t("appointments.status.rejected") },
      refunded: { variant: "outline", label: t("appointments.status.refunded") },
    };
    return statusMap[status] || { variant: "outline", label: status };
  };

  return (
    <DashboardLayout role="psychologist">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold">{t("earnings.title")}</h1>
          <p className="text-muted-foreground">{t("earnings.description")}</p>
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
        ) : useEarnings ? (
          // NEW EARNINGS VIEW
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-chart-2/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-chart-2" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{t("earnings.totalEarnings")}</p>
                      <p className="text-base sm:text-xl font-bold truncate">{earningsData?.summary.totalEarnings} {earningsData?.summary.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{t("earnings.thisMonth")}</p>
                      <p className="text-base sm:text-xl font-bold truncate">{earningsData?.summary.thisMonthEarnings} {earningsData?.summary.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Toplam Vergi</p>
                      <p className="text-base sm:text-xl font-bold truncate text-amber-600">
                        {earningsData?.summary.totalWithholdingTax || '0.00'} {earningsData?.summary.currency}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-chart-4/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-chart-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{t("earnings.pending")}</p>
                      <p className="text-base sm:text-xl font-bold truncate">{earningsData?.summary.pendingPayout} {earningsData?.summary.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-chart-1/10 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-chart-1" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{t("earnings.totalSessions")}</p>
                      <p className="text-base sm:text-xl font-bold">{earningsData?.summary.totalSessions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {earningsData?.earnings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">{t("earnings.noEarnings")}</h3>
                  <p className="text-muted-foreground text-sm">
                    Seanslarınız tamamlandığında kazançlarınız burada görünecektir.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <h2 className="font-semibold text-lg">{t("earnings.earningsDetails")}</h2>
                {earningsData?.earnings.map((earning) => {
                  const statusInfo = getStatusBadge(earning.status);

                  return (
                    <Card key={earning.id} data-testid={`card-earning-${earning.id}`}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col gap-3">
                          {/* Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-chart-2/10 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-chart-2" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm sm:text-base truncate">
                                  {earning.sessionDate && format(new Date(earning.sessionDate), "d MMMM yyyy, HH:mm", { locale: enUS })}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">{earning.patientName}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 pl-12 sm:pl-0">
                              <div className="text-right">
                                <p className="font-semibold text-chart-2 text-base sm:text-lg">
                                  {Number(earning.amount).toFixed(2)} {earning.currency}
                                </p>
                                {earning.withholdingTax && Number(earning.withholdingTax) > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Brüt: {Number(earning.amountGross).toFixed(2)} {earning.currency}
                                  </p>
                                )}
                              </div>
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </div>
                          </div>

                          {/* Tax Breakdown (if tax withheld) */}
                          {earning.withholdingTax && Number(earning.withholdingTax) > 0 && (
                            <div className="pl-12 sm:pl-0 pt-2 border-t">
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">Platform (%20)</p>
                                  <p className="font-medium">-{Number(earning.platformFee).toFixed(2)} {earning.currency}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Vergi ({(Number(earning.withholdingRate) * 100).toFixed(2)}%)
                                  </p>
                                  <p className="font-medium text-amber-600">
                                    -{Number(earning.withholdingTax).toFixed(2)} {earning.currency}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Net Kazanç</p>
                                  <p className="font-semibold text-chart-2">
                                    {Number(earning.amount).toFixed(2)} {earning.currency}
                                  </p>
                                </div>
                              </div>
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
        ) : (
          // LEGACY PAYMENTS VIEW (fallback)
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-chart-2/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-chart-2" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{t("earnings.totalEarnings")}</p>
                      <p className="text-base sm:text-xl font-bold truncate">{paymentsData?.summary.totalEarnings} {paymentsData?.summary.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Tamamlanan</p>
                      <p className="text-base sm:text-xl font-bold truncate">{paymentsData?.summary.completedPayouts} {paymentsData?.summary.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-chart-4/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-chart-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{t("earnings.pending")}</p>
                      <p className="text-base sm:text-xl font-bold truncate">{paymentsData?.summary.pendingPayouts} {paymentsData?.summary.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-chart-1/10 flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-chart-1" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{t("earnings.totalSessions")}</p>
                      <p className="text-base sm:text-xl font-bold">{paymentsData?.summary.totalSessions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {paymentsData?.payments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Henüz kazanç geçmişiniz bulunmuyor</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <h2 className="font-semibold text-lg">{t("earnings.sessionDetails")}</h2>
                {paymentsData?.payments.map((payment) => {
                  const statusInfo = getStatusBadge(payment.status);

                  return (
                    <Card key={payment.id} data-testid={`card-earning-${payment.id}`}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-3">
                          <div>
                            <p className="font-medium text-sm sm:text-base">
                              {payment.sessionDate && format(new Date(payment.sessionDate), "d MMMM yyyy, HH:mm", { locale: enUS })}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground capitalize">{payment.sessionStatus}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            {payment.refund && (
                              <Badge variant="outline">İade: %{payment.refund.percentage}</Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 text-xs sm:text-sm">
                          <div>
                            <p className="text-muted-foreground">{ t("earnings.grossAmount")}</p>
                            <p className="font-medium">{Number(payment.grossAmount).toFixed(2)} {payment.currency}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{ t("earnings.vat")}</p>
                            <p className="font-medium">{Number(payment.vatAmount).toFixed(2)} {payment.currency}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{ t("earnings.platformFee")}</p>
                            <p className="font-medium">{Number(payment.platformFee).toFixed(2)} {payment.currency}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{ t("earnings.netEarnings")}</p>
                            <p className="font-semibold text-chart-2">{Number(payment.providerPayout).toFixed(2)} {payment.currency}</p>
                          </div>
                          {payment.paidAt && (
                            <div>
                              <p className="text-muted-foreground">Ödeme Tarihi</p>
                              <p className="font-medium">{format(new Date(payment.paidAt), "d MMM yyyy", { locale: enUS })}</p>
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
