import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth } from "date-fns";
import { Receipt, Filter, TrendingUp, Wallet, AlertCircle, Calendar, User, DollarSign } from "lucide-react";

interface PaymentItem {
  id: string;
  appointmentId: string;
  psychologistName: string;
  patientName: string;
  patientId: string;
  sessionDate: string;
  sessionStatus: string;
  grossAmount: string;
  vatAmount: string;
  platformFee: string;
  providerPayout: string;
  withholdingTax: string;
  withholdingRate: string;
  psychologistGross: string;
  psychologistNet: string;
  platformNet: string;
  countryCode: string;
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
    totalWithholdingTax: string;
    totalPsychologistNet: string;
    totalPlatformNet: string;
    completedCount: number;
    refundedCount: number;
    currency: string;
  };
}

export default function AdminPayments() {
  const getDefaultStartDate = () => {
    const firstDayOfMonth = startOfMonth(new Date());
    return format(firstDayOfMonth, "yyyy-MM-dd");
  };

  const getDefaultEndDate = () => {
    return format(new Date(), "yyyy-MM-dd");
  };

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());

  const queryParams = new URLSearchParams();
  if (statusFilter && statusFilter !== "all") queryParams.set("status", statusFilter);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    queryParams.set("endDate", endDateTime.toISOString());
  }

  const { data, isLoading, error } = useQuery<AdminPaymentsResponse>({
    queryKey: ["/api/admin/payments", queryParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/payments?${queryParams.toString()}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Payment fetch error:", errorText);
        throw new Error(`Failed to fetch payments: ${res.status}`);
      }
      const jsonData = await res.json();
      return jsonData;
    },
  });

  const handleClearFilters = () => {
    setStatusFilter("all");
    setStartDate(getDefaultStartDate());
    setEndDate(getDefaultEndDate());
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; color: string }> = {
      completed: { variant: "default", label: "Tamamlandı", color: "bg-green-100 text-green-800 border-green-200" },
      paid: { variant: "default", label: "Ödendi", color: "bg-green-100 text-green-800 border-green-200" },
      pending: { variant: "secondary", label: "Beklemede", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      failed: { variant: "destructive", label: "Başarısız", color: "bg-red-100 text-red-800 border-red-200" },
      refunded: { variant: "outline", label: "İade Edildi", color: "bg-blue-100 text-blue-800 border-blue-200" },
      refund_pending: { variant: "secondary", label: "İade Bekliyor", color: "bg-amber-100 text-amber-800 border-amber-200" },
      payment_pending: { variant: "secondary", label: "Ödeme Bekliyor", color: "bg-orange-100 text-orange-800 border-orange-200" },
    };
    return statusMap[status] || { variant: "outline", label: status, color: "" };
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold mb-2">Ödeme Raporu</h1>
          <p className="text-muted-foreground">Platformdaki tüm ödemeleri görüntüleyin ve filtreleyin</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtreler ve Arama
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Başlangıç Tarihi
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                  data-testid="input-start-date"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Bitiş Tarihi
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Durum</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="Durum Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="paid">Ödendi</SelectItem>
                    <SelectItem value="pending">Beklemede</SelectItem>
                    <SelectItem value="payment_pending">Ödeme Bekliyor</SelectItem>
                    <SelectItem value="refunded">İade Edildi</SelectItem>
                    <SelectItem value="failed">Başarısız</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                onClick={handleClearFilters}
                data-testid="button-clear-filter"
              >
                Temizle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error ? (
          <Card className="border-destructive">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 text-destructive">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Hata Oluştu</p>
                  <p className="text-sm">{error instanceof Error ? error.message : "Veriler yüklenemedi"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 mb-1">Toplam İşlem</p>
                      <p className="text-3xl font-bold text-blue-900">{data?.summary.totalPayments || 0}</p>
                      <p className="text-xs text-blue-600 mt-1">ödeme işlemi</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 mb-1">Toplam Gelir</p>
                      <p className="text-3xl font-bold text-green-900">{formatCurrency(data?.summary.totalGross || 0)}</p>
                      <p className="text-xs text-green-600 mt-1">brüt tutar</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600 mb-1">Platform Payı</p>
                      <p className="text-3xl font-bold text-purple-900">{formatCurrency(data?.summary.totalPlatformFee || 0)}</p>
                      <p className="text-xs text-purple-600 mt-1">%20 platform geliri</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-600 mb-1">Vergi Kesintisi</p>
                      <p className="text-3xl font-bold text-amber-900">{formatCurrency(data?.summary.totalWithholdingTax || 0)}</p>
                      <p className="text-xs text-amber-600 mt-1">tevkifat toplamı</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600 mb-1">Psikolog Net</p>
                      <p className="text-3xl font-bold text-orange-900">{formatCurrency(data?.summary.totalPsychologistNet || 0)}</p>
                      <p className="text-xs text-orange-600 mt-1">vergi sonrası</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payments Table */}
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Ödeme Detayları
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data?.payments.length === 0 ? (
                  <div className="py-16 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium text-muted-foreground mb-1">Veri Bulunamadı</p>
                    <p className="text-sm text-muted-foreground">Seçili kriterlere uygun ödeme bulunamadı</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="text-left py-4 px-4 font-semibold text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Tarih
                            </div>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-sm">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              Danışan
                            </div>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-sm">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              Psikolog
                            </div>
                          </th>
                          <th className="text-right py-4 px-4 font-semibold text-sm">Toplam Tutar</th>
                          <th className="text-right py-4 px-4 font-semibold text-sm">Platform (%20)</th>
                          <th className="text-right py-4 px-4 font-semibold text-sm">Vergi Kesintisi</th>
                          <th className="text-right py-4 px-4 font-semibold text-sm">Psikolog Net</th>
                          <th className="text-center py-4 px-4 font-semibold text-sm">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data?.payments.map((payment, index) => {
                          const statusInfo = getStatusBadge(payment.status);
                          return (
                            <tr
                              key={payment.id}
                              className="hover:bg-muted/30 transition-colors"
                              data-testid={`row-payment-${payment.id}`}
                            >
                              <td className="py-4 px-4">
                                <div className="font-medium text-sm">
                                  {payment.paidAt
                                    ? format(new Date(payment.paidAt), "dd MMM yyyy")
                                    : payment.sessionDate
                                    ? format(new Date(payment.sessionDate), "dd MMM yyyy")
                                    : "-"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {payment.paidAt && format(new Date(payment.paidAt), "HH:mm")}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-medium text-sm">{payment.patientName}</div>
                                <div className="text-xs text-muted-foreground">ID: {payment.patientId.substring(0, 8)}</div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-medium text-sm">{payment.psychologistName}</div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="font-bold text-green-700">{formatCurrency(payment.grossAmount)}</div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="text-sm text-purple-600 font-medium">{formatCurrency(payment.platformFee)}</div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="text-sm text-amber-600 font-medium">
                                  {formatCurrency(payment.withholdingTax || "0")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {payment.withholdingRate && parseFloat(payment.withholdingRate) > 0
                                    ? `${parseFloat(payment.withholdingRate).toFixed(2)}% ${payment.countryCode || ''}`
                                    : '-'}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="font-semibold text-blue-700">
                                  {formatCurrency(payment.psychologistNet || payment.providerPayout)}
                                </div>
                                {payment.withholdingTax && parseFloat(payment.withholdingTax) > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    Brüt: {formatCurrency(payment.psychologistGross || payment.providerPayout)}
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Badge
                                    variant={statusInfo.variant}
                                    className={`text-xs px-3 py-1 ${statusInfo.color}`}
                                  >
                                    {statusInfo.label}
                                  </Badge>
                                  {payment.refunds.length > 0 && (
                                    <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                                      İade Edildi
                                    </Badge>
                                  )}
                                </div>
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

            {/* Footer Summary */}
            <Card className="bg-muted/20">
              <CardContent className="p-4">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tamamlanan İşlem:</span>
                    <span className="ml-2 font-semibold">{data?.summary.completedCount} ödeme</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Platform Geliri (%20):</span>
                    <span className="ml-2 font-semibold text-purple-600">{formatCurrency(data?.summary.totalPlatformFee || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
