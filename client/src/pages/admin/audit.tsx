import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Filter, ChevronLeft, ChevronRight, Clock, User, FileText } from "lucide-react";

interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorName: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeData: any;
  afterData: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AuditLogsPage() {
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (entityTypeFilter && entityTypeFilter !== "all") {
    queryParams.append("entityType", entityTypeFilter);
  }
  if (actionFilter && actionFilter !== "all") {
    queryParams.append("action", actionFilter);
  }

  const { data, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ["/api/admin/audit", queryParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const handleResetFilters = () => {
    setEntityTypeFilter("");
    setActionFilter("");
    setPage(1);
  };

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      user: "Kullanıcı",
      user_profile: "Kullanıcı Profili",
      psychologist: "Psikolog",
      appointment: "Randevu",
      payment: "Ödeme",
      bank_transfer: "Havale",
      message: "Mesaj",
      availability_rules: "Müsaitlik Ayarları",
    };
    return labels[type] || type;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: "Oluşturuldu",
      updated: "Güncellendi",
      deleted: "Silindi",
      verified: "Doğrulandı",
      approved: "Onaylandı",
      rejected: "Reddedildi",
      cancelled: "İptal Edildi",
      completed: "Tamamlandı",
      registered: "Kayıt Oldu",
      logged_in: "Giriş Yaptı",
      requested: "Talep Edildi",
      reserved: "Rezerve Edildi",
      submitted: "Gönderildi",
    };
    return labels[action] || action;
  };

  const getActionBadgeVariant = (action: string) => {
    if (action === "created") return "default";
    if (action === "approved" || action === "verified" || action === "completed") return "default";
    if (action === "rejected" || action === "deleted" || action === "cancelled") return "destructive";
    if (action === "updated") return "secondary";
    return "outline";
  };

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Denetim Günlüğü
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistemdeki tüm işlemleri ve değişiklikleri görüntüleyin
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtreler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entityType">Varlık Türü</Label>
                <Select value={entityTypeFilter} onValueChange={(value) => { setEntityTypeFilter(value); setPage(1); }}>
                  <SelectTrigger id="entityType">
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="user">Kullanıcı</SelectItem>
                    <SelectItem value="user_profile">Kullanıcı Profili</SelectItem>
                    <SelectItem value="psychologist">Psikolog</SelectItem>
                    <SelectItem value="appointment">Randevu</SelectItem>
                    <SelectItem value="payment">Ödeme</SelectItem>
                    <SelectItem value="bank_transfer">Havale</SelectItem>
                    <SelectItem value="message">Mesaj</SelectItem>
                    <SelectItem value="availability_rules">Müsaitlik Ayarları</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">İşlem</Label>
                <Select value={actionFilter} onValueChange={(value) => { setActionFilter(value); setPage(1); }}>
                  <SelectTrigger id="action">
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="created">Oluşturuldu</SelectItem>
                    <SelectItem value="updated">Güncellendi</SelectItem>
                    <SelectItem value="deleted">Silindi</SelectItem>
                    <SelectItem value="registered">Kayıt Oldu</SelectItem>
                    <SelectItem value="logged_in">Giriş Yaptı</SelectItem>
                    <SelectItem value="verified">Doğrulandı</SelectItem>
                    <SelectItem value="approved">Onaylandı</SelectItem>
                    <SelectItem value="rejected">Reddedildi</SelectItem>
                    <SelectItem value="cancelled">İptal Edildi</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="requested">Talep Edildi</SelectItem>
                    <SelectItem value="reserved">Rezerve Edildi</SelectItem>
                    <SelectItem value="submitted">Gönderildi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex items-end">
                <Button onClick={handleResetFilters} variant="outline" className="w-full">
                  Filtreleri Sıfırla
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : logs.length > 0 ? (
          <>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium">Tarih & Saat</th>
                        <th className="text-left py-3 px-4 font-medium">Kullanıcı</th>
                        <th className="text-left py-3 px-4 font-medium">Varlık Türü</th>
                        <th className="text-left py-3 px-4 font-medium">İşlem</th>
                        <th className="text-left py-3 px-4 font-medium">Detaylar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>{format(new Date(log.createdAt), "dd MMM yyyy, HH:mm:ss", { locale: enUS })}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{log.actorName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">
                              {getEntityTypeLabel(log.entityType)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {getActionLabel(log.action)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <FileText className="w-3 h-3" />
                              <span className="truncate max-w-[300px]">
                                ID: {log.entityId.slice(0, 8)}...
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Toplam {pagination.total} kayıt - Sayfa {pagination.page} / {pagination.totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Önceki
                      </Button>
                      <div className="flex gap-1">
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                          .filter(p => {
                            return p === 1 ||
                                   p === pagination.totalPages ||
                                   Math.abs(p - page) <= 1;
                          })
                          .map((p, idx, arr) => {
                            const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                            return (
                              <div key={p} className="flex items-center gap-1">
                                {showEllipsisBefore && <span className="px-2">...</span>}
                                <Button
                                  variant={p === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setPage(p)}
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
                      >
                        Sonraki
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
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Kayıt bulunamadı</h2>
              <p className="text-muted-foreground">
                Seçilen kriterlere uygun denetim kaydı bulunamadı
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
