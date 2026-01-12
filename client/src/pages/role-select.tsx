import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Brain, User, Stethoscope, ArrowRight } from "lucide-react";

export default function RoleSelect() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<"patient" | "psychologist" | null>(null);

  const selectRoleMutation = useMutation({
    mutationFn: async (role: "patient" | "psychologist") => {
      return apiRequest("POST", "/api/auth/select-role", { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      window.location.href = "/dashboard";
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Rol seçimi başarısız oldu",
        variant: "destructive",
      });
    },
  });

  const handleContinue = () => {
    if (selectedRole) {
      selectRoleMutation.mutate(selectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-serif text-xl font-semibold">MindWell</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="font-serif text-3xl font-bold">Hoş Geldiniz!</h1>
            <p className="text-muted-foreground">
              Platformu nasıl kullanmak istediğinizi seçin
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className={`border-2 cursor-pointer transition-all hover-elevate ${
                selectedRole === "patient" 
                  ? "border-primary bg-primary/5" 
                  : "border-card-border"
              }`}
              onClick={() => setSelectedRole("patient")}
              data-testid="card-patient"
            >
              <CardContent className="p-8 text-center space-y-4">
                <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center ${
                  selectedRole === "patient" ? "bg-primary" : "bg-muted"
                }`}>
                  <User className={`w-10 h-10 ${
                    selectedRole === "patient" ? "text-primary-foreground" : "text-muted-foreground"
                  }`} />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold mb-2">Hasta / Danışan</h3>
                  <p className="text-sm text-muted-foreground">
                    Psikolog bulun, randevu alın ve online görüşmeler yapın
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`border-2 cursor-pointer transition-all hover-elevate ${
                selectedRole === "psychologist" 
                  ? "border-primary bg-primary/5" 
                  : "border-card-border"
              }`}
              onClick={() => setSelectedRole("psychologist")}
              data-testid="card-psychologist"
            >
              <CardContent className="p-8 text-center space-y-4">
                <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center ${
                  selectedRole === "psychologist" ? "bg-primary" : "bg-muted"
                }`}>
                  <Stethoscope className={`w-10 h-10 ${
                    selectedRole === "psychologist" ? "text-primary-foreground" : "text-muted-foreground"
                  }`} />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold mb-2">Psikolog</h3>
                  <p className="text-sm text-muted-foreground">
                    Danışanlarınızla online seanslar yapın ve kazanç elde edin
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button 
              size="lg" 
              className="px-12"
              disabled={!selectedRole || selectRoleMutation.isPending}
              onClick={handleContinue}
              data-testid="button-continue"
            >
              {selectRoleMutation.isPending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
              ) : (
                <>
                  Devam Et
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
