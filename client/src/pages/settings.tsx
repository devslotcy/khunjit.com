import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UserProfile } from "@shared/schema";
import { Bell, Lock, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_UI_LANGUAGES } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useState } from "react";
import * as React from "react";
import { TwoFactorSetup } from "@/components/two-factor-setup";
import { ChangePasswordDialog } from "@/components/change-password-dialog";

export default function SettingsPage() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [showLanguageConfirm, setShowLanguageConfirm] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const role = (profile?.role || "patient") as "patient" | "psychologist" | "admin";

  // Notification preferences state
  const [notifyAppointmentReminders, setNotifyAppointmentReminders] = useState(profile?.notifyAppointmentReminders ?? true);
  const [notifyMessages, setNotifyMessages] = useState(profile?.notifyMessages ?? true);
  const [notifyNewAppointments, setNotifyNewAppointments] = useState(profile?.notifyNewAppointments ?? true);

  // Update state when profile loads
  React.useEffect(() => {
    if (profile) {
      setNotifyAppointmentReminders(profile.notifyAppointmentReminders ?? true);
      setNotifyMessages(profile.notifyMessages ?? true);
      setNotifyNewAppointments(profile.notifyNewAppointments ?? true);
    }
  }, [profile]);

  const handleLanguageChangeRequest = (languageCode: string) => {
    // If same language, do nothing
    if (languageCode === i18n.language) {
      return;
    }

    // Show confirmation dialog
    setPendingLanguage(languageCode);
    setShowLanguageConfirm(true);
  };

  const confirmLanguageChange = () => {
    if (pendingLanguage) {
      i18n.changeLanguage(pendingLanguage);
      // Save to both localStorage and sessionStorage for persistence across logout
      localStorage.setItem('mendly_ui_language', pendingLanguage);
      sessionStorage.setItem('mendly_ui_language_backup', pendingLanguage);
      toast({
        title: t('settings.languageChanged'),
        description: t('settings.languageChangedDesc'),
      });
    }
    setShowLanguageConfirm(false);
    setPendingLanguage(null);
  };

  const cancelLanguageChange = () => {
    setShowLanguageConfirm(false);
    setPendingLanguage(null);
  };

  // Update notification preferences mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: { notifyAppointmentReminders: boolean; notifyMessages: boolean; notifyNewAppointments: boolean }) => {
      const response = await apiRequest("PATCH", "/api/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: t('settings.savedTitle'),
        description: t('settings.notificationsSaved'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('settings.saveError'),
        variant: "destructive",
      });
    },
  });

  const handleNotificationToggle = (type: 'appointmentReminders' | 'messages' | 'newAppointments', value: boolean) => {
    const updates = {
      notifyAppointmentReminders,
      notifyMessages,
      notifyNewAppointments
    };

    switch (type) {
      case 'appointmentReminders':
        setNotifyAppointmentReminders(value);
        updates.notifyAppointmentReminders = value;
        break;
      case 'messages':
        setNotifyMessages(value);
        updates.notifyMessages = value;
        break;
      case 'newAppointments':
        setNotifyNewAppointments(value);
        updates.notifyNewAppointments = value;
        break;
    }

    // Auto-save on toggle
    updateNotificationsMutation.mutate(updates);
  };

  return (
    <DashboardLayout role={role}>
      <AlertDialog open={showLanguageConfirm} onOpenChange={setShowLanguageConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.confirmLanguageChange')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.confirmLanguageChangeDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLanguageChange}>
              {t('common.no')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmLanguageChange}>
              {t('common.yes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('settings.subtitle')}
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-primary" />
                <CardTitle>{t('settings.language')}</CardTitle>
              </div>
              <CardDescription>
                {t('settings.languageDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>{t('settings.selectLanguage')}</Label>
                <Select value={i18n.language} onValueChange={handleLanguageChangeRequest}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('settings.selectLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_UI_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.nativeName}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle>{t('settings.notifications')}</CardTitle>
              </div>
              <CardDescription>
                {t('settings.notificationsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.appointmentReminders')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.appointmentRemindersDesc')}
                  </p>
                </div>
                <Switch
                  checked={notifyAppointmentReminders}
                  onCheckedChange={(checked) => handleNotificationToggle('appointmentReminders', checked)}
                  disabled={updateNotificationsMutation.isPending}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.messageNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.messageNotificationsDesc')}
                  </p>
                </div>
                <Switch
                  checked={notifyMessages}
                  onCheckedChange={(checked) => handleNotificationToggle('messages', checked)}
                  disabled={updateNotificationsMutation.isPending}
                />
              </div>
              {role === "psychologist" && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('settings.newAppointmentRequests')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.newAppointmentRequestsDesc')}
                      </p>
                    </div>
                    <Switch
                      checked={notifyNewAppointments}
                      onCheckedChange={(checked) => handleNotificationToggle('newAppointments', checked)}
                      disabled={updateNotificationsMutation.isPending}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <CardTitle>{t('settings.security')}</CardTitle>
              </div>
              <CardDescription>
                {t('settings.securityDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TwoFactorSetup />
              <Separator />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowChangePassword(true)}
              >
                {t('settings.changePassword')}
              </Button>
            </CardContent>
          </Card>

          <ChangePasswordDialog
            open={showChangePassword}
            onOpenChange={setShowChangePassword}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
