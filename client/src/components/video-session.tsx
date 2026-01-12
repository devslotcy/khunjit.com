import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  Settings, 
  MessageCircle,
  Maximize,
  Minimize,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface VideoSessionProps {
  roomName: string;
  displayName: string;
  appointmentId: string;
  startTime: Date;
  endTime: Date;
  onLeave: () => void;
}

export function VideoSession({
  roomName,
  displayName,
  appointmentId,
  startTime,
  endTime,
  onLeave
}: VideoSessionProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const start = new Date(startTime);
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      setElapsed(Math.max(0, diff));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const jitsiDomain = "meet.jit.si";
  const jitsiUrl = `https://${jitsiDomain}/${roomName}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.prejoinPageEnabled=false&config.disableDeepLinking=true`;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          <span className="font-medium">Seans Devam Ediyor</span>
          <span className="text-muted-foreground">
            {formatElapsed(elapsed)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {format(startTime, "HH:mm", { locale: tr })} - {format(endTime, "HH:mm", { locale: tr })}
          </span>
        </div>
      </header>

      <div className="flex-1 relative bg-black">
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          data-testid="video-iframe"
        />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={() => setIsMuted(!isMuted)}
            data-testid="button-toggle-mute"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            variant={isVideoOff ? "destructive" : "secondary"}
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={() => setIsVideoOff(!isVideoOff)}
            data-testid="button-toggle-video"
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={onLeave}
            data-testid="button-end-call"
          >
            <Phone className="w-6 h-6 rotate-[135deg]" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={() => setShowChat(!showChat)}
            data-testid="button-toggle-chat"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={toggleFullscreen}
            data-testid="button-fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 text-white bg-black/50 hover:bg-black/70"
          onClick={onLeave}
          data-testid="button-exit"
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          Acil Çıkış
        </Button>
      </div>
    </div>
  );
}

export function VideoSessionPreJoin({
  onJoin,
  isLoading,
  appointmentInfo
}: {
  onJoin: () => void;
  isLoading?: boolean;
  appointmentInfo: {
    psychologistName: string;
    startTime: Date;
    endTime: Date;
  };
}) {
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => setCameraReady(true))
      .catch(() => setCameraReady(false));

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setMicReady(true))
      .catch(() => setMicReady(false));
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-card-border">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-serif text-2xl font-bold">Seansa Katıl</h1>
            <p className="text-muted-foreground">
              {appointmentInfo.psychologistName} ile görüşmeniz başlamak üzere
            </p>
          </div>

          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tarih:</span>
              <span className="font-medium">
                {format(appointmentInfo.startTime, "d MMMM yyyy", { locale: tr })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saat:</span>
              <span className="font-medium">
                {format(appointmentInfo.startTime, "HH:mm")} - {format(appointmentInfo.endTime, "HH:mm")}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">Cihaz Kontrolü</h3>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cameraReady ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                {cameraReady ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-medium">Kamera</p>
                <p className="text-xs text-muted-foreground">
                  {cameraReady ? "Hazır" : "Erişim izni gerekli"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${micReady ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                {micReady ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-medium">Mikrofon</p>
                <p className="text-xs text-muted-foreground">
                  {micReady ? "Hazır" : "Erişim izni gerekli"}
                </p>
              </div>
            </div>
          </div>

          <Button 
            className="w-full" 
            size="lg" 
            onClick={onJoin}
            disabled={isLoading}
            data-testid="button-join-session"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
            ) : (
              <>
                <Video className="w-5 h-5 mr-2" />
                Seansa Katıl
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Seansa katılarak kamera ve mikrofon kullanımına izin vermiş olursunuz
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
