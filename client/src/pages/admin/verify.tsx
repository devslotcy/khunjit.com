import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  GraduationCap, 
  Award,
  Languages,
  Star
} from "lucide-react";
import { useState, useEffect } from "react";
import type { PsychologistProfile } from "@shared/schema";

export default function AdminVerify() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const { data: pendingPsychologists, isLoading } = useQuery<PsychologistProfile[]>({
    queryKey: ["/api/admin/psychologists/pending"],
  });

  useEffect(() => {
    console.log("[DEBUG] Pending psychologists fetched:", pendingPsychologists?.length || 0, pendingPsychologists);
  }, [pendingPsychologists]);

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await apiRequest("POST", `/api/admin/psychologists/${id}/approve`, { notes });
      const data = await response.json();
      console.log("[DEBUG] Approve response:", data);

      // Validate the response
      if (!data.ok || !data.updatedProfile) {
        throw new Error("Invalid response from server");
      }

      if (!data.updatedProfile.verified ||
          data.updatedProfile.verificationStatus !== "approved" ||
          data.updatedProfile.status !== "active") {
        throw new Error("Database update failed - profile not properly approved");
      }

      return data;
    },
    onMutate: async ({ id }) => {
      console.log("[DEBUG] Approve onMutate - removing ID:", id);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/admin/psychologists/pending"] });

      // Snapshot previous value
      const previousPending = queryClient.getQueryData<PsychologistProfile[]>(["/api/admin/psychologists/pending"]);
      console.log("[DEBUG] Previous pending count:", previousPending?.length || 0);

      // Optimistically update UI - remove the card immediately
      queryClient.setQueryData<PsychologistProfile[]>(
        ["/api/admin/psychologists/pending"],
        (old) => {
          const filtered = old?.filter((p) => {
            console.log("[DEBUG] Comparing:", p.id, "!==", id, "=>", p.id !== id);
            return p.id !== id;
          }) || [];
          console.log("[DEBUG] After filter count:", filtered.length);
          return filtered;
        }
      );

      return { previousPending };
    },
    onSuccess: () => {
      console.log("[DEBUG] Approve successful - invalidating queries");
      toast({
        title: "Onaylandı",
        description: "Psikolog başarıyla doğrulandı ve danışan listesinde görünür olacak",
      });
      // Invalidate to sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/admin/psychologists/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/psychologists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/psychologist/profile"] }); // For psychologist dashboard banner
      setSelectedId(null);
      setNotes("");
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousPending) {
        queryClient.setQueryData(["/api/admin/psychologists/pending"], context.previousPending);
      }
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/admin/psychologists/${id}/reject`, { reason });
      const data = await response.json();
      console.log("[DEBUG] Reject response:", data);

      // Validate the response
      if (!data.ok || !data.updatedProfile) {
        throw new Error("Invalid response from server");
      }

      if (data.updatedProfile.verified !== false ||
          data.updatedProfile.verificationStatus !== "rejected" ||
          data.updatedProfile.status !== "rejected") {
        throw new Error("Database update failed - profile not properly rejected");
      }

      return data;
    },
    onMutate: async ({ id }) => {
      console.log("[DEBUG] Reject onMutate - removing ID:", id);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/admin/psychologists/pending"] });

      // Snapshot previous value
      const previousPending = queryClient.getQueryData<PsychologistProfile[]>(["/api/admin/psychologists/pending"]);
      console.log("[DEBUG] Previous pending count:", previousPending?.length || 0);

      // Optimistically update UI - remove the card immediately
      queryClient.setQueryData<PsychologistProfile[]>(
        ["/api/admin/psychologists/pending"],
        (old) => {
          const filtered = old?.filter((p) => {
            console.log("[DEBUG] Comparing:", p.id, "!==", id, "=>", p.id !== id);
            return p.id !== id;
          }) || [];
          console.log("[DEBUG] After filter count:", filtered.length);
          return filtered;
        }
      );

      return { previousPending };
    },
    onSuccess: () => {
      toast({
        title: "Reddedildi",
        description: "Psikolog başvurusu reddedildi",
        variant: "destructive",
      });
      // Invalidate to sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/admin/psychologists/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/psychologist/profile"] }); // For psychologist dashboard banner
      setSelectedId(null);
      setNotes("");
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousPending) {
        queryClient.setQueryData(["/api/admin/psychologists/pending"], context.previousPending);
      }
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const formatPrice = (price: string | null) => {
    if (!price) return "Belirtilmemiş";
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(parseFloat(price));
  };

  if (isLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid gap-6">
            {[1, 2].map((i) => (
              <Card key={i} className="border-card-border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    <Skeleton className="w-20 h-20 rounded-xl" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-2">Psikolog Doğrulama</h1>
          <p className="text-muted-foreground">
            Onay bekleyen psikolog başvurularını inceleyin
          </p>
        </div>

        {pendingPsychologists && pendingPsychologists.length > 0 ? (
          <div className="grid gap-6">
            {pendingPsychologists.map((psychologist) => (
              <Card key={psychologist.id} className="border-card-border">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="w-20 h-20 rounded-xl">
                        <AvatarImage src={psychologist.profileImageUrl || undefined} />
                        <AvatarFallback className="rounded-xl text-xl">
                          {psychologist.fullName?.split(' ').map(n => n[0]).join('') || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-xl font-semibold">
                              {psychologist.fullName}
                            </h3>
                            <Badge variant="outline" className="gap-1">
                              <Clock className="w-3 h-3" />
                              Beklemede
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            {psychologist.title ? t(`titles.${psychologist.title}`, psychologist.title) : t("titles.clinicalPsychologist")}
                          </p>
                        </div>

                        {psychologist.bio && (
                          <p className="text-sm text-muted-foreground">
                            {psychologist.bio}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm">
                          {psychologist.yearsOfExperience && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-primary" />
                              <span>{psychologist.yearsOfExperience} yıl deneyim</span>
                            </div>
                          )}
                          {psychologist.languages && psychologist.languages.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Languages className="w-4 h-4 text-muted-foreground" />
                              <span>{psychologist.languages.join(", ")}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{formatPrice(psychologist.pricePerSession)}</span>
                            <span className="text-muted-foreground">/ seans</span>
                          </div>
                        </div>

                        {psychologist.specialties && psychologist.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {psychologist.specialties.map((specialty, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {psychologist.education && (
                          <div className="flex items-start gap-2 text-sm">
                            <GraduationCap className="w-4 h-4 text-primary mt-0.5" />
                            <span>{psychologist.education}</span>
                          </div>
                        )}

                        {psychologist.certifications && psychologist.certifications.length > 0 && (
                          <div className="flex items-start gap-2 text-sm">
                            <Award className="w-4 h-4 text-primary mt-0.5" />
                            <span>{psychologist.certifications.join(", ")}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:w-80 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Doğrulama Notu (opsiyonel)
                        </label>
                        <Textarea
                          placeholder="İnceleme notları..."
                          value={selectedId === psychologist.id ? notes : ""}
                          onChange={(e) => {
                            setSelectedId(psychologist.id);
                            setNotes(e.target.value);
                          }}
                          className="min-h-[80px]"
                          data-testid={`notes-${psychologist.id}`}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 gap-2"
                          onClick={() => approveMutation.mutate({
                            id: psychologist.id,
                            notes: selectedId === psychologist.id ? notes : ""
                          })}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          data-testid={`approve-${psychologist.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Onayla
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1 gap-2"
                          onClick={() => {
                            const reason = selectedId === psychologist.id && notes
                              ? notes
                              : "Admin tarafından reddedildi";
                            rejectMutation.mutate({
                              id: psychologist.id,
                              reason
                            });
                          }}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          data-testid={`reject-${psychologist.id}`}
                        >
                          <XCircle className="w-4 h-4" />
                          Reddet
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-card-border">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Tüm başvurular incelendi</h3>
              <p className="text-muted-foreground">
                Şu an bekleyen psikolog başvurusu bulunmuyor
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
