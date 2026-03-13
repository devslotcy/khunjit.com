import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User, Briefcase, Calendar, Brain, GraduationCap, Award, Stethoscope, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { CurrencySelector } from "@/components/currency-selector";
import { getCurrencyByLanguage } from "@/lib/currency";

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
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    birthDate: "",
    gender: "",
    profession: "",
    bio: "",
    title: "",
    licenseNumber: "",
    yearsOfExperience: "",
    education: "",
    specialties: [] as string[],
    therapyApproaches: [] as string[],
    languages: ["Türkçe"] as string[], // Legacy field
    pricePerSession: "",
    languageId: "", // Patient's single language
    languageIds: [] as string[], // Psychologist's multiple languages
    currency: "USD", // Default currency (will be auto-set based on primary language)
    countryCode: "US", // Default country code
  });

  // Fetch available languages
  const { data: availableLanguages = [], isLoading: languagesLoading } = useQuery<Array<{ id: string; code: string; name: string; nativeName: string }>>({
    queryKey: ["/api/languages"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/languages");
      return response.json();
    },
  });
  
  useEffect(() => {
    if (!roleFromUrl) {
      navigate("/role-select");
    }
  }, [roleFromUrl, navigate]);

  const isPsychologist = formData.role === "psychologist";
  const totalSteps = isPsychologist ? 4 : 3;

  // Auto-set currency based on primary language selection (for psychologists)
  useEffect(() => {
    if (isPsychologist && formData.languageIds.length > 0 && availableLanguages.length > 0) {
      // Get primary language (first selected language)
      const primaryLanguageId = formData.languageIds[0];
      const primaryLanguage = availableLanguages.find(lang => lang.id === primaryLanguageId);

      if (primaryLanguage) {
        // Get recommended currency for this language
        const recommendedCurrency = getCurrencyByLanguage(primaryLanguage.code);

        // Only auto-set if currency hasn't been manually changed from default
        if (formData.currency === "USD" && formData.countryCode === "US") {
          setFormData(prev => ({
            ...prev,
            currency: recommendedCurrency.code,
            countryCode: recommendedCurrency.countryCode,
          }));
        }
      }
    }
  }, [formData.languageIds, availableLanguages, isPsychologist, formData.currency, formData.countryCode]);

  // Password validation
  const validatePassword = (password: string) => {
    return {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    };
  };

  const passwordValidation = validatePassword(formData.password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const isEmailValid = validateEmail(formData.email);

  // Username validation
  const validateUsername = (username: string) => {
    return {
      minLength: username.length >= 5,
      noNumbers: !/[0-9]/.test(username),
      onlyLetters: /^[a-zA-ZğüşıöçĞÜŞİÖÇ]+$/.test(username),
    };
  };

  const usernameValidation = validateUsername(formData.username);
  const isUsernameValid = Object.values(usernameValidation).every(Boolean);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Capitalize first name (first letter uppercase, rest lowercase)
  const formatFirstName = (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  };

  // Uppercase last name
  const formatLastName = (value: string) => {
    return value.toUpperCase();
  };

  const handleFirstNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, firstName: formatFirstName(value) }));
  };

  const handleLastNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, lastName: formatLastName(value) }));
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
        navigate("/psychologist");
      } else {
        navigate("/patient");
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

    if (step < totalSteps) {
      return;
    }

    if (!isEmailValid) {
      toast({
        title: "Hata",
        description: "Geçerli bir email adresi girin",
        variant: "destructive",
      });
      return;
    }

    if (!isUsernameValid) {
      toast({
        title: "Hata",
        description: "Kullanıcı adı en az 5 harf olmalı ve rakam içermemelidir",
        variant: "destructive",
      });
      return;
    }

    if (!isPasswordValid) {
      toast({
        title: "Hata",
        description: "Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Hata",
        description: "Şifreler eşleşmiyor",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate(formData);
  };

  const nextStep = () => {
    // Prevent going beyond total steps
    if (step >= totalSteps) {
      return;
    }

    if (step === 1) {
      // Validate language selection - different for psychologist and patient
      if (isPsychologist) {
        if (formData.languageIds.length === 0) {
          toast({ title: "Hata", description: "Lütfen en az bir terapi dili seçiniz", variant: "destructive" });
          return;
        }
      } else {
        if (!formData.languageId) {
          toast({ title: "Hata", description: "Lütfen terapi dilinizi seçiniz", variant: "destructive" });
          return;
        }
      }
      if (!formData.email || !formData.username || !formData.password || !formData.confirmPassword) {
        toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
        return;
      }
      if (!isEmailValid) {
        toast({ title: "Hata", description: "Geçerli bir email adresi girin", variant: "destructive" });
        return;
      }
      if (!isUsernameValid) {
        toast({ title: "Hata", description: "Kullanıcı adı en az 5 harf olmalı ve rakam içermemelidir", variant: "destructive" });
        return;
      }
      if (!isPasswordValid) {
        toast({ title: "Hata", description: "Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir", variant: "destructive" });
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

      // Validate birth date if provided
      if (formData.birthDate) {
        const selectedDate = new Date(formData.birthDate);
        const today = new Date();
        const minDate = new Date('1900-01-01');
        const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

        if (selectedDate < minDate || selectedDate > maxDate) {
          toast({
            title: "Geçersiz Doğum Tarihi",
            description: "18 yaşından büyük olmalısınız",
            variant: "destructive"
          });
          return;
        }
      }
    }
    if (step === 3 && isPsychologist) {
      if (!formData.title || !formData.licenseNumber || !formData.yearsOfExperience || !formData.education) {
        toast({ title: "Hata", description: "Lütfen profesyonel bilgilerinizi doldurun", variant: "destructive" });
        return;
      }
      if (formData.licenseNumber.length < 6 || formData.licenseNumber.length > 10) {
        toast({ title: "Hata", description: "Lisans numarası 6-10 hane olmalıdır", variant: "destructive" });
        return;
      }
    }
    // For patient, step 3 is the final step - no validation needed here as it's optional fields
    // The form will be submitted when user clicks the final button
    setStep(step + 1);
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
            {isPsychologist ? t('auth.register.titlePsychologist') : t('auth.register.titlePatient')}
          </CardTitle>
          <CardDescription>
            {t('auth.register.stepIndicator', { step, totalSteps })} {!isPsychologist && `(Danışan kayıt)`}
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
        <form onSubmit={(e) => {
          e.preventDefault();
          // Never allow form to submit directly - only through button clicks
          return false;
        }} onKeyDown={(e) => {
          // Prevent form submission on Enter key
          if (e.key === 'Enter') {
            e.preventDefault();
            if (step < totalSteps) {
              nextStep();
            } else {
              handleSubmit(e);
            }
          }
        }}>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="language">
                    {isPsychologist ? t('auth.register.step1.languageLabelPsychologist') : t('auth.register.step1.languageLabelPatient')}
                  </Label>
                  {/* Grid box selection - multiselect for psychologist, single for patient */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableLanguages.map((lang) => {
                      // For psychologist: multi-select (languageIds array)
                      // For patient: single-select (languageId string)
                      const isSelected = isPsychologist
                        ? formData.languageIds.includes(lang.id)
                        : formData.languageId === lang.id;

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
                          onClick={() => {
                            if (isPsychologist) {
                              // Psychologist: multi-select (toggle)
                              setFormData(prev => ({
                                ...prev,
                                languageIds: prev.languageIds.includes(lang.id)
                                  ? prev.languageIds.filter(id => id !== lang.id) // Remove
                                  : [...prev.languageIds, lang.id] // Add
                              }));
                            } else {
                              // Patient: single-select
                              setFormData(prev => ({ ...prev, languageId: lang.id }));
                            }
                          }}
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
                    {isPsychologist
                      ? t('auth.register.step1.languageHelperPsychologist')
                      : t('auth.register.step1.languageHelperPatient')}
                  </p>
                  {/* Show selected count for psychologist, checkmark for patient */}
                  {isPsychologist ? (
                    formData.languageIds.length > 0 && (
                      <div className="text-xs flex items-center gap-1 mt-2 text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('auth.register.step1.languagesSelectedCount', { count: formData.languageIds.length })}
                      </div>
                    )
                  ) : (
                    formData.languageId && (
                      <div className="text-xs flex items-center gap-1 mt-2 text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('auth.register.step1.languageSelected')}
                      </div>
                    )
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.register.step1.emailLabel')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('auth.register.step1.emailPlaceholder')}
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-email"
                    />
                  </div>
                  {formData.email && (
                    <div className={`text-xs flex items-center gap-1 mt-2 ${isEmailValid ? 'text-green-600' : 'text-red-600'}`}>
                      {isEmailValid ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {isEmailValid ? t('auth.register.step1.validEmail') : t('auth.register.step1.errorEmailFormat')}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">{t('auth.register.step1.usernameLabel')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder={t('auth.register.step1.usernamePlaceholder')}
                      value={formData.username}
                      onChange={(e) => updateField("username", e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-username"
                    />
                  </div>
                  {formData.username && (
                    <div className="text-xs space-y-1 mt-2">
                      <div className={`flex items-center gap-1 ${usernameValidation.minLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {usernameValidation.minLength ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {t('auth.register.step1.usernameRequirement1')}
                      </div>
                      <div className={`flex items-center gap-1 ${usernameValidation.noNumbers && usernameValidation.onlyLetters ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {usernameValidation.noNumbers && usernameValidation.onlyLetters ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {t('auth.register.step1.usernameRequirement2')}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.register.step1.passwordLabel')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t('auth.register.step1.passwordPlaceholder')}
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      className="pl-10 pr-10"
                      required
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="text-xs space-y-1 mt-2">
                      <div className={`flex items-center gap-1 ${passwordValidation.minLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordValidation.minLength ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {t('auth.register.step1.passwordRequirement1')}
                      </div>
                      <div className={`flex items-center gap-1 ${passwordValidation.hasUpperCase ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordValidation.hasUpperCase ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {t('auth.register.step1.passwordRequirement2')}
                      </div>
                      <div className={`flex items-center gap-1 ${passwordValidation.hasLowerCase ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordValidation.hasLowerCase ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {t('auth.register.step1.passwordRequirement3')}
                      </div>
                      <div className={`flex items-center gap-1 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordValidation.hasNumber ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {t('auth.register.step1.passwordRequirement4')}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.register.step1.passwordConfirmLabel')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t('auth.register.step1.passwordConfirmPlaceholder')}
                      value={formData.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                      className="pl-10 pr-10"
                      required
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && (
                    <div className={`text-xs flex items-center gap-1 mt-2 ${formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                      {formData.password === formData.confirmPassword ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {formData.password === formData.confirmPassword ? t('auth.register.step1.passwordMatch') : t('auth.register.step1.passwordMismatch')}
                    </div>
                  )}
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
                      onChange={(e) => handleFirstNameChange(e.target.value)}
                      required
                      data-testid="input-first-name"
                    />
                    <p className="text-xs text-muted-foreground">İlk harf büyük olacak</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Soyad *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Soyadınız"
                      value={formData.lastName}
                      onChange={(e) => handleLastNameChange(e.target.value)}
                      required
                      data-testid="input-last-name"
                    />
                    <p className="text-xs text-muted-foreground">Tamamı büyük olacak</p>
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
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        const today = new Date();
                        const minDate = new Date('1900-01-01');
                        const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

                        if (selectedDate < minDate || selectedDate > maxDate) {
                          toast({
                            title: "Geçersiz Tarih",
                            description: "Lütfen geçerli bir doğum tarihi girin (18 yaşından büyük olmalısınız)",
                            variant: "destructive",
                          });
                          return;
                        }
                        updateField("birthDate", e.target.value);
                      }}
                      className="pl-10"
                      min="1900-01-01"
                      max={(() => {
                        const today = new Date();
                        const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
                        return maxDate.toISOString().split('T')[0];
                      })()}
                      data-testid="input-birth-date"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">En az 18 yaşında olmalısınız (En geç: {(() => {
                    const today = new Date();
                    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
                    return maxDate.toLocaleDateString('tr-TR');
                  })()})</p>
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
                  </RadioGroup>
                </div>
              </>
            )}

            {step === 3 && !isPsychologist && (
              <>
                <div className="bg-primary/5 p-4 rounded-lg border-2 border-primary/20">
                  <h3 className="font-semibold text-lg mb-2 text-primary">
                    SON ADIM: Ek Bilgiler (Opsiyonel)
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Bu alanları doldurmak zorunda değilsiniz, ancak doldurmanız psikologların sizinle daha iyi eşleşmesine yardımcı olabilir.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession">Meslek</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="profession"
                      type="text"
                      placeholder="Mesleğiniz (opsiyonel)"
                      value={formData.profession}
                      onChange={(e) => updateField("profession", e.target.value)}
                      className="pl-10"
                      data-testid="input-profession"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Örnek: Öğretmen, Mühendis, Öğrenci, vb.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Hakkında</Label>
                  <Textarea
                    id="bio"
                    placeholder="Kendinizi kısaca tanıtın... (opsiyonel)"
                    value={formData.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    rows={4}
                    data-testid="textarea-bio"
                  />
                  <p className="text-xs text-muted-foreground">
                    Hoşlandığınız aktiviteler, ilgi alanlarınız veya terapi sürecinde paylaşmak istedikleriniz
                  </p>
                </div>
              </>
            )}

            {step === 3 && isPsychologist && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">{t('auth.register.title')} *</Label>
                  <Select value={formData.title} onValueChange={(value) => updateField("title", value)} required>
                    <SelectTrigger data-testid="select-title">
                      <Stethoscope className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder={t('auth.register.selectTitle')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="psychologist">{t('titles.psychologist')}</SelectItem>
                      <SelectItem value="clinicalPsychologist">{t('titles.clinicalPsychologist')}</SelectItem>
                      <SelectItem value="expertPsychologist">{t('titles.expertPsychologist')}</SelectItem>
                      <SelectItem value="expertClinicalPsychologist">{t('titles.expertClinicalPsychologist')}</SelectItem>
                      <SelectItem value="psychologicalCounselor">{t('titles.psychologicalCounselor')}</SelectItem>
                      <SelectItem value="psychotherapist">{t('titles.psychotherapist')}</SelectItem>
                      <SelectItem value="dr">{t('titles.dr')}</SelectItem>
                      <SelectItem value="assocProf">{t('titles.assocProf')}</SelectItem>
                      <SelectItem value="prof">{t('titles.prof')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.title && (
                    <div className="text-xs flex items-center gap-1 mt-2 text-green-600">
                      <CheckCircle2 className="w-3 h-3" />
                      {t('auth.register.titleSelected')}: {t(`titles.${formData.title}`)}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">Lisans Numarası *</Label>
                  <div className="relative">
                    <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="licenseNumber"
                      type="text"
                      placeholder="Mesleki lisans numaranız (6-10 haneli)"
                      value={formData.licenseNumber}
                      onChange={(e) => {
                        const numbers = e.target.value.replace(/\D/g, '');
                        const limitedNumbers = numbers.slice(0, 10);
                        updateField("licenseNumber", limitedNumbers);
                      }}
                      className="pl-10"
                      required
                      data-testid="input-license"
                    />
                  </div>
                  {formData.licenseNumber && (
                    <div className="text-xs space-y-1 mt-2">
                      <div className={`flex items-center gap-1 ${formData.licenseNumber.length >= 6 && formData.licenseNumber.length <= 10 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {formData.licenseNumber.length >= 6 && formData.licenseNumber.length <= 10 ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        6-10 haneli sayı olmalı (Şu an: {formData.licenseNumber.length} hane)
                      </div>
                    </div>
                  )}
                </div>
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

                {/* Currency Selection */}
                <div className="space-y-2">
                  <CurrencySelector
                    value={formData.currency}
                    onChange={(currency, countryCode) => {
                      setFormData(prev => ({ ...prev, currency, countryCode }));
                    }}
                    label="Para Birimi *"
                    helperText="Seans ücretinizi hangi para biriminde almak istersiniz?"
                    showRecommendation={true}
                    recommendedCurrency={
                      formData.languageIds.length > 0
                        ? getCurrencyByLanguage(
                            availableLanguages.find(lang => lang.id === formData.languageIds[0])?.code || "en"
                          ).code
                        : "USD"
                    }
                  />
                </div>

                {/* Session Price */}
                <div className="space-y-2">
                  <Label htmlFor="pricePerSession">
                    Seans Ücreti ({formData.currency || "USD"}) *
                  </Label>
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
                  <p className="text-xs text-muted-foreground">
                    Platform %20 komisyon alır. Tüm ücretler net tutar üzerinden hesaplanır.
                  </p>
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
                  {t('common.back')}
                </Button>
              )}
              {step < totalSteps ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    nextStep();
                  }}
                  className="flex-1"
                  data-testid="button-next"
                >
                  {t('common.next')}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit(e);
                  }}
                  className="flex-1"
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.register.registerButton')}
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {t('auth.register.hasAccount')}{" "}
              <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                {t('auth.register.loginLink')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
