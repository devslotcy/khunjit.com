import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";
import { enUS } from "date-fns/locale";
import { formatAppointmentTime } from "@/lib/datetime";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, AlertCircle, Copy, Building2, Filter, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BankTransfer, Appointment, PsychologistProfile } from "@shared/schema";

interface EnrichedBankTransfer extends BankTransfer {
  appointment?: Appointment & {
    psychologist?: PsychologistProfile;
  };
  patientName?: string;
}

interface BankTransfersResponse {
  transfers: EnrichedBankTransfer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper function to get default dates
const getDefaultDates = () => {
  const today = new Date();
  const firstDayOfMonth = startOfMonth(today);
  return {
    start: format(firstDayOfMonth, "yyyy-MM-dd"),
    end: format(today, "yyyy-MM-dd")
  };
};

export default function BankTransfersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTransfer, setSelectedTransfer] = useState<EnrichedBankTransfer | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Get default dates
  const defaultDates = getDefaultDates();

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [startDateInput, setStartDateInput] = useState(defaultDates.start);
  const [endDateInput, setEndDateInput] = useState(defaultDates.end);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Build query params
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy,
    sortOrder,
  });

  if (statusFilter && statusFilter !== "all") {
    queryParams.append("status", statusFilter);
  }
  if (searchInput.trim()) {
    queryParams.append("search", searchInput.trim());
  }
  if (startDateInput) {
    queryParams.append("startDate", startDateInput);
  }
  if (endDateInput) {
    // Add end of day to include all records from the end date
    const endDateWithTime = new Date(endDateInput);
    endDateWithTime.setHours(23, 59, 59, 999);
    queryParams.append("endDate", endDateWithTime.toISOString());
  }

  const { data: response, isLoading } = useQuery<BankTransfersResponse>({
    queryKey: ["/api/admin/bank-transfers", queryParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/bank-transfers?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ transferId, approve, reason, notes }: { transferId: string; approve: boolean; reason?: string; notes?: string }) => {
      const response = await fetch(`/api/admin/bank-transfers/${transferId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approve, rejectionReason: reason, adminNotes: notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "İşlem başarısız");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bank-transfers"] });
      toast({
        title: action === "approve" ? "Ödeme onaylandı" : "Ödeme reddedildi",
        description: action === "approve"
          ? "Randevu onaylandı ve danışan bilgilendirilecek"
          : "Randevu reddedildi ve danışan bilgilendirilecek",
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (transfer: EnrichedBankTransfer, actionType: "approve" | "reject") => {
    setSelectedTransfer(transfer);
    setAction(actionType);
    setRejectionReason("");
    setAdminNotes("");
  };

  const handleCloseDialog = () => {
    setSelectedTransfer(null);
    setAction(null);
    setRejectionReason("");
    setAdminNotes("");
  };

  const handleSubmit = () => {
    if (!selectedTransfer) return;

    if (action === "reject" && !rejectionReason.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen red nedeni belirtin",
        variant: "destructive",
      });
      return;
    }

    reviewMutation.mutate({
      transferId: selectedTransfer.id,
      approve: action === "approve",
      reason: rejectionReason,
      notes: adminNotes,
    });
  };

  const handleResetFilters = () => {
    const defaults = getDefaultDates();
    setStatusFilter("all");
    setSearchInput("");
    setStartDateInput(defaults.start);
    setEndDateInput(defaults.end);
    setSortBy("date");
    setSortOrder("desc");
    setPage(1);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Kopyalandı",
        description: `${label} panoya kopyalandı`,
      });
    } catch (err) {
      toast({
        title: "Kopyalama başarısız",
        description: "Lütfen manuel olarak kopyalayın",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: string | null) => {
    if (!price) return "Not specified";
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(parseFloat(price));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300"><Clock className="w-3 h-3 mr-1" />İncelemede</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Onaylandı</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="w-3 h-3 mr-1" />Reddedildi</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300"><XCircle className="w-3 h-3 mr-1" />İptal Edildi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const transfers = response?.transfers || [];
  const pagination = response?.pagination;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Deprecation Notice */}
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900">Legacy System - Read Only</h3>
                <p className="text-sm text-amber-800 mt-1">
                  Manual bank transfer approval is deprecated. All new payments now use PromptPay QR with automatic webhook confirmation.
                  This page shows historical records only. To view current payment activity, check the{" "}
                  <a href="/admin/payments" className="underline font-medium">Payments</a> or{" "}
                  <a href="/admin" className="underline font-medium">Dashboard</a> pages.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h1 className="text-3xl font-bold font-serif">Bank Transfers (Legacy)</h1>
          <p className="text-muted-foreground">
            Historical bank transfer records - Read only view
          </p>
        </div>

        {/* Filters */}
        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
              Filtreler ve Arama
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Filtreler uygulandıktan sonra sonuçları gösterir
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6 overflow-hidden">
            {/* Date Range Filters */}
            <div className="space-y-2 sm:space-y-3 overflow-hidden">
              <Label className="text-sm sm:text-base font-semibold">Tarih Aralığı</Label>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 overflow-hidden">
                <div className="w-full sm:w-1/2 min-w-0 space-y-1 sm:space-y-2 overflow-hidden">
                  <Label htmlFor="startDate" className="text-xs sm:text-sm text-muted-foreground block">
                    Başlangıç
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    className="w-full max-w-full text-sm h-10 px-2 sm:px-3 [&::-webkit-calendar-picker-indicator]:ml-0 [&::-webkit-datetime-edit]:overflow-hidden"
                    style={{ maxWidth: '100%' }}
                  />
                </div>
                <div className="w-full sm:w-1/2 min-w-0 space-y-1 sm:space-y-2 overflow-hidden">
                  <Label htmlFor="endDate" className="text-xs sm:text-sm text-muted-foreground block">
                    Bitiş
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    className="w-full max-w-full text-sm h-10 px-2 sm:px-3 [&::-webkit-calendar-picker-indicator]:ml-0 [&::-webkit-datetime-edit]:overflow-hidden"
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-sm sm:text-base font-semibold">Arama</Label>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="search" className="text-xs sm:text-sm text-muted-foreground">
                  Referans, Banka, IBAN veya Hesap Sahibi
                </Label>
                <Input
                  id="search"
                  placeholder="Ara..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full text-sm h-9 sm:h-10"
                />
              </div>
            </div>

            {/* Status and Sort Filters */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="status" className="text-xs sm:text-sm text-muted-foreground">
                  Durum
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status" className="h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="pending_review">İncelemede</SelectItem>
                    <SelectItem value="approved">Onaylandı</SelectItem>
                    <SelectItem value="rejected">Reddedildi</SelectItem>
                    <SelectItem value="cancelled">İptal Edildi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="sortBy" className="text-xs sm:text-sm text-muted-foreground">
                  Sıralama
                </Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger id="sortBy" className="h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Tarih</SelectItem>
                    <SelectItem value="amount">Tutar</SelectItem>
                    <SelectItem value="status">Durum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="sortOrder" className="text-xs sm:text-sm text-muted-foreground">
                  Yön
                </Label>
                <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
                  <SelectTrigger id="sortOrder" className="h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Azalan</SelectItem>
                    <SelectItem value="asc">Artan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm text-muted-foreground">Sayfa</Label>
                <div className="h-9 sm:h-10 flex items-center px-3 border rounded-md bg-muted/30 text-xs sm:text-sm">
                  {limit} kayıt
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleResetFilters}
                variant="outline"
                className="w-full h-9 sm:h-10 text-sm"
              >
                <X className="w-4 h-4 mr-2" />
                Temizle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
            </CardContent>
          </Card>
        ) : transfers && transfers.length > 0 ? (
          <>
            <div className="space-y-4">
              {transfers.map((transfer) => (
                <Card key={transfer.id}>
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <CardTitle className="text-sm sm:text-lg truncate">
                          {transfer.patientName || "Danışan"} → {transfer.appointment?.psychologist?.fullName || "Psikolog"}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Ref: <code className="font-mono font-semibold text-xs">{transfer.referenceCode}</code>
                        </CardDescription>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(transfer.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {/* Left Column - Appointment Details */}
                      <div className="space-y-2 sm:space-y-3">
                        <h3 className="font-semibold text-xs sm:text-sm text-muted-foreground">Randevu Bilgileri</h3>
                        <div className="space-y-2 text-xs sm:text-sm">
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground flex-shrink-0">Psikolog</span>
                            <span className="font-medium truncate text-right">{transfer.appointment?.psychologist?.fullName}</span>
                          </div>
                          {transfer.appointment && (
                            <>
                              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                                <span className="text-muted-foreground">Tarih & Saat</span>
                                <span className="font-medium text-xs sm:text-sm">
                                  {transfer.appointment.startAt && transfer.appointment.endAt && formatAppointmentTime(transfer.appointment.startAt, transfer.appointment.endAt).fullDateTime}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Tutar</span>
                                <span className="font-medium text-sm sm:text-lg text-primary">{formatPrice(transfer.amount)}</span>
                              </div>
                            </>
                          )}
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                            <span className="text-muted-foreground">Bildirim</span>
                            <span className="font-medium text-xs sm:text-sm">
                              {transfer.submittedAt && format(new Date(transfer.submittedAt), "dd MMM yyyy, HH:mm", { locale: enUS })}
                            </span>
                          </div>
                          {transfer.reviewedAt && (
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                              <span className="text-muted-foreground">İnceleme</span>
                              <span className="font-medium text-xs sm:text-sm">
                                {format(new Date(transfer.reviewedAt), "dd MMM yyyy, HH:mm", { locale: enUS })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column - Bank Details */}
                      <div className="space-y-2 sm:space-y-3">
                        <h3 className="font-semibold text-xs sm:text-sm text-muted-foreground">Havale Detayları</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded border">
                            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-medium truncate">{transfer.bankName}</span>
                          </div>
                          <div className="p-2 bg-muted/30 rounded border">
                            <p className="text-xs text-muted-foreground mb-1">Alıcı</p>
                            <p className="text-xs sm:text-sm font-medium truncate">{transfer.accountHolder}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 p-2 bg-muted/30 rounded border min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">IBAN</p>
                              <p className="text-[10px] sm:text-xs font-mono truncate">{transfer.iban}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => copyToClipboard(transfer.iban, "IBAN")}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {transfer.status === "pending_review" && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                        <p className="text-sm text-amber-800">
                          Manual approval is disabled. New payments use PromptPay QR with automatic confirmation.
                        </p>
                      </div>
                    )}

                    {transfer.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                        <p className="text-xs sm:text-sm font-medium text-red-900 mb-1">Red Nedeni:</p>
                        <p className="text-xs sm:text-sm text-red-800">{transfer.rejectionReason}</p>
                      </div>
                    )}

                    {transfer.adminNotes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                        <p className="text-xs sm:text-sm font-medium text-blue-900 mb-1">Admin Notları:</p>
                        <p className="text-xs sm:text-sm text-blue-800">{transfer.adminNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                      {pagination.total} kayıt - {pagination.page}/{pagination.totalPages}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline ml-1">Önceki</span>
                      </Button>
                      <div className="flex gap-1">
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                          .filter(p => {
                            // Show first page, last page, current page, and pages around current
                            return p === 1 ||
                                   p === pagination.totalPages ||
                                   Math.abs(p - page) <= 1;
                          })
                          .map((p, idx, arr) => {
                            // Add ellipsis if there's a gap
                            const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                            return (
                              <div key={p} className="flex items-center gap-1">
                                {showEllipsisBefore && <span className="px-1 sm:px-2 text-xs">...</span>}
                                <Button
                                  variant={p === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setPage(p)}
                                  className="h-8 w-8 sm:w-auto sm:px-3 text-xs sm:text-sm"
                                >
                                  {p}
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page === pagination.totalPages}
                        className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline mr-1">Sonraki</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Sonuç bulunamadı</h2>
              <p className="text-muted-foreground">
                Aradığınız kriterlere uygun havale ödemesi bulunamadı
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={action !== null} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Ödemeyi Onayla" : "Ödemeyi Reddet"}
            </DialogTitle>
            <DialogDescription>
              {action === "approve"
                ? "Ödemeyi onayladığınızda randevu aktif hale gelecek ve danışan bilgilendirilecektir."
                : "Ödemeyi reddettiğinizde randevu iptal edilecek ve danışan bilgilendirilecektir."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedTransfer && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                <p className="text-sm">
                  <span className="text-muted-foreground">Randevu: </span>
                  <span className="font-medium">{selectedTransfer.patientName} → {selectedTransfer.appointment?.psychologist?.fullName}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Tutar: </span>
                  <span className="font-medium">{formatPrice(selectedTransfer.amount)}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Referans: </span>
                  <code className="font-mono font-medium">{selectedTransfer.referenceCode}</code>
                </p>
              </div>
            )}

            {action === "reject" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Red Nedeni *</label>
                <Textarea
                  placeholder="Ödemenin neden reddedildiğini açıklayın..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Notları (Opsiyonel)</label>
              <Textarea
                placeholder="İç kayıtlar için notlar..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={reviewMutation.isPending}>
              İptal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={reviewMutation.isPending || (action === "reject" && !rejectionReason.trim())}
              className={action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {reviewMutation.isPending ? "İşleniyor..." : action === "approve" ? "Onayla" : "Reddet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
