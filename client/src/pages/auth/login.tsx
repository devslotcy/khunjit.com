import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Brain, Shield } from "lucide-react";
import { Link } from "wouter";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [pendingLoginData, setPendingLoginData] = useState<any>(null);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: async (data: any) => {
      console.log("🔐 Login response:", data);

      // Check if 2FA is enabled
      if (data?.requires2FA) {
        console.log("✅ 2FA required, showing verification screen");
        setPendingLoginData(data);
        setShow2FA(true);
        toast({
          title: "2FA Gerekli",
          description: "Lütfen doğrulama kodunuzu girin",
        });
        return;
      }

      console.log("ℹ️ No 2FA required, proceeding with normal login");

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/profile"] });

      const role = data?.profile?.role || "patient";

      toast({
        title: "Giriş başarılı",
        description: "Hoş geldiniz!",
      });

      // Role-based redirection
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "psychologist") {
        navigate("/psychologist");
      } else {
        navigate("/patient");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Giriş başarısız",
        description: error.message || "Email veya şifre hatalı",
        variant: "destructive",
      });
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async (data: { email: string; token: string }) => {
      const response = await apiRequest("POST", "/api/2fa/verify", data);
      return response.json();
    },
    onSuccess: async () => {
      // After successful 2FA verification, complete the login
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/profile"] });

      const role = pendingLoginData?.profile?.role || "patient";

      toast({
        title: "Giriş başarılı",
        description: "Hoş geldiniz!",
      });

      // Role-based redirection
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "psychologist") {
        navigate("/psychologist");
      } else {
        navigate("/patient");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Doğrulama başarısız",
        description: error.message || "Geçersiz doğrulama kodu",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length === 6) {
      verify2FAMutation.mutate({ email, token: twoFactorCode });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              {show2FA ? (
                <Shield className="h-8 w-8 text-primary" />
              ) : (
                <Brain className="h-8 w-8 text-primary" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {show2FA ? "İki Faktörlü Doğrulama" : "KhunJit'e Hoş Geldiniz"}
          </CardTitle>
          <CardDescription>
            {show2FA
              ? "Google Authenticator'dan 6 haneli kodu girin"
              : "Hesabınıza giriş yapın"
            }
          </CardDescription>
        </CardHeader>

        {show2FA ? (
          <form onSubmit={handle2FASubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="2fa-code">Doğrulama Kodu</Label>
                <Input
                  id="2fa-code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-lg tracking-widest"
                  required
                  autoFocus
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full"
                disabled={verify2FAMutation.isPending || twoFactorCode.length !== 6}
              >
                {verify2FAMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Doğrula
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShow2FA(false);
                  setTwoFactorCode("");
                  setPendingLoginData(null);
                }}
              >
                Geri Dön
              </Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="input-password"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Giriş Yap
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Hesabınız yok mu?{" "}
              <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
                Kayıt Olun
              </Link>
            </p>
          </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
