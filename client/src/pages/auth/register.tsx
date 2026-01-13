import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User, Phone, MapPin, Briefcase, Calendar, Brain, GraduationCap, Award, Languages, Stethoscope } from "lucide-react";
import { Link } from "wouter";

const cities = [
  "Adana", "Ankara", "Antalya", "Bursa", "Denizli", "Diyarbakır", "Eskişehir", 
  "Gaziantep", "İstanbul", "İzmir", "Kayseri", "Kocaeli", "Konya", "Mersin", 
  "Muğla", "Samsun", "Trabzon", "Diğer"
];

const specialties = [
  "Bireysel Terapi", "Çift Terapisi", "Aile Terapisi", "Çocuk ve Ergen", 
  "Depresyon", "Anksiyete", "Travma ve TSSB", "OKB", "Yeme Bozuklukları",
  "Bağımlılık", "Kariyer Danışmanlığı", "Stres Yönetimi", "Öfke Kontrolü"
];

const therapyApproaches = [
  "Bilişsel Davranışçı Terapi (BDT)", "Psikodinamik Terapi", "EMDR", 
  "Şema Terapi", "Kabul ve Kararlılık Terapisi (ACT)", "Gestalt Terapi",
  "Çözüm Odaklı Terapi", "Varoluşçu Terapi", "Mindfulness Tabanlı Terapi"
];

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  
  const urlParams = new URLSearchParams(search);
  const roleFromUrl = urlParams.get("role") as "patient" | "psychologist" | null;
  
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: roleFromUrl || "patient",
    phone: "",
    birthDate: "",
    gender: "",
    city: "",
    profession: "",
    bio: "",
    title: "",
    licenseNumber: "",
    yearsOfExperience: "",
    education: "",
    specialties: [] as string[],
    therapyApproaches: [] as string[],
    languages: ["Türkçe"] as string[],
    pricePerSession: "",
  });
  
  useEffect(() => {
    if (!roleFromUrl) {
      navigate("/role-select");
    }
  }, [roleFromUrl, navigate]);
  
  const isPsychologist = formData.role === "psychologist";
  const totalSteps = isPsychologist ? 4 : 3;

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Kayıt başarılı",
        description: "Hesabınız oluşturuldu!",
      });
      if (isPsychologist) {
        navigate("/psychologist/dashboard");
      } else {
        navigate("/patient/dashboard");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Kayıt başarısız",
        description: error.message || "Bir hata oluştu",
        variant: "destructive",
      });
    },
  });
  
  const toggleArrayField = (field: "specialties" | "therapyApproaches", value: string) => {
    setFormData(prev => {
      const arr = prev[field];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...arr, value] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Hata",
        description: "Şifreler eşleşmiyor",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Hata",
        description: "Şifre en az 6 karakter olmalıdır",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate(formData);
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.email || !formData.username || !formData.password || !formData.confirmPassword) {
        toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({ title: "Hata", description: "Şifreler eşleşmiyor", variant: "destructive" });
        return;
      }
    }
    if (step === 2) {
      if (!formData.firstName || !formData.lastName) {
        toast({ title: "Hata", description: "Ad ve soyad gereklidir", variant: "destructive" });
        return;
      }
    }
    if (step === 3 && isPsychologist) {
      if (!formData.title || !formData.licenseNumber || !formData.yearsOfExperience || !formData.education) {
        toast({ title: "Hata", description: "Lütfen profesyonel bilgilerinizi doldurun", variant: "destructive" });
        return;
      }
    }
    setStep(s => s + 1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Brain className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isPsychologist ? "Psikolog Kaydı" : "Hasta Kaydı"}
          </CardTitle>
          <CardDescription>
            Adım {step} / {totalSteps}
          </CardDescription>
          <div className="flex justify-center gap-2 pt-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={`h-2 w-12 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="ornek@email.com"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Kullanıcı Adı *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="kullanici_adi"
                      value={formData.username}
                      onChange={(e) => updateField("username", e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-username"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Şifre *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="En az 6 karakter"
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Şifre Tekrar *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Şifrenizi tekrar girin"
                      value={formData.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Ad *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Adınız"
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      required
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Soyad *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Soyadınız"
                      value={formData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      required
                      data-testid="input-last-name"
                    />
                  </div>
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
              </>
            )}

            {step === 3 && !isPsychologist && (
              <>
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
                  <Label htmlFor="bio">Hakkında</Label>
                  <Textarea
                    id="bio"
                    placeholder="Kendinizi kısaca tanıtın..."
                    value={formData.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    rows={3}
                    data-testid="textarea-bio"
                  />
                </div>
              </>
            )}

            {step === 3 && isPsychologist && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Unvan *</Label>
                  <Select value={formData.title} onValueChange={(value) => updateField("title", value)}>
                    <SelectTrigger data-testid="select-title">
                      <Stethoscope className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Unvan seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Psikolog">Psikolog</SelectItem>
                      <SelectItem value="Klinik Psikolog">Klinik Psikolog</SelectItem>
                      <SelectItem value="Uzman Psikolog">Uzman Psikolog</SelectItem>
                      <SelectItem value="Dr.">Dr.</SelectItem>
                      <SelectItem value="Doç. Dr.">Doç. Dr.</SelectItem>
                      <SelectItem value="Prof. Dr.">Prof. Dr.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">Lisans Numarası *</Label>
                  <div className="relative">
                    <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="licenseNumber"
                      type="text"
                      placeholder="Mesleki lisans numaranız"
                      value={formData.licenseNumber}
                      onChange={(e) => updateField("licenseNumber", e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-license"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="yearsOfExperience">Deneyim (Yıl) *</Label>
                    <Input
                      id="yearsOfExperience"
                      type="number"
                      min="0"
                      max="50"
                      placeholder="5"
                      value={formData.yearsOfExperience}
                      onChange={(e) => updateField("yearsOfExperience", e.target.value)}
                      required
                      data-testid="input-experience"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Şehir</Label>
                    <Select value={formData.city} onValueChange={(value) => updateField("city", value)}>
                      <SelectTrigger data-testid="select-city">
                        <SelectValue placeholder="Şehir" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="education">Eğitim Bilgileri *</Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="education"
                      placeholder="Üniversite, bölüm ve mezuniyet yılı..."
                      value={formData.education}
                      onChange={(e) => updateField("education", e.target.value)}
                      className="pl-10"
                      rows={2}
                      data-testid="textarea-education"
                    />
                  </div>
                </div>
              </>
            )}

            {step === 4 && isPsychologist && (
              <>
                <div className="space-y-2">
                  <Label>Uzmanlık Alanları *</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                    {specialties.map((specialty) => (
                      <label
                        key={specialty}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${
                          formData.specialties.includes(specialty) ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.specialties.includes(specialty)}
                          onChange={() => toggleArrayField("specialties", specialty)}
                          className="rounded"
                          data-testid={`checkbox-specialty-${specialty}`}
                        />
                        {specialty}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Terapi Yaklaşımları</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                    {therapyApproaches.map((approach) => (
                      <label
                        key={approach}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${
                          formData.therapyApproaches.includes(approach) ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.therapyApproaches.includes(approach)}
                          onChange={() => toggleArrayField("therapyApproaches", approach)}
                          className="rounded"
                          data-testid={`checkbox-approach-${approach}`}
                        />
                        {approach}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerSession">Seans Ücreti (TL) *</Label>
                  <Input
                    id="pricePerSession"
                    type="number"
                    min="100"
                    placeholder="500"
                    value={formData.pricePerSession}
                    onChange={(e) => updateField("pricePerSession", e.target.value)}
                    required
                    data-testid="input-price"
                  />
                  <p className="text-xs text-muted-foreground">Platform %15 komisyon alır, KDV dahil.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Hakkımda</Label>
                  <Textarea
                    id="bio"
                    placeholder="Kendinizi ve yaklaşımınızı tanıtın..."
                    value={formData.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    rows={3}
                    data-testid="textarea-bio"
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="flex gap-2 w-full">
              {step > 1 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1"
                  data-testid="button-back"
                >
                  Geri
                </Button>
              )}
              {step < totalSteps ? (
                <Button 
                  type="button" 
                  onClick={nextStep}
                  className="flex-1"
                  data-testid="button-next"
                >
                  İleri
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Kayıt Ol
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Zaten hesabınız var mı?{" "}
              <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                Giriş Yapın
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
