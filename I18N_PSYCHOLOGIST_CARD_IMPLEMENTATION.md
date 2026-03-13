# Psychologist Card Internationalization Implementation

## Overview
This document summarizes the complete internationalization (i18n) implementation for psychologist cards and profile components across the Mendly platform.

## Problem Statement
- **Specialty tags** (e.g., "Bireysel Terapi", "Depresyon") were stored as Turkish strings in the database
- **Experience labels** ("6 yıl deneyim") were hardcoded in Turkish
- **Duration labels** ("dk") were not localized
- **Other UI labels** ("Seans ücreti", "Randevu Al") were hardcoded in Turkish

This prevented the application from displaying content in the user's selected language.

## Solution Architecture

### 1. Database Migration
**File**: `/migrations/010_convert_specialties_to_i18n_keys.sql`

- Created PostgreSQL functions to map Turkish labels to i18n keys
- Updated all existing psychologist profiles in the database
- Converted specialties and therapy approaches to language-neutral keys

**Mapping Table (Turkish → i18n key)**:

| Turkish Label | i18n Key |
|--------------|----------|
| Bireysel Terapi | individual |
| Çift Terapisi | couples |
| Aile Terapisi | family |
| Çocuk ve Ergen | childAdolescent |
| Depresyon | depression |
| Anksiyete | anxiety |
| Travma ve TSSB | trauma |
| OKB | ocd |
| Yeme Bozuklukları | eatingDisorders |
| Bağımlılık | addiction |
| Kariyer Danışmanlığı | careerCounseling |
| Stres Yönetimi | stressManagement |
| Öfke Yönetimi | angerManagement |

### 2. Frontend Components Updated

#### [psychologist-card.tsx](client/src/components/psychologist-card.tsx)
- Added `useTranslation` hook
- Created `SpecialtyTags` component with i18n support
- Localized experience label with pluralization
- Localized duration (minutes)
- Localized session fee, booking button labels

#### [profile-sidebar.tsx](client/src/components/profile-sidebar.tsx)
- Added `useTranslation` hook
- Localized specialty tags
- Localized experience, session duration, languages labels
- Localized about, education, certifications headings
- Localized booking button and reservation warning

#### Components Still Using Hardcoded Text
The following component still needs updating (not critical for initial release):
- `/client/src/pages/patient/psychologist-detail.tsx` - Has some hardcoded Turkish strings that should be localized

### 3. i18n Translation Keys Added

All 11 supported languages now include:

#### `specialties.*` (already existed, now used)
```json
{
  "individual": "Individual Therapy",
  "couples": "Couples Therapy",
  "family": "Family Therapy",
  "childAdolescent": "Child & Adolescent Therapy",
  "depression": "Depression",
  "anxiety": "Anxiety Disorders",
  "trauma": "Trauma & PTSD",
  "ocd": "OCD",
  "eatingDisorders": "Eating Disorders",
  "addiction": "Addiction & Substance Use",
  "careerCounseling": "Career Counseling",
  "stressManagement": "Stress Management",
  "angerManagement": "Anger Management"
}
```

#### `card.*` (new section)
```json
{
  "sessionFee": "Session fee",
  "fee": "Fee",
  "bookAppointment": "Book Appointment",
  "priceNotSpecified": "Not specified",
  "selectedAppointment": "Selected appointment",
  "reservationWarning": "Appointments are cancelled if not paid within 10 minutes",
  "experience": {
    "yearsLong": "{{count}} years of experience",
    "yearsShort": "{{count}} yrs"
  }
}
```

#### `duration.*` (new section)
```json
{
  "minutesShort": "min",
  "minutesLong": "{{count}} minutes"
}
```

#### `profile.*` (extended existing section)
```json
{
  "experience": "Experience",
  "sessionDuration": "Session Duration",
  "languages": "Languages",
  "about": "About",
  "education": "Education",
  "certifications": "Certifications"
}
```

### 4. Pluralization Support

Languages with plural forms (English, German, French, Italian) include proper pluralization rules:

**English Example**:
```json
"yearsLong_one": "{{count}} year of experience",
"yearsLong_other": "{{count}} years of experience"
```

**Turkish** (no plural suffix needed):
```json
"yearsLong": "{{count}} yıl deneyim"
```

## Files Changed

### Migration Files
- `/migrations/010_i18n_specialty_mapping.ts` - Mapping reference
- `/migrations/010_convert_specialties_to_i18n_keys.sql` - Database migration

### Frontend Components
- `/client/src/components/psychologist-card.tsx`
- `/client/src/components/profile-sidebar.tsx`

### i18n Translation Files (All 11 Languages)
- `/client/src/i18n/en.json` (English)
- `/client/src/i18n/tr.json` (Turkish)
- `/client/src/i18n/th.json` (Thai)
- `/client/src/i18n/vi.json` (Vietnamese)
- `/client/src/i18n/fil.json` (Filipino)
- `/client/src/i18n/id.json` (Indonesian)
- `/client/src/i18n/ja.json` (Japanese)
- `/client/src/i18n/ko.json` (Korean)
- `/client/src/i18n/de.json` (German)
- `/client/src/i18n/fr.json` (French)
- `/client/src/i18n/it.json` (Italian)

## Testing Checklist

- [x] Database migration runs successfully
- [x] Specialty tags display translated text based on language selection
- [x] Experience label shows correct pluralization
  - EN: "1 year" vs "2 years"
  - TR: "1 yıl" vs "2 yıl" (no plural change)
- [x] Duration (minutes) displays correctly: "min" (EN) vs "dk" (TR)
- [x] Session fee label localized
- [x] Book appointment button localized
- [x] No hardcoded Turkish strings in updated components

## Usage Example

```tsx
// Before (hardcoded Turkish)
<Badge>{specialty}</Badge>  // "Bireysel Terapi"
<span>6 yıl deneyim</span>
<span>50 dk</span>

// After (i18n)
<Badge>{t(`specialties.${specialtyKey}`)}</Badge>  // "Individual Therapy" or "Bireysel Terapi"
<span>{t("card.experience.yearsLong", { count: 6 })}</span>  // "6 years of experience" or "6 yıl deneyim"
<span>{t("duration.minutesShort")}</span>  // "min" or "dk"
```

## Future Enhancements

1. **Complete psychologist-detail.tsx localization** - Update remaining hardcoded strings
2. **Admin panel** - Update admin verification page to use i18n keys
3. **Add more therapy approaches** - Extend the mapping as new approaches are added
4. **Server-side validation** - Add validation to ensure only valid specialty keys are stored

## Rollback Plan

If issues arise, rollback by:
1. Restore database from backup table: `psychologist_profiles_backup_specialties`
2. Revert frontend components to use Turkish strings directly
3. Run: `git revert <commit-hash>`

## Quality Assurance

✅ All translation keys are present in all 11 language files
✅ No missing translations
✅ Proper pluralization for applicable languages
✅ Database successfully migrated
✅ Components render correctly with different language selections
✅ No hardcoded strings in `psychologist-card.tsx` and `profile-sidebar.tsx`
