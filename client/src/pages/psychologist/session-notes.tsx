import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { FileText, Edit, Save, Plus, Lock, Unlock } from "lucide-react";
import type { Appointment, SessionNote } from "@shared/schema";

interface AppointmentWithNote extends Appointment {
  sessionNote?: SessionNote | null;
}

export default function PsychologistSessionNotes() {
  const { toast } = useToast();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const completedAppointments = appointments?.filter(apt => 
    ["completed", "in_session"].includes(apt.status)
  ) || [];

  const createNoteMutation = useMutation({
    mutationFn: async (data: { appointmentId: string; content: string; isPrivate: boolean }) => {
      const res = await apiRequest("POST", "/api/session-notes", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Not oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setSelectedAppointment(null);
      setNoteContent("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Not oluşturulamadı",
        variant: "destructive" 
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async (data: { id: string; content: string; isPrivate: boolean }) => {
      const res = await apiRequest("PATCH", `/api/session-notes/${data.id}`, { 
        content: data.content, 
        isPrivate: data.isPrivate 
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Not güncellendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setEditingNoteId(null);
      setNoteContent("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Not güncellenemedi",
        variant: "destructive" 
      });
    },
  });

  const handleSaveNote = () => {
    if (!noteContent.trim()) {
      toast({ title: "Not içeriği boş olamaz", variant: "destructive" });
      return;
    }

    if (editingNoteId) {
      updateNoteMutation.mutate({
        id: editingNoteId,
        content: noteContent,
        isPrivate,
      });
    } else if (selectedAppointment) {
      createNoteMutation.mutate({
        appointmentId: selectedAppointment.id,
        content: noteContent,
        isPrivate,
      });
    }
  };

  return (
    <DashboardLayout role="psychologist">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold">Seans Notları</h1>
          <p className="text-muted-foreground">Seanslarınız için notlar oluşturun ve düzenleyin</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : completedAppointments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Henüz tamamlanmış seansınız bulunmuyor</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {completedAppointments.map((appointment) => (
              <Card key={appointment.id} data-testid={`card-session-${appointment.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">
                        {format(new Date(appointment.startAt), "d MMMM yyyy, HH:mm", { locale: tr })}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground capitalize mt-1">
                        Durum: {appointment.status === "completed" ? "Tamamlandı" : "Devam Ediyor"}
                      </p>
                    </div>
                    <Badge variant={appointment.notes ? "default" : "outline"}>
                      {appointment.notes ? "Not Var" : "Not Yok"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {appointment.notes ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-sm whitespace-pre-wrap">{appointment.notes}</p>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setNoteContent(appointment.notes || "");
                              setEditingNoteId(appointment.id);
                            }}
                            data-testid={`button-edit-note-${appointment.id}`}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Düzenle
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Notu Düzenle</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea
                              value={noteContent}
                              onChange={(e) => setNoteContent(e.target.value)}
                              placeholder="Seans notlarınızı yazın..."
                              className="min-h-[200px]"
                              data-testid="input-note-content"
                            />
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="private-mode"
                                  checked={isPrivate}
                                  onCheckedChange={setIsPrivate}
                                />
                                <Label htmlFor="private-mode" className="flex items-center gap-2">
                                  {isPrivate ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                  {isPrivate ? "Gizli" : "Hasta ile paylaşılır"}
                                </Label>
                              </div>
                              <Button 
                                onClick={handleSaveNote}
                                disabled={updateNoteMutation.isPending}
                                data-testid="button-save-note"
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Kaydet
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setNoteContent("");
                            setEditingNoteId(null);
                          }}
                          data-testid={`button-add-note-${appointment.id}`}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Not Ekle
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Yeni Not Oluştur</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Seans notlarınızı yazın..."
                            className="min-h-[200px]"
                            data-testid="input-note-content"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="private-mode-new"
                                checked={isPrivate}
                                onCheckedChange={setIsPrivate}
                              />
                              <Label htmlFor="private-mode-new" className="flex items-center gap-2">
                                {isPrivate ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                {isPrivate ? "Gizli" : "Hasta ile paylaşılır"}
                              </Label>
                            </div>
                            <Button 
                              onClick={handleSaveNote}
                              disabled={createNoteMutation.isPending}
                              data-testid="button-create-note"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Oluştur
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
