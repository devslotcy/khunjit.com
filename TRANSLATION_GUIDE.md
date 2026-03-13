# Translation Guide - Mendly Platform

## Quick Reference

### Files Location
```
client/src/i18n/
├── tr.json   ← MASTER (Turkish - Complete)
├── en.json   ← English (Empty - Needs translation)
├── th.json   ← Thai (Empty - Needs translation)
├── vi.json   ← Vietnamese (Empty - Needs translation)
├── fil.json  ← Filipino (Empty - Needs translation)
├── id.json   ← Indonesian (Empty - Needs translation)
├── ja.json   ← Japanese (Empty - Needs translation)
├── ko.json   ← Korean (Empty - Needs translation)
├── de.json   ← German (Empty - Needs translation)
├── fr.json   ← French (Empty - Needs translation)
└── it.json   ← Italian (Empty - Needs translation)
```

### Total Keys: 449

---

## How to Translate

### Step 1: Choose a Language File

Open the file you want to translate (e.g., `en.json` for English)

### Step 2: Open Turkish Reference

Open `tr.json` side-by-side to see the Turkish text

### Step 3: Translate Each Value

**Example from tr.json:**
```json
{
  "common": {
    "save": "Kaydet",
    "cancel": "İptal",
    "back": "Geri"
  }
}
```

**Translate to en.json:**
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "back": "Back"
  }
}
```

### Step 4: Handle Variables

Keep variable placeholders **EXACTLY as they are**:

**Turkish:**
```json
"dashboard.patient.welcome": "Hoş geldiniz, {{firstName}}"
```

**English:**
```json
"dashboard.patient.welcome": "Welcome, {{firstName}}"
```

⚠️ **DO NOT** change `{{firstName}}` - it will be replaced by code at runtime.

### Step 5: Verify Your Work

Run the verification script:
```bash
node scripts/verify-i18n-keys.cjs
```

This will show:
- ✅ If all keys match
- Translation completion percentage
- Any missing or extra keys

---

## Translation Rules

### ✅ DO:
- Keep all keys identical to tr.json
- Preserve variable placeholders: `{{variableName}}`
- Use professional, appropriate language
- Consider cultural context
- Keep similar length to Turkish where possible
- Maintain capitalization style (Title Case, Sentence case, etc.)
- Use UTF-8 encoding

### ❌ DON'T:
- Change key names
- Remove or add keys
- Modify variable placeholders
- Use auto-translation tools (Google Translate, etc.)
- Translate variable names inside `{{ }}`
- Add HTML tags
- Remove punctuation or special characters that affect meaning

---

## Common Patterns

### 1. Simple Strings
```json
// Turkish
"common.save": "Kaydet"

// English
"common.save": "Save"
```

### 2. Strings with Variables
```json
// Turkish
"auth.register.stepIndicator": "Adım {{step}} / {{totalSteps}}"

// English
"auth.register.stepIndicator": "Step {{step}} / {{totalSteps}}"
```

### 3. Pluralization (if needed)
```json
// Turkish
"profile.professionalInfo.specialtiesCount": "Seçili: {{count}} alan"

// English
"profile.professionalInfo.specialtiesCount": "Selected: {{count}} area(s)"
```

### 4. Dates and Times
Preserve placeholders:
```json
// Turkish
"messages.yesterday": "Dün {{time}}"

// English
"messages.yesterday": "Yesterday {{time}}"
```

---

## Translation Priority

Translate in this order for quickest user impact:

### 🔴 Priority 1 - Critical (Core Flows)
1. `common.*` - Buttons, labels (26 keys)
2. `auth.login.*` - Login page (12 keys)
3. `auth.register.*` - Registration (70+ keys)
4. `navigation.*` - Menu items (30 keys)
5. `dashboard.*` - Dashboard pages (80 keys)

### 🟡 Priority 2 - High (Key Features)
6. `appointments.*` - Appointment management (30 keys)
7. `messages.*` - Messaging (15 keys)
8. `payment.*` - Payment flow (50 keys)
9. `profile.*` - Profile settings (40 keys)
10. `availability.*` - Availability (15 keys)

### 🟢 Priority 3 - Medium (Static Content)
11. `landing.*` - Landing page (50 keys)
12. `cities.*` - City names (18 keys)
13. `specialties.*` - Specialties (13 keys)
14. `therapyApproaches.*` - Approaches (9 keys)
15. `titles.*` - Professional titles (6 keys)

### 🔵 Priority 4 - Low
16. `legal.*` - Legal pages (4 keys + content)

---

## Context Guide

### Psychology-Specific Terms

Some terms need special attention:

| Turkish | Context | Notes |
|---------|---------|-------|
| Danışan | Patient/Client | Use culturally appropriate term |
| Psikolog | Psychologist | Professional title |
| Seans | Session | Therapy session |
| Terapi | Therapy | Psychotherapy |
| Randevu | Appointment | Scheduled session |
| Görüşme | Consultation/Meeting | Video call session |

### Professional Titles

Translate appropriately for target country's system:
- "Uzman Psikolog" → May vary (Clinical Psychologist, Licensed Psychologist, etc.)
- "Doç. Dr." → Associate Professor Dr.
- "Prof. Dr." → Professor Dr.

### Cultural Considerations

- **Formality:** Some languages use formal "you" (e.g., German "Sie" vs "du")
- **Gender:** Some languages have gendered words - use neutral where possible
- **Honorifics:** Respect cultural norms for addressing professionals
- **Mental Health Stigma:** Use appropriate, non-stigmatizing language

---

## Example Translation Session

### Turkish (tr.json)
```json
{
  "auth": {
    "login": {
      "title": "KhunJit'e Hoş Geldiniz",
      "description": "Hesabınıza giriş yapın",
      "emailLabel": "Email",
      "passwordLabel": "Şifre",
      "loginButton": "Giriş Yap"
    }
  }
}
```

### German (de.json)
```json
{
  "auth": {
    "login": {
      "title": "Willkommen bei KhunJit",
      "description": "Melden Sie sich bei Ihrem Konto an",
      "emailLabel": "E-Mail",
      "passwordLabel": "Passwort",
      "loginButton": "Anmelden"
    }
  }
}
```

### Thai (th.json)
```json
{
  "auth": {
    "login": {
      "title": "ยินดีต้อนรับสู่ KhunJit",
      "description": "เข้าสู่ระบบบัญชีของคุณ",
      "emailLabel": "อีเมล",
      "passwordLabel": "รหัสผ่าน",
      "loginButton": "เข้าสู่ระบบ"
    }
  }
}
```

---

## Verification Checklist

Before submitting translations:

- [ ] All 449 keys present
- [ ] No empty values (all translated)
- [ ] Variables preserved: `{{firstName}}`, `{{count}}`, etc.
- [ ] JSON syntax valid (use online validator)
- [ ] File saved as UTF-8
- [ ] Ran verification script: `node scripts/verify-i18n-keys.cjs`
- [ ] Spot-checked 10+ random translations in context
- [ ] Professional terminology accurate
- [ ] No auto-translation artifacts
- [ ] Reviewed by native speaker (recommended)

---

## Testing Translations

After translating, test in the application:

1. Switch UI language to your translated language
2. Navigate through all pages:
   - Registration flow
   - Login
   - Dashboard
   - Appointments
   - Messages
   - Profile
   - Settings
3. Check for:
   - Text overflow/truncation
   - Missing translations (fallback to Turkish)
   - Broken layouts
   - Incorrect variable interpolation

---

## Verification Script Output

When you run `node scripts/verify-i18n-keys.cjs`, you'll see:

```
============================================================
    i18n Translation Files Verification
============================================================

Master Language: tr (Turkish)
Total Keys: 449

Key Structure Verification:

✅ tr.json - 449/449 translated (100.0%)
✅ en.json - 0/449 translated (0.0%)
✅ th.json - 0/449 translated (0.0%)
...

============================================================
✅ All files have identical key structure!

Translation Progress:

  tr   [██████████████████████████████] 100.0%
  en   [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0.0%
  th   [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0.0%
  ...

============================================================
```

---

## Getting Help

### If you find issues:

1. **Missing key:** Check if it exists in tr.json with exact same path
2. **Extra key:** Remove it - only use keys from tr.json
3. **JSON syntax error:** Use https://jsonlint.com/ to validate
4. **Variable not working:** Ensure exact match: `{{variableName}}`

### Resources:

- **Master file:** `client/src/i18n/tr.json`
- **Full documentation:** `UI_LANGUAGE_I18N_IMPLEMENTATION.md`
- **Verification script:** `scripts/verify-i18n-keys.cjs`
- **Summary:** `I18N_FILES_CREATED.md`

---

## Quick Start Commands

```bash
# Verify translation files
node scripts/verify-i18n-keys.cjs

# Check file structure
ls -lh client/src/i18n/

# Count translated vs empty
grep -v '""' client/src/i18n/en.json | wc -l  # Translated lines
grep '""' client/src/i18n/en.json | wc -l      # Empty lines

# Validate JSON syntax
node -e "JSON.parse(require('fs').readFileSync('client/src/i18n/en.json'))"
```

---

## Translation Workflow

```
1. Choose language file (e.g., en.json)
   ↓
2. Open tr.json side-by-side
   ↓
3. Translate section by section (start with "common")
   ↓
4. Save file (UTF-8)
   ↓
5. Run verification: node scripts/verify-i18n-keys.cjs
   ↓
6. Fix any issues
   ↓
7. Test in application
   ↓
8. Submit completed file
```

---

**Remember:** Quality over speed. Accurate, culturally appropriate translations are more important than rushing to completion.

Good luck with your translations! 🌍
