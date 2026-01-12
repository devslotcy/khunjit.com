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
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  GraduationCap, 
  Award,
  Languages,
  Star
} from "lucide-react";
import { useState } from "react";
import type { PsychologistProfile } from "@shared/schema";

export default function AdminVerify() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const { data: pendingPsychologists, isLoading } = useQuery<PsychologistProfile[]>({
    queryKey: ["/api/admin/psychologists/pending"],
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, verified, notes }: { id: string; verified: boolean; notes: string }) => {
      return apiRequest("POST", `/api/admin/psychologists/${id}/verify`, { verified, notes });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.verified ? "Onaylandı" : "Reddedildi",
        description: variables.verified 
          ? "Psikolog başarıyla doğrulandı" 
          : "Psikolog başvurusu reddedildi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/psychologists/pending"] });
      setSelectedId(null);
      setNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const formatPrice = (price: string | null) => {
    if (!price) return "Belirtilmemiş";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
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
                            {psychologist.title || "Klinik Psikolog"}
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
                          onClick={() => verifyMutation.mutate({ 
                            id: psychologist.id, 
                            verified: true, 
                            notes: selectedId === psychologist.id ? notes : "" 
                          })}
                          disabled={verifyMutation.isPending}
                          data-testid={`approve-${psychologist.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Onayla
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1 gap-2"
                          onClick={() => verifyMutation.mutate({ 
                            id: psychologist.id, 
                            verified: false, 
                            notes: selectedId === psychologist.id ? notes : "" 
                          })}
                          disabled={verifyMutation.isPending}
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
