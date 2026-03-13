# UI Language (i18n) Implementation Guide

## Executive Summary

This document provides a comprehensive implementation plan for adding **UI Display Language** (internationalization) to the Mendly psychology platform.

### Critical Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                    TWO SEPARATE SYSTEMS                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. THERAPY LANGUAGE (Already Implemented)                   │
│     - Patient selects ONE therapy language                   │
│     - Psychologist supports MULTIPLE therapy languages       │
│     - Used for MATCHING ONLY                                 │
│     - Stored in: userProfiles.languageId                     │
│     - Stored in: psychologistLanguages table                 │
│     - MUST NOT BE CHANGED                                    │
│                                                              │
│  2. UI LANGUAGE (This Implementation)                        │
│     - User selects preferred website display language        │
│     - Used for INTERFACE TRANSLATION ONLY                    │
│     - Stored in: userProfiles.uiLanguageCode                 │
│     - Can be changed anytime without affecting matching      │
│     - NEW SYSTEM TO BE IMPLEMENTED                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Architecture Overview

### 1.1 Supported Languages (11 Languages)

The platform will support exactly **11 languages** for UI display, using the same language codes as therapy languages:

| Language | Code | Native Name |
|----------|------|-------------|
| English | `en` | English |
| Thai | `th` | ไทย |
| Vietnamese | `vi` | Tiếng Việt |
| Filipino/Tagalog | `fil` | Filipino |
| Indonesian | `id` | Bahasa Indonesia |
| Japanese | `ja` | 日本語 |
| Korean | `ko` | 한국어 |
| German | `de` | Deutsch |
| French | `fr` | Français |
| Italian | `it` | Italiano |
| Turkish | `tr` | Türkçe |

### 1.2 System Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     FIRST VISIT (Not Logged In)              │
├──────────────────────────────────────────────────────────────┤
│ 1. User visits site                                          │
│ 2. Detect browser language or geo location                   │
│ 3. Set default UI language (stored in localStorage)          │
│ 4. Display site in detected language                         │
│ 5. User can change via language switcher (top nav)           │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                  REGISTRATION FLOW                           │
├──────────────────────────────────────────────────────────────┤
│ Step 1: Language Selection                                   │
│   - User sees therapy language options (grid with flags)     │
│   - On click → TWO ACTIONS HAPPEN:                           │
│     a) Select therapy language (existing behavior)           │
│     b) IMMEDIATELY switch UI to that language (NEW)          │
│   - No page reload, instant switch                           │
│                                                              │
│ Step 2-4: Personal Info                                      │
│   - All labels/buttons now in selected language              │
│   - Language switcher still available in top nav             │
│                                                              │
│ On Submit:                                                   │
│   - Save therapy language → languageId (existing)            │
│   - Save UI language → uiLanguageCode (NEW)                  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                   LOGGED IN USERS                            │
├──────────────────────────────────────────────────────────────┤
│ 1. User logs in                                              │
│ 2. Backend returns user profile with uiLanguageCode          │
│ 3. Frontend loads that language immediately                  │
│ 4. User can change via:                                      │
│    a) Language switcher in top nav                           │
│    b) Settings page                                          │
│ 5. Changes persist to backend immediately                    │
│ 6. NO effect on therapy language or matching                 │
└──────────────────────────────────────────────────────────────┘
```

### 1.3 Language Detection Priority (First Visit)

```javascript
Priority Order:
1. localStorage uiLanguage (if exists from previous visit)
2. Browser navigator.language
3. Geo-IP detection (optional, fallback)
4. Default: English (en)

Example:
- User in Thailand → Browser: "th-TH" → Default UI: Thai
- User in Germany → Browser: "de-DE" → Default UI: German
- User with VPN/unknown → Default UI: English
```

---

## 2. Database Schema Changes

### 2.1 Migration: Add `uiLanguageCode` Column

**File:** `migrations/add_ui_language_column.sql`

```sql
-- Migration: Add UI Language Support
-- Created: 2026-01-19
-- Purpose: Add UI language preference separate from therapy language

-- Add uiLanguageCode column to userProfiles table
ALTER TABLE user_profiles
ADD COLUMN ui_language_code VARCHAR(10) DEFAULT 'en';

-- Add index for faster queries
CREATE INDEX idx_user_profiles_ui_language ON user_profiles(ui_language_code);

-- Add comment for clarity
COMMENT ON COLUMN user_profiles.ui_language_code IS
  'User preferred UI display language (i18n). Separate from therapy language (language_id).';

-- Update existing users to default 'tr' (Turkish - current hardcoded language)
UPDATE user_profiles
SET ui_language_code = 'tr'
WHERE ui_language_code IS NULL;

-- Optional: Set NOT NULL constraint after backfill
ALTER TABLE user_profiles
ALTER COLUMN ui_language_code SET NOT NULL;

-- Verify migration
SELECT
  COUNT(*) as total_users,
  ui_language_code,
  COUNT(*) as users_per_language
FROM user_profiles
GROUP BY ui_language_code;
```

### 2.2 Updated Schema (TypeScript)

**File:** `shared/schema.ts`

Update the `userProfiles` table schema:

```typescript
import { pgTable, serial, integer, varchar, text, timestamp, boolean, date } from 'drizzle-orm/pg-core';

export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // 'patient' | 'psychologist' | 'admin'

  // THERAPY LANGUAGE (for matching - DO NOT CHANGE)
  languageId: integer('language_id').references(() => languages.id),

  // UI DISPLAY LANGUAGE (NEW - for interface translation only)
  uiLanguageCode: varchar('ui_language_code', { length: 10 }).notNull().default('en'),

  phone: varchar('phone', { length: 20 }),
  birthDate: date('birth_date'),
  gender: varchar('gender', { length: 10 }),
  city: varchar('city', { length: 100 }),
  profession: varchar('profession', { length: 100 }),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 2.3 Database Migration Strategy

```bash
# Run migration
psql $DATABASE_URL -f migrations/add_ui_language_column.sql

# Or using Drizzle Kit (if configured)
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```

---

## 3. Frontend Implementation

### 3.1 Install i18n Dependencies

```bash
npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

**Dependencies Explanation:**
- `i18next`: Core i18n engine
- `react-i18next`: React bindings for i18next
- `i18next-browser-languagedetector`: Auto-detect browser language
- `i18next-http-backend`: Load translation files from server (optional)

### 3.2 Create i18n Configuration

**File:** `client/src/lib/i18n.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from '../locales/en.json';
import thTranslations from '../locales/th.json';
import viTranslations from '../locales/vi.json';
import filTranslations from '../locales/fil.json';
import idTranslations from '../locales/id.json';
import jaTranslations from '../locales/ja.json';
import koTranslations from '../locales/ko.json';
import deTranslations from '../locales/de.json';
import frTranslations from '../locales/fr.json';
import itTranslations from '../locales/it.json';
import trTranslations from '../locales/tr.json';

// Supported languages
export const SUPPORTED_UI_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
] as const;

export type UILanguageCode = typeof SUPPORTED_UI_LANGUAGES[number]['code'];

// Translation resources
const resources = {
  en: { translation: enTranslations },
  th: { translation: thTranslations },
  vi: { translation: viTranslations },
  fil: { translation: filTranslations },
  id: { translation: idTranslations },
  ja: { translation: jaTranslations },
  ko: { translation: koTranslations },
  de: { translation: deTranslations },
  fr: { translation: frTranslations },
  it: { translation: itTranslations },
  tr: { translation: trTranslations },
};

// Custom language detector with fallback
const languageDetector = new LanguageDetector(null, {
  order: ['localStorage', 'navigator', 'htmlTag'],
  lookupLocalStorage: 'mendly_ui_language',
  caches: ['localStorage'],
  excludeCacheFor: ['cimode'],
});

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_UI_LANGUAGES.map(lang => lang.code),

    // Don't use language detector if user is logged in
    // (we'll set language from backend)
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'mendly_ui_language',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: false, // Avoid suspense issues during SSR
    },

    // Debugging (disable in production)
    debug: import.meta.env.DEV,
  });

export default i18n;
```

### 3.3 Translation File Structure

**File:** `client/src/locales/en.json` (Example - English)

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "error": "An error occurred",
    "success": "Success",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "submit": "Submit",
    "search": "Search",
    "filter": "Filter",
    "logout": "Logout"
  },

  "auth": {
    "login": "Login",
    "register": "Register",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "forgotPassword": "Forgot Password?",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?",
    "signIn": "Sign In",
    "signUp": "Sign Up"
  },

  "registration": {
    "step1": {
      "title": "Select Your Therapy Language",
      "description": "Choose the language you want to use for therapy sessions",
      "patientNote": "You will be matched with psychologists who speak this language",
      "psychologistNote": "Select all languages you can provide therapy in"
    },
    "step2": {
      "title": "Personal Information",
      "firstName": "First Name",
      "lastName": "Last Name",
      "phone": "Phone Number",
      "birthDate": "Birth Date",
      "gender": "Gender",
      "male": "Male",
      "female": "Female",
      "other": "Other",
      "preferNotToSay": "Prefer not to say"
    },
    "step3": {
      "patient": {
        "title": "Additional Information",
        "city": "City",
        "profession": "Profession",
        "bio": "Tell us about yourself (optional)"
      },
      "psychologist": {
        "title": "Professional Details",
        "licenseNumber": "License Number",
        "specialties": "Specialties",
        "therapyApproaches": "Therapy Approaches",
        "experience": "Years of Experience",
        "education": "Education"
      }
    },
    "step4": {
      "title": "Review & Confirm",
      "review": "Please review your information",
      "createAccount": "Create Account"
    }
  },

  "dashboard": {
    "welcome": "Welcome back, {{name}}!",
    "upcomingAppointments": "Upcoming Appointments",
    "recentMessages": "Recent Messages",
    "findPsychologist": "Find a Psychologist",
    "myAppointments": "My Appointments",
    "myMessages": "My Messages",
    "myProfile": "My Profile",
    "settings": "Settings"
  },

  "psychologists": {
    "title": "Find Your Psychologist",
    "filterByLanguage": "Filter by Language",
    "noResults": "No psychologists found",
    "viewProfile": "View Profile",
    "bookSession": "Book Session",
    "speaksLanguages": "Speaks: {{languages}}",
    "pricePerSession": "{{price}} per session",
    "available": "Available",
    "unavailable": "Unavailable"
  },

  "appointments": {
    "title": "Appointments",
    "upcoming": "Upcoming",
    "past": "Past",
    "cancelled": "Cancelled",
    "noAppointments": "No appointments scheduled",
    "bookNew": "Book New Appointment",
    "cancel": "Cancel Appointment",
    "reschedule": "Reschedule",
    "join": "Join Session",
    "sessionWith": "Session with {{name}}",
    "date": "Date",
    "time": "Time",
    "duration": "Duration",
    "status": "Status"
  },

  "profile": {
    "title": "Profile",
    "editProfile": "Edit Profile",
    "personalInfo": "Personal Information",
    "professionalInfo": "Professional Information",
    "therapyLanguage": "Therapy Language",
    "uiLanguage": "Website Display Language",
    "changeTherapyLanguageWarning": "Changing your therapy language will affect psychologist matching",
    "changeUiLanguageNote": "This only changes the website display language, not your therapy language",
    "updateSuccess": "Profile updated successfully",
    "updateError": "Failed to update profile"
  },

  "settings": {
    "title": "Settings",
    "language": "Language Settings",
    "uiLanguage": "Website Display Language",
    "therapyLanguage": "Therapy Language",
    "notifications": "Notifications",
    "privacy": "Privacy",
    "security": "Security",
    "theme": "Theme",
    "lightMode": "Light Mode",
    "darkMode": "Dark Mode",
    "systemMode": "System Default"
  },

  "languageSwitcher": {
    "title": "Choose Language",
    "current": "Current: {{language}}",
    "change": "Change Language"
  },

  "errors": {
    "networkError": "Network error. Please check your connection.",
    "serverError": "Server error. Please try again later.",
    "unauthorized": "You are not authorized to access this page.",
    "notFound": "Page not found.",
    "validationError": "Please check your input and try again.",
    "sessionExpired": "Your session has expired. Please login again."
  }
}
```

**File:** `client/src/locales/tr.json` (Example - Turkish - Current Hardcoded Language)

```json
{
  "common": {
    "save": "Kaydet",
    "cancel": "İptal",
    "delete": "Sil",
    "edit": "Düzenle",
    "loading": "Yükleniyor...",
    "error": "Bir hata oluştu",
    "success": "Başarılı",
    "confirm": "Onayla",
    "back": "Geri",
    "next": "İleri",
    "submit": "Gönder",
    "search": "Ara",
    "filter": "Filtrele",
    "logout": "Çıkış Yap"
  },

  "auth": {
    "login": "Giriş Yap",
    "register": "Kayıt Ol",
    "email": "E-posta",
    "password": "Şifre",
    "confirmPassword": "Şifre Tekrar",
    "forgotPassword": "Şifremi Unuttum?",
    "noAccount": "Hesabınız yok mu?",
    "hasAccount": "Zaten hesabınız var mı?",
    "signIn": "Giriş Yap",
    "signUp": "Kayıt Ol"
  },

  "registration": {
    "step1": {
      "title": "Terapi Dilinizi Seçin",
      "description": "Terapi seanslarında kullanmak istediğiniz dili seçin",
      "patientNote": "Bu dili konuşan psikologlarla eşleştirileceksiniz",
      "psychologistNote": "Terapi verebileceğiniz tüm dilleri seçin"
    },
    "step2": {
      "title": "Kişisel Bilgiler",
      "firstName": "Ad",
      "lastName": "Soyad",
      "phone": "Telefon Numarası",
      "birthDate": "Doğum Tarihi",
      "gender": "Cinsiyet",
      "male": "Erkek",
      "female": "Kadın",
      "other": "Diğer",
      "preferNotToSay": "Belirtmek istemiyorum"
    }
  }
}
```

**NOTE:** You'll need to create translation files for all 11 languages. Start with English and Turkish (current language), then gradually add others.

### 3.4 Update App.tsx to Initialize i18n

**File:** `client/src/App.tsx`

```typescript
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { queryClient } from './lib/queryClient';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui/tooltip';
import { useAuth } from './hooks/use-auth';
import './lib/i18n'; // Initialize i18n

function AppContent() {
  const { i18n } = useTranslation();
  const { user, isLoading } = useAuth();

  // Sync UI language with user profile when logged in
  useEffect(() => {
    if (user?.profile?.uiLanguageCode && !isLoading) {
      const userLanguage = user.profile.uiLanguageCode;
      const currentLanguage = i18n.language;

      // Only change if different to avoid unnecessary re-renders
      if (userLanguage !== currentLanguage) {
        i18n.changeLanguage(userLanguage);
        localStorage.setItem('mendly_ui_language', userLanguage);
      }
    }
  }, [user, isLoading, i18n]);

  return (
    // Your existing app routes
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

### 3.5 Create Language Switcher Component

**File:** `client/src/components/language-switcher.tsx`

```typescript
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { SUPPORTED_UI_LANGUAGES, type UILanguageCode } from '../lib/i18n';
import { useAuth } from '../hooks/use-auth';
import { useToast } from '../hooks/use-toast';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentLanguage = SUPPORTED_UI_LANGUAGES.find(
    lang => lang.code === i18n.language
  ) || SUPPORTED_UI_LANGUAGES[0];

  // Mutation to update UI language on backend (for logged-in users)
  const updateLanguageMutation = useMutation({
    mutationFn: async (languageCode: UILanguageCode) => {
      const response = await fetch('/api/user/ui-language', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ uiLanguageCode: languageCode }),
      });

      if (!response.ok) {
        throw new Error('Failed to update language');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
    onError: () => {
      toast({
        title: t('errors.serverError'),
        description: t('profile.updateError'),
        variant: 'destructive',
      });
    },
  });

  const handleLanguageChange = async (languageCode: UILanguageCode) => {
    // Change language immediately in frontend
    await i18n.changeLanguage(languageCode);
    localStorage.setItem('mendly_ui_language', languageCode);

    // If user is logged in, persist to backend
    if (user) {
      updateLanguageMutation.mutate(languageCode);
    }

    toast({
      title: t('settings.uiLanguage'),
      description: `${t('languageSwitcher.current')} ${
        SUPPORTED_UI_LANGUAGES.find(l => l.code === languageCode)?.nativeName
      }`,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t('languageSwitcher.change')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {SUPPORTED_UI_LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center gap-2"
          >
            <span className="text-lg">{language.flag}</span>
            <span className="flex-1">{language.nativeName}</span>
            {currentLanguage.code === language.code && (
              <span className="text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3.6 Update Dashboard Layout to Include Language Switcher

**File:** `client/src/components/layouts/dashboard-layout.tsx`

Add the language switcher to the header:

```typescript
import { LanguageSwitcher } from '../language-switcher';
import { ThemeToggle } from '../theme-toggle';

// ... existing imports

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo and navigation */}
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {/* User menu */}
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
```

### 3.7 Update Registration Page with Language Switch on Click

**File:** `client/src/pages/auth/register.tsx`

```typescript
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { UILanguageCode } from '../lib/i18n';

export default function Register() {
  const { t, i18n } = useTranslation();
  const [selectedTherapyLanguageId, setSelectedTherapyLanguageId] = useState<number | null>(null);
  const [selectedTherapyLanguages, setSelectedTherapyLanguages] = useState<number[]>([]);

  // Handle therapy language selection
  const handleTherapyLanguageSelect = async (languageId: number, languageCode: string) => {
    // 1. Select therapy language (existing logic)
    if (role === 'patient') {
      setSelectedTherapyLanguageId(languageId);
    } else {
      // Psychologist multi-select logic
      setSelectedTherapyLanguages(prev =>
        prev.includes(languageId)
          ? prev.filter(id => id !== languageId)
          : [...prev, languageId]
      );
    }

    // 2. IMMEDIATELY switch UI language (NEW BEHAVIOR)
    // Map therapy language code to UI language code (they're the same)
    const uiLanguageCode = languageCode as UILanguageCode;

    // Change UI language without page reload
    await i18n.changeLanguage(uiLanguageCode);
    localStorage.setItem('mendly_ui_language', uiLanguageCode);
  };

  // When form is submitted, save both therapy language AND UI language
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentUiLanguage = i18n.language;

    const registrationData = {
      // ... existing fields
      languageId: selectedTherapyLanguageId, // Therapy language
      uiLanguageCode: currentUiLanguage, // UI language (NEW)
    };

    // Submit to backend
    // ...
  };

  return (
    <div className="register-container">
      {/* Step 1: Language Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <h2>{t('registration.step1.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {role === 'patient'
              ? t('registration.step1.patientNote')
              : t('registration.step1.psychologistNote')}
          </p>

          {/* Language grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {languages.map((language) => (
              <button
                key={language.id}
                type="button"
                onClick={() => handleTherapyLanguageSelect(language.id, language.code)}
                className={cn(
                  "language-card",
                  // Highlight selected therapy language(s)
                  (role === 'patient' && selectedTherapyLanguageId === language.id) ||
                  (role === 'psychologist' && selectedTherapyLanguages.includes(language.id))
                    ? "border-primary"
                    : "border-border"
                )}
              >
                <span className="text-3xl">{language.flag}</span>
                <span className="font-medium">{language.nativeName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2-4: Rest of registration form */}
      {/* All labels now use t('...') for translation */}
    </div>
  );
}
```

### 3.8 Update Settings Page with UI Language Section

**File:** `client/src/pages/settings.tsx`

```typescript
import { useTranslation } from 'react-i18next';
import { SUPPORTED_UI_LANGUAGES } from '../lib/i18n';
import { LanguageSwitcher } from '../components/language-switcher';

export default function Settings() {
  const { t, i18n } = useTranslation();

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">{t('settings.title')}</h1>

      {/* Language Settings Section */}
      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">{t('settings.language')}</h2>

        <div className="border rounded-lg p-4 space-y-4">
          {/* UI Language */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.uiLanguage')}</p>
              <p className="text-sm text-muted-foreground">
                {t('profile.changeUiLanguageNote')}
              </p>
              <p className="text-sm text-primary mt-1">
                {t('languageSwitcher.current', {
                  language: SUPPORTED_UI_LANGUAGES.find(
                    l => l.code === i18n.language
                  )?.nativeName
                })}
              </p>
            </div>
            <LanguageSwitcher />
          </div>

          <div className="border-t pt-4">
            {/* Therapy Language - READ ONLY (show current, link to profile to change) */}
            <div>
              <p className="font-medium">{t('settings.therapyLanguage')}</p>
              <p className="text-sm text-muted-foreground">
                {t('profile.changeTherapyLanguageWarning')}
              </p>
              <Button variant="link" asChild className="px-0">
                <a href="/profile">{t('profile.editProfile')}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Other settings sections */}
    </div>
  );
}
```

---

## 4. Backend Implementation

### 4.1 Update User Profile Response to Include `uiLanguageCode`

**File:** `server/routes.ts`

Update the `/api/auth/user` endpoint:

```typescript
// GET /api/auth/user - Get current authenticated user
app.get('/api/auth/user', async (req, res) => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        profile: {
          with: {
            language: true, // Therapy language
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Include uiLanguageCode in response
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      profile: {
        ...user.profile,
        uiLanguageCode: user.profile.uiLanguageCode || 'en', // Include UI language
        language: user.profile.language, // Therapy language (for matching)
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 4.2 Create API Endpoint to Update UI Language

**File:** `server/routes.ts`

Add new endpoint:

```typescript
// PUT /api/user/ui-language - Update user's UI language preference
app.put('/api/user/ui-language', requireAuth(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { uiLanguageCode } = req.body;

    // Validate language code
    const validLanguages = ['en', 'th', 'vi', 'fil', 'id', 'ja', 'ko', 'de', 'fr', 'it', 'tr'];
    if (!validLanguages.includes(uiLanguageCode)) {
      return res.status(400).json({ error: 'Invalid language code' });
    }

    // Update user profile
    await db
      .update(userProfiles)
      .set({
        uiLanguageCode,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.userId, userId));

    res.json({
      success: true,
      message: 'UI language updated successfully',
      uiLanguageCode
    });
  } catch (error) {
    console.error('Error updating UI language:', error);
    res.status(500).json({ error: 'Failed to update UI language' });
  }
});
```

### 4.3 Update Registration Endpoint to Save UI Language

**File:** `server/routes.ts`

Update the `/api/auth/register` endpoint:

```typescript
// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      role,
      languageId, // Therapy language (existing)
      uiLanguageCode, // UI language (NEW)
      // ... other fields
    } = req.body;

    // Validation
    // ... existing validation

    // Validate UI language code
    const validUiLanguages = ['en', 'th', 'vi', 'fil', 'id', 'ja', 'ko', 'de', 'fr', 'it', 'tr'];
    const finalUiLanguageCode = validUiLanguages.includes(uiLanguageCode)
      ? uiLanguageCode
      : 'en'; // Fallback to English

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      email,
      username,
      passwordHash: hashedPassword,
      firstName,
      lastName,
    }).returning();

    // Create user profile
    const [profile] = await db.insert(userProfiles).values({
      userId: newUser.id,
      role,
      languageId, // Therapy language (for matching)
      uiLanguageCode: finalUiLanguageCode, // UI language (for interface) - NEW
      // ... other profile fields
    }).returning();

    // If psychologist, create psychologist profile and language associations
    if (role === 'psychologist') {
      // ... existing psychologist profile creation

      // Insert therapy languages (for matching)
      if (languageIds && languageIds.length > 0) {
        await db.insert(psychologistLanguages).values(
          languageIds.map(langId => ({
            psychologistId: newUser.id,
            languageId: langId,
          }))
        );
      }
    }

    // Create session
    // ... existing session creation

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        profile: {
          ...profile,
          uiLanguageCode: finalUiLanguageCode, // Include in response
        }
      }
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});
```

---

## 5. Language Detection & Geo-Location

### 5.1 Browser Language Detection (Frontend)

This is already handled by `i18next-browser-languagedetector`. Configuration in `client/src/lib/i18n.ts`:

```typescript
const languageDetector = new LanguageDetector(null, {
  order: ['localStorage', 'navigator', 'htmlTag'],
  lookupLocalStorage: 'mendly_ui_language',
  caches: ['localStorage'],
});
```

**Detection Flow:**
1. Check `localStorage` for `mendly_ui_language`
2. Check `navigator.language` (browser setting)
3. Check HTML `lang` attribute
4. Fallback to `en` (English)

### 5.2 Geo-IP Detection (Optional Backend Enhancement)

For more accurate geo-based defaults, you can add geo-IP detection:

**Install Package:**
```bash
npm install geoip-lite
```

**File:** `server/middleware/geo-detection.ts`

```typescript
import geoip from 'geoip-lite';

// Map countries to default UI languages
const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
  'TH': 'th', // Thailand → Thai
  'VN': 'vi', // Vietnam → Vietnamese
  'PH': 'fil', // Philippines → Filipino
  'ID': 'id', // Indonesia → Indonesian
  'JP': 'ja', // Japan → Japanese
  'KR': 'ko', // Korea → Korean
  'DE': 'de', // Germany → German
  'AT': 'de', // Austria → German
  'CH': 'de', // Switzerland → German (could also be fr/it)
  'FR': 'fr', // France → French
  'IT': 'it', // Italy → Italian
  'TR': 'tr', // Turkey → Turkish
  // Default to English for others
};

export function detectLanguageFromIP(req: Request): string {
  try {
    // Get IP from request (handle proxies)
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim()
             || req.headers['x-real-ip']?.toString()
             || req.socket.remoteAddress
             || '';

    // Skip localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.')) {
      return 'en';
    }

    // Lookup geo data
    const geo = geoip.lookup(ip);
    if (!geo) {
      return 'en';
    }

    // Return language for country, or default to English
    return COUNTRY_LANGUAGE_MAP[geo.country] || 'en';
  } catch (error) {
    console.error('Geo-IP detection error:', error);
    return 'en';
  }
}
```

**Usage in API Endpoint:**

```typescript
// GET /api/detect-language - Suggest UI language based on IP
app.get('/api/detect-language', (req, res) => {
  const suggestedLanguage = detectLanguageFromIP(req);
  res.json({
    language: suggestedLanguage,
    source: 'geo-ip'
  });
});
```

**Frontend Usage:**

```typescript
// In App.tsx or language initialization
useEffect(() => {
  const initLanguage = async () => {
    // Check if user has already selected a language
    const storedLanguage = localStorage.getItem('mendly_ui_language');
    if (storedLanguage) {
      return; // User preference takes precedence
    }

    // If not logged in and no stored preference, detect from geo
    if (!user) {
      try {
        const response = await fetch('/api/detect-language');
        const { language } = await response.json();
        i18n.changeLanguage(language);
        localStorage.setItem('mendly_ui_language', language);
      } catch (error) {
        // Fallback to browser language (already handled by i18next)
        console.error('Geo detection failed:', error);
      }
    }
  };

  initLanguage();
}, []);
```

---

## 6. Edge Cases & Testing Scenarios

### 6.1 Edge Cases to Handle

| Scenario | Expected Behavior | Implementation |
|----------|-------------------|----------------|
| **First-time visitor (not logged in)** | Detect browser language → fallback to geo-IP → default to English | i18next language detector + optional geo-IP |
| **Returning visitor (not logged in)** | Use `localStorage` preference | i18next caches in localStorage |
| **User logs in with different UI language** | Backend `uiLanguageCode` overrides localStorage | App.tsx syncs with user profile on login |
| **User changes UI language while logged in** | Update backend + localStorage immediately | LanguageSwitcher mutation + i18n.changeLanguage |
| **User changes therapy language** | UI language remains unchanged | Separate fields: `languageId` vs `uiLanguageCode` |
| **User selects language during registration** | UI switches immediately + saves on submit | onClick handler changes i18n + saves to backend |
| **User logs out** | UI language persists from localStorage | localStorage remains, backend ignored |
| **Guest user (never registers)** | All changes in localStorage only | No backend calls |
| **Invalid language code from backend** | Fallback to English | Validate in frontend before applying |
| **Translation missing for a key** | Display English fallback | i18next `fallbackLng: 'en'` |
| **User has browser in English but selects Thai therapy language** | Therapy language: Thai (for matching), UI language: English (unless changed) | Two separate fields |
| **Psychologist supports multiple therapy languages** | UI language has no effect on languages they support | UI is visual only |
| **Deep link with language parameter (e.g., ?lang=de)** | Optional: Support URL parameter for sharing | Add URL detector to i18next |

### 6.2 Testing Checklist

#### Frontend Testing

- [ ] Language switcher in header works on all pages
- [ ] Registration: Clicking therapy language switches UI immediately
- [ ] Registration: UI language persists through all steps
- [ ] Registration: Submitting form saves both therapy language AND UI language
- [ ] Settings page: Changing UI language updates immediately (no reload)
- [ ] Settings page: UI language change persists after page refresh
- [ ] Profile page: Therapy language is separate from UI language
- [ ] Logout: UI language persists in localStorage
- [ ] Login: User's saved UI language loads from backend
- [ ] All 11 languages load without errors
- [ ] Missing translation keys show English fallback
- [ ] Browser language detection works on first visit
- [ ] localStorage caching works (no repeated detections)

#### Backend Testing

- [ ] Migration adds `ui_language_code` column successfully
- [ ] Existing users get default value (`tr` or `en`)
- [ ] Registration saves `uiLanguageCode` correctly
- [ ] `PUT /api/user/ui-language` validates language codes
- [ ] `PUT /api/user/ui-language` rejects invalid codes
- [ ] `GET /api/auth/user` returns `uiLanguageCode`
- [ ] Changing UI language does NOT affect therapy language
- [ ] Changing therapy language does NOT affect UI language

#### Integration Testing

- [ ] Patient with Thai therapy language + German UI language:
  - Sees German interface
  - Matches with Thai-speaking psychologists only
- [ ] Psychologist with multiple therapy languages + French UI language:
  - Sees French interface
  - Appears in search for all their supported therapy languages
- [ ] Guest user selects German UI → registers as patient with Thai therapy:
  - Interface stays in German
  - Profile shows: therapy language = Thai, UI language = German
- [ ] User changes UI language on desktop → logs in on mobile:
  - Mobile loads the updated UI language from backend

#### Security Testing

- [ ] Cannot set UI language to SQL injection string
- [ ] Cannot set UI language to XSS payload
- [ ] Invalid language codes are rejected by backend
- [ ] Unauthorized users cannot change other users' UI language

---

## 7. Implementation Roadmap

### Phase 1: Database & Backend (Day 1)

1. Run database migration to add `ui_language_code` column
2. Update TypeScript schema in `shared/schema.ts`
3. Create `PUT /api/user/ui-language` endpoint
4. Update `GET /api/auth/user` to include `uiLanguageCode`
5. Update `POST /api/auth/register` to save `uiLanguageCode`
6. Test backend endpoints with Postman/curl

### Phase 2: Frontend Infrastructure (Day 2-3)

1. Install i18n dependencies
2. Create `client/src/lib/i18n.ts` configuration
3. Create initial translation files (English + Turkish)
4. Initialize i18n in `App.tsx`
5. Create `LanguageSwitcher` component
6. Add language switcher to dashboard layout
7. Test language switching (basic)

### Phase 3: Registration Flow (Day 4)

1. Update `register.tsx` to switch UI on therapy language click
2. Add UI language save on registration submit
3. Test registration flow for both patients and psychologists
4. Verify therapy language and UI language are separate

### Phase 4: Settings & Profile (Day 5)

1. Add UI language section to settings page
2. Add language switcher to profile page
3. Test UI language changes persist across sessions
4. Verify therapy language changes don't affect UI language

### Phase 5: Translation Migration (Day 6-10)

1. Extract all hardcoded Turkish text from components
2. Replace with `t('key')` translation calls
3. Create translation keys in `en.json` and `tr.json`
4. Gradually add other language files (vi, fil, id, ja, ko, de, fr, it)
5. Test all pages in multiple languages

### Phase 6: Geo-Detection (Optional - Day 11)

1. Install `geoip-lite` package
2. Create geo-detection middleware
3. Add `/api/detect-language` endpoint
4. Update frontend to use geo-detection for first visit
5. Test with VPN from different countries

### Phase 7: QA & Edge Cases (Day 12-14)

1. Run through all test scenarios
2. Fix bugs and edge cases
3. Performance testing (translation loading)
4. Accessibility testing (language switcher)
5. User acceptance testing

---

## 8. Code Snippets for Common Use Cases

### 8.1 Using Translations in Components

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('dashboard.welcome', { name: 'John' })}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### 8.2 Using Translations with Variables

```typescript
// Translation file
{
  "appointments.sessionWith": "Session with {{psychologistName}} on {{date}}"
}

// Component
const { t } = useTranslation();
const message = t('appointments.sessionWith', {
  psychologistName: 'Dr. Smith',
  date: '2026-01-20'
});
```

### 8.3 Pluralization

```typescript
// Translation file
{
  "appointments.count": "{{count}} appointment",
  "appointments.count_plural": "{{count}} appointments"
}

// Component
const { t } = useTranslation();
const message = t('appointments.count', { count: appointmentCount });
```

### 8.4 Dynamic Language Switch

```typescript
import { useTranslation } from 'react-i18next';

function LanguageButton() {
  const { i18n } = useTranslation();

  const switchToGerman = () => {
    i18n.changeLanguage('de');
  };

  return <button onClick={switchToGerman}>Deutsch</button>;
}
```

### 8.5 Getting Current Language

```typescript
const { i18n } = useTranslation();
const currentLanguage = i18n.language; // e.g., 'en', 'tr', 'de'
```

---

## 9. Important Reminders

### 9.1 DO NOT Change These

❌ **DO NOT modify:**
- `userProfiles.languageId` (therapy language for matching)
- `psychologistLanguages` table (therapy languages)
- `appointments.sessionLanguageId` (immutable appointment language)
- Any matching logic in `/api/psychologists` endpoint
- Language filtering logic

### 9.2 Always Remember

✅ **ALWAYS:**
- Keep therapy language and UI language completely separate
- Update both localStorage AND backend for logged-in users
- Validate language codes on backend
- Provide English fallback for missing translations
- Test with guest users AND logged-in users
- Document which language is being used (therapy vs UI)

### 9.3 Separation of Concerns Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER PROFILE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Therapy Language (languageId)                               │
│  ├─ Used for: Psychologist matching                          │
│  ├─ Stored in: userProfiles.language_id                      │
│  ├─ Changed in: Profile page (with warning)                  │
│  └─ Affects: Search results, appointment booking             │
│                                                              │
│  UI Language (uiLanguageCode)                                │
│  ├─ Used for: Website interface display                      │
│  ├─ Stored in: userProfiles.ui_language_code                 │
│  ├─ Changed in: Settings, language switcher, registration    │
│  └─ Affects: Button labels, messages, navigation             │
│                                                              │
│  ⚠️  THESE TWO ARE COMPLETELY INDEPENDENT                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Next Steps After Implementation

1. **Content Translation**: Hire professional translators for all 11 languages
2. **RTL Support**: Add right-to-left layout support if Arabic is added later
3. **SEO**: Add `hreflang` tags for multi-language SEO
4. **Email Templates**: Translate email templates to match user's UI language
5. **Error Messages**: Ensure all backend error messages are translated
6. **Analytics**: Track language usage to prioritize translation quality
7. **A/B Testing**: Test which default language detection works best
8. **Performance**: Lazy-load translation files for faster initial load

---

## Appendix A: File Structure

```
Mendly/
├── migrations/
│   └── add_ui_language_column.sql          # Database migration
│
├── shared/
│   └── schema.ts                           # Updated with uiLanguageCode
│
├── server/
│   ├── routes.ts                           # Updated endpoints
│   └── middleware/
│       └── geo-detection.ts                # Optional geo-IP detection
│
└── client/src/
    ├── lib/
    │   └── i18n.ts                         # i18n configuration
    │
    ├── locales/                            # Translation files
    │   ├── en.json
    │   ├── th.json
    │   ├── vi.json
    │   ├── fil.json
    │   ├── id.json
    │   ├── ja.json
    │   ├── ko.json
    │   ├── de.json
    │   ├── fr.json
    │   ├── it.json
    │   └── tr.json
    │
    ├── components/
    │   ├── language-switcher.tsx           # Language dropdown
    │   └── layouts/
    │       └── dashboard-layout.tsx        # Updated with switcher
    │
    └── pages/
        ├── auth/
        │   └── register.tsx                # Updated with UI switch
        └── settings.tsx                    # Updated with UI language section
```

---

## Appendix B: Translation File Template

**Structure for each language file:**

```json
{
  "common": {
    "save": "...",
    "cancel": "...",
    "delete": "...",
    "edit": "...",
    "loading": "...",
    "error": "...",
    "success": "..."
  },
  "auth": { ... },
  "registration": { ... },
  "dashboard": { ... },
  "psychologists": { ... },
  "appointments": { ... },
  "messages": { ... },
  "profile": { ... },
  "settings": { ... },
  "payments": { ... },
  "admin": { ... },
  "errors": { ... }
}
```

Start with the most frequently used pages (landing, registration, dashboard, psychologists) and gradually expand.

---

## Summary

This implementation adds **complete UI language support** to your psychology platform while:

✅ **Preserving** all existing therapy language matching logic
✅ **Separating** UI language from therapy language completely
✅ **Providing** seamless language switching without page reloads
✅ **Supporting** 11 languages with geo-detection and fallbacks
✅ **Persisting** user preferences across sessions
✅ **Enabling** instant UI language change during registration

The system is designed to be:
- **Scalable**: Easy to add more languages
- **Performant**: Lazy loading and caching
- **User-friendly**: Instant switching, no reloads
- **Maintainable**: Clear separation of concerns
- **Secure**: Validation on backend

Follow the phased implementation roadmap to deploy this systematically over 2 weeks.
