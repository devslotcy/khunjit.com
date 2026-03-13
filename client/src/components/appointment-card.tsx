import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Video, MessageCircle, X, Clock } from "lucide-react";
import { isBefore, subMinutes } from "date-fns";
import { canJoinVideoCall, getJoinTooltip } from "@/lib/video-call-utils";
import { formatAppointmentTime, getRelativeAppointmentTimeKey } from "@/lib/datetime";
import { useTranslation } from "react-i18next";
import type { Appointment, PsychologistProfile } from "@shared/schema";

interface AppointmentCardProps {
  appointment: Appointment & {
    psychologist?: PsychologistProfile;
    patientName?: string;
  };
  userRole: "patient" | "psychologist";
  onCancel?: () => void;
  onMessage?: () => void;
  onVideoCall?: () => void;
}

// Status variants for styling
const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  reserved: "outline",
  payment_pending: "secondary",
  payment_review: "secondary",
  confirmed: "default",
  ready: "default",
  in_session: "default",
  completed: "secondary",
  cancelled: "destructive",
  expired: "destructive",
  refunded: "outline",
  no_show: "destructive",
  rejected: "destructive",
};

export function AppointmentCard({
  appointment,
  userRole,
  onCancel,
  onMessage,
  onVideoCall
}: AppointmentCardProps) {
  const { t } = useTranslation();
  const now = new Date();
  const startTime = new Date(appointment.startAt);

  // Format appointment times - always display in Thailand timezone (TH)
  const formattedTime = formatAppointmentTime(appointment.startAt, appointment.endAt);

  // Get translated weekday name
  const weekdayLabel = t(`weekdays.${formattedTime.weekdayKey}`);

  // Get relative time with i18n
  const relativeTimeInfo = getRelativeAppointmentTimeKey(appointment.startAt);
  const relativeTimeLabel = t(relativeTimeInfo.key, relativeTimeInfo.values);

  // Check if user can join video call (uses UTC comparison internally)
  const videoCallResult = canJoinVideoCall(appointment, now);

  // Translate video call messages
  const videoCallMessage = t(videoCallResult.message);
  const videoCallTooltip = getJoinTooltip(videoCallResult, startTime, t);

  // Cancel check: can cancel if more than 60 minutes before start (UTC comparison)
  const canCancel = ["reserved", "payment_pending", "confirmed"].includes(appointment.status) &&
    isBefore(now, subMinutes(startTime, 60));

  // Get status variant and translated label
  const statusVariant = statusVariants[appointment.status] || "secondary";
  const statusLabel = t(`appointments.status.${appointment.status}`, appointment.status);

  const getBorderColor = () => {
    switch (appointment.status) {
      case "reserved":
        return "border-l-amber-500";
      case "payment_pending":
      case "payment_review":
        return "border-l-orange-500";
      case "confirmed":
      case "ready":
        return "border-l-emerald-500";
      case "in_session":
        return "border-l-blue-500";
      case "completed":
        return "border-l-slate-400";
      case "cancelled":
      case "expired":
      case "no_show":
        return "border-l-red-500";
      default:
        return "border-l-border";
    }
  };

  // Show video call section only for confirmed appointments (payment completed)
  const showVideoCallSection = onVideoCall && ["confirmed", "ready", "in_session"].includes(appointment.status);

  return (
    <Card
      className={`overflow-hidden border-l-[6px] ${getBorderColor()} hover:shadow-md transition-shadow`}
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
              {userRole === "patient" ? (
                <>
                  {/* Title first (top line) - secondary/lighter style */}
                  {appointment.psychologist?.title && (
                    <p className="text-sm text-muted-foreground">
                      {t(`titles.${appointment.psychologist.title}`, appointment.psychologist.title)}
                    </p>
                  )}
                  {/* Name second (bottom line) - primary/bolder style */}
                  <h4 className="font-medium">
                    {appointment.psychologist?.fullName || t("titles.psychologist")}
                  </h4>
                </>
              ) : (
                <>
                  {/* For psychologist view: show "Danışan" on top, patient name on bottom */}
                  <p className="text-sm text-muted-foreground">
                    {t("appointments.patientFallback")}
                  </p>
                  <h4 className="font-medium">
                    {appointment.patientName || t("appointments.patientFallback")}
                  </h4>
                </>
              )}
            </div>
          </div>
          <Badge variant={statusVariant}>
            {statusLabel}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">
              {formattedTime.date}, {weekdayLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="ml-6">
              {formattedTime.timeWithLabel}
            </span>
          </div>
          {/* Relative time badge - shows for all non-past appointments */}
          {isBefore(now, startTime) && !["completed", "cancelled", "expired", "refunded", "no_show", "rejected"].includes(appointment.status) && (
            <span className="inline-flex ml-6 px-2 py-0.5 text-xs font-medium rounded-md bg-primary/10 text-primary">
              {relativeTimeLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          {/* Video Call Button */}
          {showVideoCallSection && (
            <>
              {videoCallResult.canJoin ? (
                <Button
                  variant="default"
                  onClick={onVideoCall}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  data-testid="button-video-call"
                >
                  <Video className="w-4 h-4" />
                  {t("appointments.joinSession")}
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      disabled
                      className="gap-2 border-muted-foreground/30 text-muted-foreground disabled:opacity-100"
                      data-testid="button-video-call-disabled"
                    >
                      <Video className="w-4 h-4" />
                      {videoCallMessage}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{videoCallTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </>
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
              className="text-destructive hover:text-destructive hidden sm:flex"
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
