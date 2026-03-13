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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, Calendar, Stethoscope, Upload, X, Languages, CheckCircle2, DollarSign, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { StripeConnectCard } from "@/components/stripe-connect-card";
import { CurrencySelector } from "@/components/currency-selector";
import { getCurrencyByCode } from "@/lib/currency";
import type { UserProfile, PsychologistProfile } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

const specialtyKeys = [
  "individual", "couples", "family", "childAdolescent",
  "depression", "anxiety", "trauma", "ocd", "eatingDisorders",
  "addiction", "careerCounseling", "stressManagement", "angerManagement"
];

const therapyApproachKeys = [
  "cbt", "psychodynamic", "emdr",
  "schema", "act", "gestalt",
  "solutionFocused", "existential", "mindfulness"
];

export default function ProfilePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: psychologistProfile, isLoading: psychProfileLoading } = useQuery<PsychologistProfile>({
    queryKey: ["/api/psychologist/profile"],
    enabled: profile?.role === "psychologist",
  });

  // Fetch available languages
  const { data: availableLanguages = [] } = useQuery<Array<{ id: string; code: string; name: string; nativeName: string }>>({
    queryKey: ["/api/languages"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/languages");
      return response.json();
    },
  });

  // Fetch psychologist's current languages
  const { data: psychologistLanguages = [] } = useQuery<Array<{ id: string; code: string; name: string; nativeName: string }>>({
    queryKey: [`/api/psychologists/${psychologistProfile?.id}/languages`],
    enabled: !!psychologistProfile?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/psychologists/${psychologistProfile?.id}/languages`);
      return response.json();
    },
  });

  const [formData, setFormData] = useState({
    birthDate: "",
    bio: "",
  });

  const [psychFormData, setPsychFormData] = useState({
    specialties: [] as string[],
    therapyApproaches: [] as string[],
    profileImageUrl: "",
  });

  const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("US");
  const [showCurrencyConfirmDialog, setShowCurrencyConfirmDialog] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    if (profile) {
      setFormData({
        birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split("T")[0] : "",
        bio: profile.bio || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (psychologistProfile) {
      // Keep backend keys (e.g., "individual", "depression") in state
      // Remove any duplicates that might exist in backend data
      const cleanSpecialties = Array.from(new Set(psychologistProfile.specialties || []));
      const cleanApproaches = Array.from(new Set(psychologistProfile.therapyApproaches || []));

      setPsychFormData({
        specialties: cleanSpecialties,
        therapyApproaches: cleanApproaches,
        profileImageUrl: psychologistProfile.profileImageUrl || "",
      });
      setImagePreview(psychologistProfile.profileImageUrl || "");
    }
  }, [psychologistProfile]);

  useEffect(() => {
    if (psychologistLanguages.length > 0) {
      setSelectedLanguageIds(psychologistLanguages.map(lang => lang.id));
    }
  }, [psychologistLanguages]);

  useEffect(() => {
    if (psychologistProfile) {
      setSelectedCurrency(psychologistProfile.currency || "USD");
      setSelectedCountryCode(psychologistProfile.countryCode || "US");
    }
  }, [psychologistProfile]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSpecialty = (specialty: string) => {
    setPsychFormData(prev => {
      const arr = prev.specialties;
      if (arr.includes(specialty)) {
        // Remove all occurrences of this specialty (in case of duplicates)
        return { ...prev, specialties: arr.filter(s => s !== specialty) };
      } else {
        // Add only if not already present (prevent duplicates)
        return { ...prev, specialties: Array.from(new Set([...arr, specialty])) };
      }
    });
  };

  const toggleTherapyApproach = (approach: string) => {
    setPsychFormData(prev => {
      const arr = prev.therapyApproaches;
      if (arr.includes(approach)) {
        // Remove all occurrences of this approach (in case of duplicates)
        return { ...prev, therapyApproaches: arr.filter(a => a !== approach) };
      } else {
        // Add only if not already present (prevent duplicates)
        return { ...prev, therapyApproaches: Array.from(new Set([...arr, approach])) };
      }
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('common.error'),
          description: t('profile.uploadError.sizeTooLarge'),
          variant: "destructive",
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({
          title: t('common.error'),
          description: t('profile.uploadError.invalidType'),
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setPsychFormData(prev => ({ ...prev, profileImageUrl: "" }));
  };

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("PATCH", "/api/profile", {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate).toISOString() : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: t('profile.saveSuccess.title'),
        description: t('profile.saveSuccess.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('profile.saveError'),
        variant: "destructive",
      });
    },
  });

  const updatePsychologistMutation = useMutation({
    mutationFn: async (data: typeof psychFormData) => {
      let uploadedImageUrl = data.profileImageUrl;

      // Upload image if there's a new file
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        try {
          const uploadResponse = await apiRequest("POST", "/api/upload/profile-image", formData);
          const uploadData = await uploadResponse.json();
          uploadedImageUrl = uploadData.url;
        } catch (error) {
          throw new Error("Resim yüklenirken bir hata oluştu");
        }
      }

      const response = await apiRequest("PATCH", "/api/psychologist/profile", {
        ...data,
        profileImageUrl: uploadedImageUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/psychologist/profile"] });
      setImageFile(null);
      toast({
        title: t('profile.saveSuccess.title'),
        description: t('profile.saveSuccess.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('profile.professionalSaveError'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handlePsychologistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // State already contains keys (e.g., "individual", "depression")
    // so we can send them directly to backend
    updatePsychologistMutation.mutate(psychFormData);
  };

  const updateLanguagesMutation = useMutation({
    mutationFn: async (languageIds: string[]) => {
      const response = await apiRequest("PUT", "/api/psychologist/languages", { languageIds });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate psychologist's own language list
      queryClient.invalidateQueries({ queryKey: [`/api/psychologists/${psychologistProfile?.id}/languages`] });

      // CRITICAL: Invalidate all psychologist listings to update patient-facing search results
      // This ensures patients immediately see/don't see this psychologist based on new language settings
      queryClient.invalidateQueries({ queryKey: ["/api/psychologists"] });

      // Also invalidate psychologist profile to refresh any language-dependent data
      queryClient.invalidateQueries({ queryKey: ["/api/psychologist/profile"] });

      toast({
        title: t('profile.saveSuccess.title'),
        description: t('profile.languageManagement.saveSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('profile.languageManagement.saveError'),
        variant: "destructive",
      });
    },
  });

  const handleLanguagesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLanguageIds.length === 0) {
      toast({
        title: t('common.error'),
        description: t('profile.languageManagement.errorMinLanguage'),
        variant: "destructive",
      });
      return;
    }
    updateLanguagesMutation.mutate(selectedLanguageIds);
  };

  const toggleLanguage = (languageId: string) => {
    setSelectedLanguageIds(prev => {
      if (prev.includes(languageId)) {
        return prev.filter(id => id !== languageId);
      } else {
        return [...prev, languageId];
      }
    });
  };

  const updateCurrencyMutation = useMutation({
    mutationFn: async (data: { currency: string; countryCode: string }) => {
      const response = await apiRequest("PATCH", "/api/psychologist/currency", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/psychologist/profile"] });
      toast({
        title: t('profile.saveSuccess.title'),
        description: "Para biriminiz başarıyla güncellendi. Bu değişiklik sadece yeni randevular için geçerlidir.",
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || "Para birimi güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleCurrencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Show confirmation dialog if currency is changing
    if (selectedCurrency !== psychologistProfile?.currency ||
        selectedCountryCode !== psychologistProfile?.countryCode) {
      setShowCurrencyConfirmDialog(true);
    }
  };

  const confirmCurrencyChange = () => {
    updateCurrencyMutation.mutate({
      currency: selectedCurrency,
      countryCode: selectedCountryCode,
    });
    setShowCurrencyConfirmDialog(false);
  };

  const role = (profile?.role || "patient") as "patient" | "psychologist" | "admin";

  if (isLoading || (profile?.role === "psychologist" && psychProfileLoading)) {
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
      <div className={`mx-auto space-y-8 px-4 pb-8 ${profile?.role === "psychologist" ? "max-w-7xl" : "max-w-3xl"}`}>
        {/* First Row: Personal Info + Professional Info (for psychologists) */}
        <div className={`grid gap-6 ${profile?.role === "psychologist" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
          {/* Personal Information */}
          <div className="space-y-4">
            {profile?.role === "psychologist" && (
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {t('profile.personalInfo.title')}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('profile.personalInfo.description')}
                </p>
              </div>
            )}
            <Card>
              <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('profile.personalInfo.firstName')}</Label>
                  <Input value={user?.firstName || ""} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>{t('profile.personalInfo.lastName')}</Label>
                  <Input value={user?.lastName || ""} disabled className="bg-muted" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('profile.personalInfo.email')}</Label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">{t('profile.personalInfo.birthDate')}</Label>
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
                <Label htmlFor="bio">{t('profile.personalInfo.about')}</Label>
                <Textarea
                  id="bio"
                  placeholder={t('profile.personalInfo.aboutPlaceholder')}
                  value={formData.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  rows={3}
                  className="lg:h-[157px] resize-none"
                  data-testid="textarea-bio"
                />
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
                {t('profile.personalInfo.saveButton')}
              </Button>
            </form>
          </CardContent>
        </Card>
          </div>

          {/* Psychologist Professional Information */}
          {profile?.role === "psychologist" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  {t('profile.professionalInfo.title')}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('profile.professionalInfo.description')}
                </p>
              </div>
              <Card>
                <CardContent className="pt-6">
              <form onSubmit={handlePsychologistSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>{t('profile.professionalInfo.photo')}</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Profil"
                            className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground">
                          <User className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <Label
                        htmlFor="profile-image"
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        {t('profile.professionalInfo.uploadButton')}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('profile.professionalInfo.uploadHelper')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Specialties and Approaches in 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('profile.professionalInfo.specialties')}</Label>
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto p-3 border rounded-md bg-muted/30">
                      {specialtyKeys.map((specialtyKey) => (
                        <label
                          key={specialtyKey}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                            psychFormData.specialties.includes(specialtyKey)
                              ? "bg-primary/20 text-primary font-medium"
                              : "hover:bg-muted"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={psychFormData.specialties.includes(specialtyKey)}
                            onChange={() => toggleSpecialty(specialtyKey)}
                            className="rounded"
                            data-testid={`checkbox-specialty-${specialtyKey}`}
                          />
                          {t(`specialties.${specialtyKey}`)}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('profile.professionalInfo.specialtiesCount', { count: Array.from(new Set(psychFormData.specialties)).length })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('profile.professionalInfo.approaches')}</Label>
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto p-3 border rounded-md bg-muted/30">
                      {therapyApproachKeys.map((approachKey) => (
                        <label
                          key={approachKey}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                            psychFormData.therapyApproaches.includes(approachKey)
                              ? "bg-primary/20 text-primary font-medium"
                              : "hover:bg-muted"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={psychFormData.therapyApproaches.includes(approachKey)}
                            onChange={() => toggleTherapyApproach(approachKey)}
                            className="rounded"
                            data-testid={`checkbox-approach-${approachKey}`}
                          />
                          {t(`therapyApproaches.${approachKey}`)}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('profile.professionalInfo.approachesCount', { count: Array.from(new Set(psychFormData.therapyApproaches)).length })}
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={updatePsychologistMutation.isPending}
                  data-testid="button-save-psychologist-profile"
                >
                  {updatePsychologistMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {t('profile.professionalInfo.saveButton')}
                </Button>
              </form>
            </CardContent>
          </Card>
            </div>
          )}
        </div>

        {/* Second Row: Language Management + Payment Settings (for psychologists) */}
        {profile?.role === "psychologist" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Language Management */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Languages className="h-5 w-5 text-primary" />
                  {t('profile.languageManagement.title')}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('profile.languageManagement.description')}
                </p>
              </div>
              <Card>
                <CardContent className="pt-6">
              <form onSubmit={handleLanguagesSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('profile.languageManagement.label')}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableLanguages.map((lang) => {
                      const isSelected = selectedLanguageIds.includes(lang.id);

                      const flagEmoji = {
                        'en': '🇬🇧',
                        'th': '🇹🇭',
                        'vi': '🇻🇳',
                        'fil': '🇵🇭',
                        'id': '🇮🇩',
                        'ja': '🇯🇵',
                        'ko': '🇰🇷',
                        'de': '🇩🇪',
                        'fr': '🇫🇷',
                        'it': '🇮🇹',
                        'tr': '🇹🇷',
                      }[lang.code] || '🌐';

                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => toggleLanguage(lang.id)}
                          className={`
                            relative flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all
                            ${isSelected
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : 'border-border hover:border-primary/50 hover:bg-muted'
                            }
                          `}
                        >
                          {isSelected && (
                            <CheckCircle2 className="absolute top-1 right-1 w-4 h-4 text-primary" />
                          )}
                          <span className="text-xl">{flagEmoji}</span>
                          <span className="text-sm font-medium">{lang.nativeName}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('profile.languageManagement.selectedCount', { count: selectedLanguageIds.length })}
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateLanguagesMutation.isPending || selectedLanguageIds.length === 0}
                >
                  {updateLanguagesMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {t('profile.languageManagement.saveButton')}
                </Button>
              </form>
            </CardContent>
          </Card>
            </div>

            {/* Payment Settings (Currency + Stripe Connect) */}
            <div className="space-y-4">
              {/* Currency Management */}
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Para Birimi Ayarları
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Seans ücretlerinizi hangi para biriminde almak istediğinizi belirleyin
                </p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleCurrencySubmit} className="space-y-4">
                    {/* Current Currency Info */}
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>Mevcut para biriminiz:</strong> {selectedCurrency} {getCurrencyByCode(selectedCurrency)?.symbol}
                        <br />
                        <span className="text-xs text-muted-foreground mt-1 block">
                          Para birimi değişikliği sadece yeni randevular için geçerlidir. Mevcut ve geçmiş ödemeler etkilenmez.
                        </span>
                      </AlertDescription>
                    </Alert>

                    {/* Currency Selector */}
                    <CurrencySelector
                      value={selectedCurrency}
                      onChange={(currency, countryCode) => {
                        setSelectedCurrency(currency);
                        setSelectedCountryCode(countryCode);
                      }}
                      label="Yeni Para Birimi"
                      helperText="Stripe Connect hesabınızın para birimi ile uyumlu olmalıdır"
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={
                        updateCurrencyMutation.isPending ||
                        (selectedCurrency === psychologistProfile?.currency &&
                          selectedCountryCode === psychologistProfile?.countryCode)
                      }
                    >
                      {updateCurrencyMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Para Birimini Güncelle
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Stripe Connect */}
              <div className="mt-4">
                <StripeConnectCard />
              </div>
            </div>
          </div>
        )}

        {/* Currency Change Confirmation Dialog */}
        <AlertDialog open={showCurrencyConfirmDialog} onOpenChange={setShowCurrencyConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Para Birimini Değiştir?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Para biriminizi <strong>{psychologistProfile?.currency}</strong> {getCurrencyByCode(psychologistProfile?.currency || "USD")?.symbol}
                  {" "}→{" "}
                  <strong>{selectedCurrency}</strong> {getCurrencyByCode(selectedCurrency)?.symbol} olarak değiştirmek üzeresiniz.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800 mt-2">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">⚠️ Önemli:</p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 ml-4 list-disc space-y-1">
                    <li>Bu değişiklik <strong>sadece yeni randevular</strong> için geçerlidir</li>
                    <li>Mevcut ve bekleyen randevular etkilenmez</li>
                    <li>Geçmiş ödemeler değişmez</li>
                    <li>Stripe Connect hesabınızın para birimi ile uyumlu olmalıdır</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={confirmCurrencyChange}>
                Onayla ve Değiştir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
