import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, DollarSign } from "lucide-react";
import { formatAppointmentTime } from "@/lib/datetime";

interface AdminAppointment {
  id: string;
  startAt: Date;
  endAt: Date;
  status: string;
  patientId: string;
  psychologistId: string;
  psychologist?: {
    id: string;
    fullName: string;
  };
  payment?: {
    id: string;
    status: string;
    grossAmount: string;
  };
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_approval: { label: "Onay Bekliyor", variant: "secondary" },
  payment_pending: { label: "Ödeme Bekliyor", variant: "outline" },
  confirmed: { label: "Onaylandı", variant: "default" },
  in_session: { label: "Devam Ediyor", variant: "default" },
  completed: { label: "Tamamlandı", variant: "secondary" },
  cancelled: { label: "İptal Edildi", variant: "destructive" },
  no_show: { label: "Katılmadı", variant: "destructive" },
  refunded: { label: "İade Edildi", variant: "destructive" },
};

export default function AdminAppointmentsPage() {
  const { data: appointments = [], isLoading } = useQuery<AdminAppointment[]>({
    queryKey: ["/api/admin/appointments"],
  });

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Randevular</h1>
          <p className="text-muted-foreground mt-2">
            Tüm randevuları görüntüleyin ve yönetin
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : appointments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Henüz randevu bulunmuyor.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {appointments.map((appointment) => {
              const formattedTime = formatAppointmentTime(appointment.startAt, appointment.endAt);
              return (
              <Card key={appointment.id}>
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">
                        {appointment.psychologist?.fullName || "Bilinmiyor"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{formattedTime.date}</span>
                      </CardDescription>
                    </div>
                    <Badge variant={statusLabels[appointment.status]?.variant || "default"} className="flex-shrink-0 text-xs">
                      {statusLabels[appointment.status]?.label || appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span>
                        {formattedTime.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">ID: {appointment.patientId.slice(0, 8)}...</span>
                    </div>
                    {appointment.payment && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span>{appointment.payment.grossAmount} TL</span>
                        <Badge variant="outline" className="text-xs">
                          {appointment.payment.status === "completed" ? "Ödendi" : "Bekliyor"}
                        </Badge>
                      </div>
                    )}
                  </div>
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
