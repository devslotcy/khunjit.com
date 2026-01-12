import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, Phone, MapPin, Briefcase, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { UserProfile } from "@shared/schema";

const cities = [
  "Adana", "Ankara", "Antalya", "Bursa", "Denizli", "Diyarbakır", "Eskişehir", 
  "Gaziantep", "İstanbul", "İzmir", "Kayseri", "Kocaeli", "Konya", "Mersin", 
  "Muğla", "Samsun", "Trabzon", "Diğer"
];

export default function ProfilePage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const [formData, setFormData] = useState({
    phone: "",
    birthDate: "",
    gender: "",
    city: "",
    profession: "",
    bio: "",
    timezone: "Europe/Istanbul",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        phone: profile.phone || "",
        birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split("T")[0] : "",
        gender: profile.gender || "",
        city: profile.city || "",
        profession: profile.profession || "",
        bio: profile.bio || "",
        timezone: profile.timezone || "Europe/Istanbul",
      });
    }
  }, [profile]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PATCH", "/api/profile", {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate).toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Başarılı",
        description: "Profiliniz güncellendi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Profil güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const role = (profile?.role || "patient") as "patient" | "psychologist" | "admin";

  if (isLoading) {
    return (
      <DashboardLayout role="patient">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Profil Ayarları</h1>
          <p className="text-muted-foreground">Kişisel bilgilerinizi güncelleyin</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Kişisel Bilgiler
            </CardTitle>
            <CardDescription>
              Hesap bilgilerinizi burada güncelleyebilirsiniz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ad</Label>
                  <Input value={user?.firstName || ""} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Soyad</Label>
                  <Input value={user?.lastName || ""} disabled className="bg-muted" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0555 123 4567"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="pl-10"
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">Doğum Tarihi</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => updateField("birthDate", e.target.value)}
                    className="pl-10"
                    data-testid="input-birth-date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cinsiyet</Label>
                <RadioGroup
                  value={formData.gender}
                  onValueChange={(value) => updateField("gender", value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" data-testid="radio-male" />
                    <Label htmlFor="male">Erkek</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" data-testid="radio-female" />
                    <Label htmlFor="female">Kadın</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" data-testid="radio-other" />
                    <Label htmlFor="other">Diğer</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Şehir</Label>
                <Select value={formData.city} onValueChange={(value) => updateField("city", value)}>
                  <SelectTrigger data-testid="select-city">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Şehir seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profession">Meslek</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="profession"
                    type="text"
                    placeholder="Mesleğiniz"
                    value={formData.profession}
                    onChange={(e) => updateField("profession", e.target.value)}
                    className="pl-10"
                    data-testid="input-profession"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Hakkımda</Label>
                <Textarea
                  id="bio"
                  placeholder="Kendinizi kısaca tanıtın..."
                  value={formData.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  rows={4}
                  data-testid="textarea-bio"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Zaman Dilimi</Label>
                <Select value={formData.timezone} onValueChange={(value) => updateField("timezone", value)}>
                  <SelectTrigger data-testid="select-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Istanbul">Türkiye (GMT+3)</SelectItem>
                    <SelectItem value="Europe/London">Londra (GMT)</SelectItem>
                    <SelectItem value="Europe/Berlin">Berlin (GMT+1)</SelectItem>
                    <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={updateMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Kaydet
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
