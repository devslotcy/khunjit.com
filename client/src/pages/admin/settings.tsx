import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, Bell, Mail, Database, Shield } from "lucide-react";

export default function AdminSettingsPage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Ayarlar kaydedildi",
      description: "Platform ayarları başarıyla güncellendi.",
    });
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Platform Ayarları</h1>
          <p className="text-muted-foreground mt-2">
            Sistem genelindeki ayarları buradan yönetebilirsiniz.
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle>Bildirim Ayarları</CardTitle>
              </div>
              <CardDescription>
                Sistem bildirimlerini yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Yeni kullanıcı bildirimleri</Label>
                  <p className="text-sm text-muted-foreground">
                    Yeni kullanıcı kaydı olduğunda bildir
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ödeme bildirimleri</Label>
                  <p className="text-sm text-muted-foreground">
                    Yeni ödeme işlemleri için bildir
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Şikayet bildirimleri</Label>
                  <p className="text-sm text-muted-foreground">
                    Yeni şikayet mesajları için bildir
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <CardTitle>E-posta Ayarları</CardTitle>
              </div>
              <CardDescription>
                Sistem e-posta ayarlarını yapılandırın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP Sunucusu</Label>
                <Input id="smtp-host" placeholder="smtp.example.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input id="smtp-port" placeholder="587" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-secure">Güvenlik</Label>
                  <Input id="smtp-secure" placeholder="TLS" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-user">Kullanıcı Adı</Label>
                <Input id="smtp-user" type="email" placeholder="noreply@khunjit.com" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle>Güvenlik Ayarları</CardTitle>
              </div>
              <CardDescription>
                Platform güvenlik politikalarını yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>İki faktörlü kimlik doğrulama</Label>
                  <p className="text-sm text-muted-foreground">
                    Tüm admin hesapları için zorunlu kıl
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Oturum süresi sınırı</Label>
                  <p className="text-sm text-muted-foreground">
                    24 saat sonra otomatik çıkış yap
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="min-password-length">Minimum şifre uzunluğu</Label>
                <Input id="min-password-length" type="number" defaultValue={8} min={6} max={32} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <CardTitle>Veri Yönetimi</CardTitle>
              </div>
              <CardDescription>
                Veritabanı ve yedekleme ayarları
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Otomatik yedekleme</Label>
                  <p className="text-sm text-muted-foreground">
                    Her gün 03:00'te otomatik yedek al
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="retention-days">Veri saklama süresi (gün)</Label>
                <Input id="retention-days" type="number" defaultValue={365} min={30} />
              </div>
              <Button variant="outline" className="w-full">
                Manuel Yedekleme Başlat
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline">İptal</Button>
            <Button onClick={handleSave}>Değişiklikleri Kaydet</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
