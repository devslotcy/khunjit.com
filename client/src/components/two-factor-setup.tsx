import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, ShieldCheck, QrCode, Copy, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function TwoFactorSetup() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);

  // Get 2FA status
  const { data: status, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/2fa/status"],
  });

  // Setup 2FA mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/2fa/setup");
      return response.json();
    },
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setShowSetupDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('twoFactor.setupError'),
        variant: "destructive",
      });
    },
  });

  // Enable 2FA mutation
  const enableMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest("POST", "/api/2fa/enable", { token });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setShowSetupDialog(false);
      setVerificationCode("");
      setQrCode("");
      setSecret("");
      toast({
        title: t('common.success'),
        description: t('twoFactor.enableSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('twoFactor.invalidCode'),
        variant: "destructive",
      });
    },
  });

  // Disable 2FA mutation
  const disableMutation = useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const response = await apiRequest("POST", "/api/2fa/disable", { token, password });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setShowDisableDialog(false);
      setDisablePassword("");
      setDisableCode("");
      toast({
        title: t('common.success'),
        description: t('twoFactor.disableSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('twoFactor.disableError'),
        variant: "destructive",
      });
    },
  });

  const handleSetup = () => {
    setupMutation.mutate();
  };

  const handleEnable = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: t('common.error'),
        description: t('twoFactor.enter6Digit'),
        variant: "destructive",
      });
      return;
    }
    enableMutation.mutate(verificationCode);
  };

  const handleDisable = () => {
    if (!disableCode || disableCode.length !== 6 || !disablePassword) {
      toast({
        title: t('common.error'),
        description: t('twoFactor.enterPasswordAnd6Digit'),
        variant: "destructive",
      });
      return;
    }
    disableMutation.mutate({ token: disableCode, password: disablePassword });
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
    toast({
      title: t('common.success'),
      description: t('twoFactor.secretCopied'),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Label>{t('twoFactor.title')}</Label>
            {status?.enabled && (
              <ShieldCheck className="h-4 w-4 text-green-600" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t('twoFactor.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status?.enabled ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDisableDialog(true)}
            >
              {t('twoFactor.disable')}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleSetup}
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              {t('twoFactor.enable')}
            </Button>
          )}
        </div>
      </div>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {t('twoFactor.setupTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('twoFactor.scanQR')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* QR Code */}
            {qrCode && (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>

                <div className="w-full space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {t('twoFactor.cantScanQR')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={secret}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={copySecret}
                    >
                      {secretCopied ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label htmlFor="verification-code">{t('twoFactor.verificationCode')}</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="123456"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-lg tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                {t('twoFactor.enter6DigitFromApp')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSetupDialog(false);
                setVerificationCode("");
                setQrCode("");
                setSecret("");
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleEnable}
              disabled={enableMutation.isPending || verificationCode.length !== 6}
            >
              {enableMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {t('twoFactor.verifyAndEnable')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('twoFactor.disableTitle')}</DialogTitle>
            <DialogDescription>
              {t('twoFactor.disableDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">{t('twoFactor.password')}</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="disable-code">{t('twoFactor.verificationCode')}</Label>
              <Input
                id="disable-code"
                type="text"
                placeholder="123456"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-lg tracking-widest"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDisableDialog(false);
                setDisablePassword("");
                setDisableCode("");
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={disableMutation.isPending || !disablePassword || disableCode.length !== 6}
            >
              {disableMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {t('twoFactor.disable')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
