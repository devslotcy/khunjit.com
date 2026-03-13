# Language-Based Matching System - Implementation Guide

## Overview

This document describes the comprehensive language-based matching system implemented for the online psychology platform. The system ensures that patients can only see and book sessions with psychologists who support their preferred communication language.

## Key Principles

1. **Language-Only Matching**: Matching is based ONLY on language selection. Country, location, or IP address have NO effect on matching.
2. **Patient Selection**: Each patient selects EXACTLY ONE language during registration.
3. **Psychologist Selection**: Each psychologist selects ONE OR MORE languages during registration.
4. **Strict Filtering**: Patients can ONLY see psychologists who support their selected language.
5. **Data-Driven**: All language logic is data-driven, not hardcoded.

## Supported Languages

The platform supports exactly 11 languages:

1. English (en)
2. Thai (th)
3. Vietnamese (vi)
4. Filipino (fil)
5. Indonesian (id)
6. Japanese (ja)
7. Korean (ko)
8. German (de)
9. French (fr)
10. Italian (it)
11. Turkish (tr)

## Database Schema

### 1. Languages Table

```sql
CREATE TABLE languages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,  -- e.g., "en", "tr", "th"
  name VARCHAR(50) NOT NULL,         -- e.g., "English", "Turkish"
  native_name VARCHAR(50),           -- e.g., "English", "Türkçe", "ไทย"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### 2. User Profiles (Patient Language)

```sql
ALTER TABLE user_profiles
ADD COLUMN language_id VARCHAR;  -- Patient's single communication language
```

- **For Patients**: This field is REQUIRED and stores the patient's chosen therapy language.
- **For Psychologists**: This field is NULL (psychologists use the pivot table instead).

### 3. Psychologist Languages (Pivot Table)

```sql
CREATE TABLE psychologist_languages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id VARCHAR NOT NULL,  -- References psychologist_profiles.id
  language_id VARCHAR NOT NULL,      -- References languages.id
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_psychologist_languages_psychologist ON psychologist_languages(psychologist_id);
CREATE INDEX idx_psychologist_languages_language ON psychologist_languages(language_id);
CREATE UNIQUE INDEX idx_psychologist_languages_unique ON psychologist_languages(psychologist_id, language_id);
```

## API Endpoints

### 1. Get All Languages

```
GET /api/languages
```

**Response:**
```json
[
  {
    "id": "uuid",
    "code": "en",
    "name": "English",
    "nativeName": "English",
    "isActive": true
  },
  ...
]
```

### 2. Get Psychologist's Languages

```
GET /api/psychologists/:id/languages
```

**Response:**
```json
[
  {
    "id": "uuid",
    "code": "en",
    "name": "English",
    "nativeName": "English"
  },
  ...
]
```

### 3. Update Psychologist's Languages

```
PUT /api/psychologist/languages
```

**Request Body:**
```json
{
  "languageIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Requirements:**
- Psychologist must be authenticated
- At least one language is required
- Replaces all existing language associations

### 4. Get Psychologists (with Language Filtering)

```
GET /api/psychologists?patientLanguageId={uuid}
```

**Behavior:**
- If `patientLanguageId` is provided, only returns psychologists who support that language
- This is the CRITICAL matching filter that ensures language-based matching

## Registration Flow

### Patient Registration

1. **Step 1**: Language Selection (FIRST field in the form)
   - Select box with all 11 languages
   - Required field - cannot proceed without selection
   - Stored in `user_profiles.language_id`

2. **Steps 2-3**: Other profile information

### Psychologist Registration

1. **Step 1**: Language Selection (FIRST field in the form)
   - Multi-select checkbox list with all 11 languages
   - Required field - must select at least one language
   - Stored in `psychologist_languages` pivot table

2. **Steps 2-4**: Other profile and professional information

## Matching Logic

### How It Works

1. **Patient browses psychologists:**
   ```javascript
   // Frontend fetches user profile to get patient's languageId
   const { data: userProfile } = useQuery(["/api/profile"]);
   const patientLanguageId = userProfile?.languageId;

   // Passes languageId to psychologist listing
   const { data: psychologists } = useQuery([
     "/api/psychologists",
     { patientLanguageId }
   ]);
   ```

2. **Backend filters psychologists:**
   ```typescript
   // Get psychologist IDs that support the patient's language
   const matching = await db
     .select({ psychologistId: psychologistLanguages.psychologistId })
     .from(psychologistLanguages)
     .where(eq(psychologistLanguages.languageId, patientLanguageId));

   const matchingIds = new Set(matching.map(p => p.psychologistId));

   // Filter psychologists to only include matching ones
   filteredPsychologists = psychologists.filter(p => matchingIds.has(p.id));
   ```

### Examples

**Scenario 1: Turkish-speaking patient**
- Patient selects "Turkish" during registration
- Patient can ONLY see psychologists who selected Turkish in their languages
- Vietnamese, Thai, English-only psychologists are NOT shown

**Scenario 2: Multilingual psychologist**
- Psychologist selects Turkish, English, and German
- Appears in Turkish-speaking patients' search results
- Appears in English-speaking patients' search results
- Appears in German-speaking patients' search results
- Does NOT appear to Vietnamese, Thai, or other language patients

## Profile Management

### Patient Profile
- Patients can view their selected language in their profile
- Language selection is made during registration and typically doesn't change
- Future enhancement: Allow patients to change their language preference

### Psychologist Profile
- Psychologists have a dedicated "Language Management" section in their profile
- Can add or remove supported languages at any time
- Must have at least one language selected
- Changes immediately affect which patient pools they appear in

## Data Validation

### Registration Validation

```typescript
// Patient validation
if (role === "patient" && !languageId) {
  return res.status(400).json({
    message: "Lütfen bir dil seçiniz"
  });
}

// Psychologist validation
if (role === "psychologist" && (!languageIds || languageIds.length === 0)) {
  return res.status(400).json({
    message: "Lütfen en az bir dil seçiniz"
  });
}
```

### Profile Update Validation

```typescript
// Psychologist language update
if (!languageIds || !Array.isArray(languageIds) || languageIds.length === 0) {
  return res.status(400).json({
    message: "At least one language is required"
  });
}
```

## Future Enhancements

The language system is designed to support:

1. **Email Templates**: Send emails in the user's preferred language
2. **Notifications**: Push notifications in the user's language
3. **Payment Descriptions**: Payment receipt descriptions in the user's language
4. **UI Translations**: Full UI translation based on user's language preference
5. **Session Notes**: Psychologists can write session notes in the appropriate language
6. **Search & Filtering**: Advanced search filters for multiple languages

## Migration & Deployment

### Running the Migration

```bash
# Option 1: Run the TypeScript migration script
npx tsx scripts/run-language-migration.ts

# Option 2: Run the SQL file directly (if you have direct DB access)
psql $DATABASE_URL -f scripts/add-language-tables.sql
```

### Verification

After migration, verify:

1. Languages table has 11 rows:
   ```sql
   SELECT COUNT(*) FROM languages;  -- Should be 11
   ```

2. All languages are active:
   ```sql
   SELECT code, name FROM languages WHERE is_active = true ORDER BY name;
   ```

3. Tables exist:
   ```sql
   \dt languages
   \dt psychologist_languages
   \d user_profiles  -- Should show language_id column
   ```

## Testing Scenarios

### Test 1: Patient Registration
1. Register as a patient
2. Select "English" as therapy language
3. Complete registration
4. Verify `user_profiles.language_id` is set

### Test 2: Psychologist Registration
1. Register as a psychologist
2. Select "English", "Thai", and "Turkish"
3. Complete registration
4. Verify 3 rows in `psychologist_languages` table

### Test 3: Language Filtering
1. Create patient with Thai language
2. Create psychologist A with Thai and English
3. Create psychologist B with only Vietnamese
4. Login as Thai patient
5. Browse psychologists
6. Verify only psychologist A is shown

### Test 4: Language Update
1. Login as psychologist
2. Go to profile page
3. Add/remove languages
4. Save changes
5. Verify changes in database and patient-facing listings

## Edge Cases

### Edge Case 1: Psychologist with No Languages
- **Prevention**: Validation prevents saving with 0 languages
- **UI**: Save button is disabled when no languages selected
- **Backend**: Returns 400 error if attempted

### Edge Case 2: Patient Changes Language (Future)
- **Current**: Language is set during registration
- **Future**: If patient changes language, their psychologist matches will change
- **Consideration**: May need to warn about existing bookings with incompatible psychologists

### Edge Case 3: Language Deactivation
- **Current**: All 11 languages are active
- **Future**: If a language is deactivated (is_active = false), it should be hidden from registration but existing users retain their selection

### Edge Case 4: New Language Addition
- **Process**: Insert into `languages` table with new code and names
- **Impact**: Immediately available for selection
- **Consideration**: Existing users won't automatically get the new language

## Technical Notes

### Why Pivot Table for Psychologists?
- Psychologists can support multiple languages
- Many-to-many relationship requires a pivot table
- Efficient querying for language-based filtering
- Easy to add/remove language associations

### Why Single Column for Patients?
- Patients select exactly ONE therapy language
- Simple one-to-many relationship
- Denormalized for query performance
- Future: Could convert to pivot table if patients need multiple languages

### Performance Considerations
- Indexes on `psychologist_id` and `language_id` for fast lookups
- Composite unique index prevents duplicate associations
- Language list is cached (11 rows, rarely changes)
- Filtering happens in-memory after initial psychologist fetch

## Troubleshooting

### Problem: Languages not showing in registration
**Solution**: Verify migration ran successfully and languages table has data

### Problem: Patient sees all psychologists regardless of language
**Solution**: Check that `patientLanguageId` is being passed to the API

### Problem: Psychologist language update fails
**Solution**: Verify psychologist is authenticated and at least one language is selected

### Problem: New psychologist not appearing in patient search
**Solution**: Verify psychologist:
1. Has completed registration
2. Is verified/approved
3. Has selected at least one language
4. That language matches the patient's language

## Summary

The language-based matching system provides:
- ✅ Strict language-based filtering
- ✅ No country or location-based logic
- ✅ Data-driven, flexible architecture
- ✅ Easy to maintain and extend
- ✅ Clear separation between patient (single language) and psychologist (multiple languages)
- ✅ Future-proof for internationalization

The implementation is complete and ready for production use.
