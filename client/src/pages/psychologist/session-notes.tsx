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
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { FileText, Edit, Save, Plus, Lock, Unlock, ChevronDown, ChevronUp } from "lucide-react";
import type { Appointment } from "@shared/schema";

export default function PsychologistSessionNotes() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

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
    onSuccess: (_, variables) => {
      toast({ title: t("sessionNotes.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setSelectedAppointment(null);
      setNoteContent("");
      setIsDialogOpen(false);
      setEditingNoteId(null);
      // Auto-expand the newly created note
      setExpandedNotes(prev => new Set(prev).add(variables.appointmentId));
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("sessionNotes.saveError"),
        variant: "destructive"
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async (data: { id: string; content: string; isPrivate: boolean; appointmentId?: string }) => {
      const res = await apiRequest("PATCH", `/api/session-notes/${data.id}`, {
        content: data.content,
        isPrivate: data.isPrivate
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({ title: t("sessionNotes.updateSuccess") });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setEditingNoteId(null);
      setNoteContent("");
      setIsDialogOpen(false);
      setSelectedAppointment(null);
      // Auto-expand the updated note if appointmentId is provided
      if (variables.appointmentId) {
        setExpandedNotes(prev => new Set(prev).add(variables.appointmentId!));
      }
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("sessionNotes.saveError"),
        variant: "destructive"
      });
    },
  });

  const toggleNoteExpansion = (appointmentId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appointmentId)) {
        newSet.delete(appointmentId);
      } else {
        newSet.add(appointmentId);
      }
      return newSet;
    });
  };

  const handleSaveNote = () => {
    if (!noteContent.trim()) {
      toast({ title: t("sessionNotes.emptyNote"), variant: "destructive" });
      return;
    }

    if (editingNoteId && selectedAppointment) {
      updateNoteMutation.mutate({
        id: editingNoteId,
        content: noteContent,
        isPrivate,
        appointmentId: selectedAppointment.id,
      });
    } else if (selectedAppointment) {
      // Check if a note already exists for this appointment
      const existingNote = (selectedAppointment as any).sessionNote;

      if (existingNote) {
        // Update existing note instead of creating a new one
        updateNoteMutation.mutate({
          id: existingNote.id,
          content: noteContent,
          isPrivate,
          appointmentId: selectedAppointment.id,
        });
      } else {
        // Create new note
        createNoteMutation.mutate({
          appointmentId: selectedAppointment.id,
          content: noteContent,
          isPrivate,
        });
      }
    }
  };

  return (
    <DashboardLayout role="psychologist">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold">{t("sessionNotes.title")}</h1>
          <p className="text-muted-foreground">{t("sessionNotes.description")}</p>
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
              <p className="text-muted-foreground">{t("sessionNotes.noCompletedSessions")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {completedAppointments.map((appointment) => (
              <Card key={appointment.id} data-testid={`card-session-${appointment.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {(appointment as any).patientName || "Danışan"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(appointment.startAt), "d MMMM yyyy, HH:mm", { locale: enUS })}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        Durum: {appointment.status === "completed" ? "Tamamlandı" : "Devam Ediyor"}
                      </p>
                    </div>
                    <Badge variant={(appointment as any).sessionNote ? "default" : "outline"}>
                      {(appointment as any).sessionNote ? t("sessionNotes.noteExists") : t("sessionNotes.noNote")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {(appointment as any).sessionNote ? (
                    <div className="space-y-3">
                      <div
                        className="p-4 rounded-lg bg-gradient-to-br from-muted/30 to-muted/50 border border-muted cursor-pointer transition-all hover:shadow-md"
                        onClick={() => toggleNoteExpansion(appointment.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                              <span className="text-sm font-medium">{t("sessionNotes.noteContent")}</span>
                              {(appointment as any).sessionNote.isPrivate && (
                                <Lock className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                            <div
                              className={`text-sm whitespace-pre-wrap transition-all duration-300 ease-in-out overflow-hidden ${
                                expandedNotes.has(appointment.id)
                                  ? 'max-h-[2000px] opacity-100'
                                  : 'max-h-[60px] opacity-75 line-clamp-2'
                              }`}
                            >
                              {(appointment as any).sessionNote.content || (appointment as any).sessionNote.notes}
                            </div>
                          </div>
                          <button
                            className="p-1 rounded-full hover:bg-muted/50 transition-colors flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleNoteExpansion(appointment.id);
                            }}
                          >
                            {expandedNotes.has(appointment.id) ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Dialog open={isDialogOpen && editingNoteId === (appointment as any).sessionNote?.id} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const note = (appointment as any).sessionNote;
                              setSelectedAppointment(appointment);
                              setNoteContent(note?.content || note?.notes || "");
                              setIsPrivate(note?.isPrivate ?? true);
                              setEditingNoteId(note?.id);
                              setIsDialogOpen(true);
                            }}
                            data-testid={`button-edit-note-${appointment.id}`}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {t("sessionNotes.editNote")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("sessionNotes.editNote")}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea
                              value={noteContent}
                              onChange={(e) => setNoteContent(e.target.value)}
                              placeholder={t("sessionNotes.notePlaceholder")}
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
                                  {isPrivate ? t("sessionNotes.private") : t("sessionNotes.sharedWithClient")}
                                </Label>
                              </div>
                              <Button 
                                onClick={handleSaveNote}
                                disabled={updateNoteMutation.isPending}
                                data-testid="button-save-note"
                              >
                                <Save className="w-4 h-4 mr-2" />
                                {t("sessionNotes.saveNote")}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ) : (
                    <Dialog open={isDialogOpen && selectedAppointment?.id === appointment.id} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setNoteContent("");
                            setEditingNoteId(null);
                            setIsPrivate(true);
                            setIsDialogOpen(true);
                          }}
                          data-testid={`button-add-note-${appointment.id}`}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t("sessionNotes.addNote")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("sessionNotes.createNote")}</DialogTitle>
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
                                {isPrivate ? "Gizli" : "Danışan ile paylaşılır"}
                              </Label>
                            </div>
                            <Button 
                              onClick={handleSaveNote}
                              disabled={createNoteMutation.isPending}
                              data-testid="button-create-note"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              {t("sessionNotes.createNote")}
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
