import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useWebRTC, ConnectionState } from "@/hooks/use-webrtc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Loader2,
  AlertCircle,
  User,
  Phone,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

// Connection state messages in Turkish
const CONNECTION_STATE_MESSAGES: Record<ConnectionState, string> = {
  idle: "Bağlantı bekleniyor...",
  connecting: "Bağlanıyor...",
  connected: "Bağlandı",
  disconnected: "Bağlantı koptu",
  failed: "Bağlantı başarısız",
  no_turn_fallback: "TURN sunucusu gerekli",
};

export default function VideoCallPage() {
  const params = useParams<{ appointmentId: string }>();
  const [, navigate] = useLocation();
  useAuth(); // Ensure user is authenticated
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const appointmentId = params.appointmentId;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"waiting" | "active" | "ending" | "ended">("waiting");
  const [showEndCallDialog, setShowEndCallDialog] = useState(false);
  const [showCompleteSessionDialog, setShowCompleteSessionDialog] = useState(false);

  // Fetch appointment details
  const { data: appointment, isLoading: appointmentLoading } = useQuery({
    queryKey: ["/api/appointments", appointmentId],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/${appointmentId}`);
      if (!res.ok) throw new Error("Randevu bulunamadı");
      return res.json();
    },
    enabled: !!appointmentId,
  });

  // Fetch user profile to check role
  const { data: profile } = useQuery<{ id: string; userId: string; role: string } | null>({
    queryKey: ["/api/profile"],
  });

  const isPsychologist = profile?.role === "psychologist";

  // Fetch psychologist profile if user is a psychologist (needed for correct userId in WebRTC)
  const { data: psychologistProfile } = useQuery<{ id: string } | null>({
    queryKey: ["/api/psychologist/profile"],
    enabled: isPsychologist,
  });

  // Determine the correct userId for WebRTC signaling
  // - For patients: use profile.userId (session userId matches appointment.patientId)
  // - For psychologists: use psychologistProfile.id (psychologistProfiles.id matches appointment.psychologistId)
  const webrtcUserId = isPsychologist
    ? psychologistProfile?.id
    : profile?.userId;

  // Mutation to complete the session
  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/appointments/${appointmentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Seans tamamlanamadı");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Seans Tamamlandı",
        description: data.earning
          ? `Kazancınız kaydedildi: ${Number(data.earning.amount).toFixed(2)} ${data.earning.currency}`
          : "Seans başarıyla tamamlandı.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/psychologist/earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/psychologist/stats"] });
      navigate("/dashboard/appointments");
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // WebRTC hook
  const {
    localStream,
    remoteStream,
    connectionState,
    isMicOn,
    isCameraOn,
    toggleMic,
    toggleCamera,
    startCall,
    endCall,
    error,
  } = useWebRTC({
    roomId: appointmentId || "test-room",
    userId: webrtcUserId || "anonymous",
    role: isPsychologist ? "psychologist" : "patient",
  });

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Session timer - calculates remaining time based on appointment.endAt
  useEffect(() => {
    if (!appointment || !isCallStarted) return;

    const updateTimer = () => {
      const now = new Date();
      const startAt = new Date(appointment.startAt);
      const endAt = new Date(appointment.endAt);

      // Calculate remaining seconds until session ends
      const remainingSeconds = Math.floor((endAt.getTime() - now.getTime()) / 1000);

      // Determine session status
      if (now < startAt) {
        setSessionStatus("waiting");
        setRemainingTime(Math.floor((endAt.getTime() - startAt.getTime()) / 1000)); // Full duration
      } else if (remainingSeconds <= 0) {
        setSessionStatus("ended");
        setRemainingTime(0);
      } else if (remainingSeconds <= 300) { // Last 5 minutes
        setSessionStatus("ending");
        setRemainingTime(remainingSeconds);
      } else {
        setSessionStatus("active");
        setRemainingTime(remainingSeconds);
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [appointment, isCallStarted]);

  // Auto-complete session when time is up (only for psychologist)
  useEffect(() => {
    if (
      sessionStatus === "ended" &&
      isPsychologist &&
      isCallStarted &&
      !completeSessionMutation.isPending &&
      !completeSessionMutation.isSuccess
    ) {
      // Auto-complete the session after a short delay
      const timeout = setTimeout(() => {
        toast({
          title: "Seans Süresi Doldu",
          description: "Seans otomatik olarak tamamlanıyor...",
        });
        completeSessionMutation.mutate();
      }, 2000); // 2 second delay before auto-completing

      return () => clearTimeout(timeout);
    }
  }, [sessionStatus, isPsychologist, isCallStarted, completeSessionMutation, toast]);

  // Auto-end call for patient when session ends
  useEffect(() => {
    if (
      sessionStatus === "ended" &&
      !isPsychologist &&
      isCallStarted
    ) {
      // Give patient 10 seconds to see the "session ended" message, then redirect
      const timeout = setTimeout(() => {
        toast({
          title: "Seans Tamamlandı",
          description: "Görüşme sona erdi. Randevular sayfasına yönlendiriliyorsunuz.",
        });
        endCall();
        setIsCallStarted(false);
        navigate("/dashboard/appointments");
      }, 10000); // 10 second delay for patient

      return () => clearTimeout(timeout);
    }
  }, [sessionStatus, isPsychologist, isCallStarted, toast, endCall, navigate]);

  // Format remaining time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle call start
  const handleStartCall = async () => {
    setIsCallStarted(true);
    await startCall();
  };

  // Handle call end
  const handleEndCall = () => {
    endCall();
    setIsCallStarted(false);
    // Navigate back to dashboard
    navigate("/dashboard/appointments");
  };

  // Loading state
  if (appointmentLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Error state - appointment not found
  if (!appointment && !appointmentLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Randevu Bulunamadı</h2>
            <p className="text-gray-600 mb-4">
              Bu randevu mevcut değil veya erişim izniniz yok.
            </p>
            <Button onClick={() => navigate("/dashboard/appointments")}>
              Randevulara Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-call screen
  if (!isCallStarted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Görüntülü Görüşme</h1>
              <p className="text-gray-600">
                Görüşmeye başlamak için aşağıdaki butona tıklayın
              </p>
            </div>

            {appointment && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium mb-2">Randevu Bilgileri</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Oda ID:</span> {appointmentId}
                  </p>
                  <p>
                    <span className="font-medium">Durum:</span>{" "}
                    {appointment.status}
                  </p>
                  {/* TODO: appointment.status === 'confirmed' değilse butonu disable yap */}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                className="w-full h-12 text-lg"
                onClick={handleStartCall}
              >
                <Phone className="w-5 h-5 mr-2" />
                Görüşmeye Katıl
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/dashboard/appointments")}
              >
                İptal
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Görüşmeye katılmadan önce kamera ve mikrofon izinlerini verin
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // In-call screen
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Connection status bar */}
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionState === "connected"
                ? "bg-green-500"
                : connectionState === "connecting"
                ? "bg-yellow-500 animate-pulse"
                : "bg-red-500"
            }`}
          />
          <span className="text-white text-sm">
            {CONNECTION_STATE_MESSAGES[connectionState]}
          </span>
        </div>

        {/* Session Timer */}
        {remainingTime !== null && (
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              sessionStatus === "ended"
                ? "bg-red-600 text-white"
                : sessionStatus === "ending"
                ? "bg-yellow-500 text-black animate-pulse"
                : "bg-gray-700 text-white"
            }`}
          >
            {sessionStatus === "ending" ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            <span className="font-mono font-medium">
              {sessionStatus === "ended"
                ? "Süre Doldu"
                : formatTime(remainingTime)}
            </span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Session ending warning */}
      {sessionStatus === "ending" && remainingTime !== null && remainingTime > 0 && (
        <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-200 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Seans süresi dolmak üzere! Kalan süre: {formatTime(remainingTime)}</span>
        </div>
      )}

      {/* Session ended warning */}
      {sessionStatus === "ended" && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Seans süresi doldu. Lütfen görüşmeyi sonlandırın.</span>
        </div>
      )}

      {/* Video area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {/* Video container - fixed aspect ratio 16:9 landscape */}
        <div className="relative w-full max-w-[800px]" style={{ aspectRatio: '16/9' }}>
          {/* Remote video (main video) */}
          <div className="w-full h-full bg-gray-800 rounded-lg overflow-hidden relative">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <User className="w-24 h-24 mx-auto mb-4 opacity-50" />
                  <p>Karşı taraf bekleniyor...</p>
                  <p className="text-sm mt-2">
                    Diğer katılımcı odaya katıldığında görüntü burada görünecek
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Local video (picture-in-picture) */}
          <div className="absolute bottom-4 right-4 w-32 h-24 sm:w-48 sm:h-36 bg-gray-700 rounded-lg overflow-hidden shadow-lg border-2 border-gray-600">
            {localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-8 h-8 sm:w-12 sm:h-12 text-gray-500" />
              </div>
            )}
            {!isCameraOn && localStream && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-4 py-6">
        <div className="flex items-center justify-center gap-4">
          {/* Mic toggle */}
          <Button
            variant={isMicOn ? "secondary" : "destructive"}
            size="lg"
            className="w-14 h-14 rounded-full"
            onClick={toggleMic}
          >
            {isMicOn ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </Button>

          {/* Camera toggle */}
          <Button
            variant={isCameraOn ? "secondary" : "destructive"}
            size="lg"
            className="w-14 h-14 rounded-full"
            onClick={toggleCamera}
          >
            {isCameraOn ? (
              <Video className="w-6 h-6" />
            ) : (
              <VideoOff className="w-6 h-6" />
            )}
          </Button>

          {/* Complete session - only for psychologist */}
          {isPsychologist && (
            <Button
              variant="default"
              size="lg"
              className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700"
              onClick={() => setShowCompleteSessionDialog(true)}
              disabled={completeSessionMutation.isPending || completeSessionMutation.isSuccess || appointment?.status === 'completed'}
            >
              {completeSessionMutation.isPending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : completeSessionMutation.isSuccess || appointment?.status === 'completed' ? (
                <CheckCircle2 className="w-6 h-6 text-green-200" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </Button>
          )}

          {/* End call */}
          <Button
            variant="destructive"
            size="lg"
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700"
            onClick={() => setShowEndCallDialog(true)}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>

        <p className="text-gray-400 text-xs text-center mt-4">
          {isPsychologist
            ? "Yeşil buton: Seansı tamamla ve kazancı kaydet • Kırmızı buton: Görüşmeden çık"
            : "Görüşmeyi sonlandırmak için kırmızı butona tıklayın"}
        </p>
      </div>

      {/* End Call Confirmation Dialog */}
      <AlertDialog open={showEndCallDialog} onOpenChange={setShowEndCallDialog}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto rounded-lg sm:rounded-lg">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-lg sm:text-xl">
              Aramayı Sonlandır
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Aramayı sonlandırmak istediğinize emin misiniz?
              {isPsychologist && (
                <span className="block mt-2 text-yellow-600 dark:text-yellow-500 font-medium">
                  Seansı tamamlamadan ayrılırsanız kazanç kaydedilmez.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndCall}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              Evet, Sonlandır
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Session Confirmation Dialog - only for psychologist */}
      <AlertDialog open={showCompleteSessionDialog} onOpenChange={setShowCompleteSessionDialog}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto rounded-lg sm:rounded-lg">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-lg sm:text-xl">
              Seansı Tamamla
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Seansı tamamlamak istediğinize emin misiniz?
              <span className="block mt-2">
                Bu işlem kazancınızı kaydedecek ve görüşmeyi sonlandıracaktır.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCompleteSessionDialog(false);
                completeSessionMutation.mutate();
              }}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              Evet, Tamamla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
