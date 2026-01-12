import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { VideoSession, VideoSessionPreJoin } from "@/components/video-session";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import type { Appointment, PsychologistProfile } from "@shared/schema";

type AppointmentWithDetails = Appointment & { 
  psychologist: PsychologistProfile;
};

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [inSession, setInSession] = useState(false);

  const { data: appointment, isLoading, error } = useQuery<AppointmentWithDetails>({
    queryKey: ["/api/appointments", id],
    enabled: !!id,
  });

  const { data: sessionInfo } = useQuery<{ roomName: string; canJoin: boolean; message?: string }>({
    queryKey: ["/api/appointments", id, "session-info"],
    enabled: !!id && !!appointment && appointment.status === "confirmed",
    refetchInterval: 10000,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/appointments/${id}/join`);
    },
    onSuccess: () => {
      setInSession(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Seansa katılınamadı",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/appointments/${id}/leave`);
    },
    onSuccess: () => {
      setInSession(false);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      navigate("/dashboard/appointments");
      toast({
        title: "Seans tamamlandı",
        description: "Seansınız başarıyla tamamlandı",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-card-border">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-bold mb-2">Seans Bulunamadı</h2>
            <p className="text-muted-foreground mb-6">
              Bu seans mevcut değil veya erişim izniniz yok
            </p>
            <Button onClick={() => navigate("/dashboard/appointments")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Randevulara Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (appointment.status !== "confirmed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-card-border">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-bold mb-2">Seans Başlatılamıyor</h2>
            <p className="text-muted-foreground mb-6">
              {appointment.status === "payment_pending" 
                ? "Bu seansa katılmak için önce ödeme yapmanız gerekmektedir"
                : appointment.status === "completed"
                ? "Bu seans zaten tamamlanmış"
                : "Bu seans için katılım mümkün değil"}
            </p>
            <Button onClick={() => navigate("/dashboard/appointments")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Randevulara Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionInfo?.canJoin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-card-border">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-bold mb-2">Henüz Katılım Zamanı Gelmedi</h2>
            <p className="text-muted-foreground mb-6">
              {sessionInfo?.message || "Seans saatinden 10 dakika önce katılabilirsiniz"}
            </p>
            <Button onClick={() => navigate("/dashboard/appointments")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Randevulara Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inSession && sessionInfo?.roomName) {
    return (
      <VideoSession
        roomName={sessionInfo.roomName}
        displayName={user?.firstName || user?.email || "Kullanıcı"}
        appointmentId={appointment.id}
        startTime={new Date(appointment.startAt)}
        endTime={new Date(appointment.endAt)}
        onLeave={() => leaveMutation.mutate()}
      />
    );
  }

  return (
    <VideoSessionPreJoin
      onJoin={() => joinMutation.mutate()}
      isLoading={joinMutation.isPending}
      appointmentInfo={{
        psychologistName: appointment.psychologist?.fullName || "Psikolog",
        startTime: new Date(appointment.startAt),
        endTime: new Date(appointment.endAt),
      }}
    />
  );
}
