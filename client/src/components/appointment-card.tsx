import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, MessageCircle, X, Clock, CheckCircle2 } from "lucide-react";
import { format, formatDistanceToNow, isAfter, isBefore, addMinutes, subMinutes } from "date-fns";
import { tr } from "date-fns/locale";
import type { Appointment, PsychologistProfile } from "@shared/schema";

interface AppointmentCardProps {
  appointment: Appointment & { psychologist?: PsychologistProfile };
  userRole: "patient" | "psychologist";
  onJoin?: () => void;
  onCancel?: () => void;
  onMessage?: () => void;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  reserved: { label: "Rezerve", variant: "outline" },
  payment_pending: { label: "Ödeme Bekleniyor", variant: "secondary" },
  confirmed: { label: "Onaylandı", variant: "default" },
  ready: { label: "Hazır", variant: "default" },
  in_session: { label: "Seansta", variant: "default" },
  completed: { label: "Tamamlandı", variant: "secondary" },
  cancelled: { label: "İptal Edildi", variant: "destructive" },
  expired: { label: "Süresi Doldu", variant: "destructive" },
  refunded: { label: "İade Edildi", variant: "outline" },
  no_show: { label: "Katılmadı", variant: "destructive" },
};

export function AppointmentCard({ 
  appointment, 
  userRole, 
  onJoin, 
  onCancel, 
  onMessage 
}: AppointmentCardProps) {
  const now = new Date();
  const startTime = new Date(appointment.startAt);
  const endTime = new Date(appointment.endAt);
  
  const canJoin = appointment.status === "confirmed" && 
    isAfter(now, subMinutes(startTime, 10)) && 
    isBefore(now, addMinutes(endTime, 15));
  
  const canCancel = ["reserved", "payment_pending", "confirmed"].includes(appointment.status) &&
    isBefore(now, subMinutes(startTime, 60));

  const statusInfo = statusLabels[appointment.status] || { label: appointment.status, variant: "secondary" as const };

  const getBorderColor = () => {
    switch (appointment.status) {
      case "reserved":
      case "payment_pending":
        return "border-l-amber-500";
      case "confirmed":
      case "ready":
        return "border-l-primary";
      case "in_session":
        return "border-l-chart-2";
      case "completed":
        return "border-l-muted-foreground";
      case "cancelled":
      case "expired":
      case "no_show":
        return "border-l-destructive";
      default:
        return "border-l-border";
    }
  };

  return (
    <Card 
      className={`overflow-hidden border-l-4 ${getBorderColor()}`}
      data-testid={`appointment-card-${appointment.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {appointment.psychologist && (
              <Avatar className="w-12 h-12">
                <AvatarImage src={appointment.psychologist.profileImageUrl || undefined} />
                <AvatarFallback>
                  {appointment.psychologist.fullName?.split(' ').map(n => n[0]).join('') || 'P'}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h4 className="font-medium">
                {userRole === "patient" 
                  ? appointment.psychologist?.fullName || "Psikolog"
                  : "Hasta"}
              </h4>
              <p className="text-sm text-muted-foreground">
                {appointment.psychologist?.title || "Klinik Psikolog"}
              </p>
            </div>
          </div>
          <Badge variant={statusInfo.variant}>
            {statusInfo.label}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">
              {format(startTime, "d MMMM yyyy, EEEE", { locale: tr })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="ml-6">
              {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
            </span>
          </div>
          {isBefore(now, startTime) && ["confirmed", "ready"].includes(appointment.status) && (
            <p className="text-sm text-primary ml-6">
              {formatDistanceToNow(startTime, { addSuffix: true, locale: tr })}
            </p>
          )}
        </div>

        {appointment.status === "payment_pending" && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Seansa katılmak için ödeme yapmanız gerekmektedir
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {canJoin && (
            <Button onClick={onJoin} className="gap-2" data-testid="button-join-session">
              <Video className="w-4 h-4" />
              Seansa Katıl
            </Button>
          )}
          
          {!canJoin && ["confirmed", "ready"].includes(appointment.status) && (
            <Button disabled className="gap-2" data-testid="button-join-disabled">
              <Video className="w-4 h-4" />
              {isBefore(now, subMinutes(startTime, 10)) 
                ? "Seans henüz başlamadı" 
                : "Seans süresi geçti"}
            </Button>
          )}

          {appointment.status === "payment_pending" && (
            <Button variant="default" className="gap-2" data-testid="button-pay-now">
              <CheckCircle2 className="w-4 h-4" />
              Şimdi Öde
            </Button>
          )}

          {onMessage && (
            <Button variant="outline" size="icon" onClick={onMessage} data-testid="button-message">
              <MessageCircle className="w-4 h-4" />
            </Button>
          )}

          {canCancel && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onCancel}
              className="text-destructive hover:text-destructive"
              data-testid="button-cancel-appointment"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
