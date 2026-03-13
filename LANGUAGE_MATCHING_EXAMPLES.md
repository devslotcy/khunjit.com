# Language Matching - SQL Examples & Edge Cases

## Example Queries

### 1. Get All Available Languages

```sql
SELECT id, code, name, native_name
FROM languages
WHERE is_active = true
ORDER BY name;
```

**Result:**
```
id                  | code | name        | native_name
--------------------|------|-------------|-------------------
uuid-de             | de   | German      | Deutsch
uuid-en             | en   | English     | English
uuid-fil            | fil  | Filipino    | Filipino
uuid-fr             | fr   | French      | Français
uuid-id             | id   | Indonesian  | Bahasa Indonesia
uuid-it             | it   | Italian     | Italiano
uuid-ja             | ja   | Japanese    | 日本語
uuid-ko             | ko   | Korean      | 한국어
uuid-th             | th   | Thai        | ไทย
uuid-tr             | tr   | Turkish     | Türkçe
uuid-vi             | vi   | Vietnamese  | Tiếng Việt
```

### 2. Get Patient's Language

```sql
SELECT
  u.first_name,
  u.last_name,
  l.name as language_name,
  l.native_name
FROM users u
JOIN user_profiles up ON u.id = up.user_id
JOIN languages l ON up.language_id = l.id
WHERE up.role = 'patient'
  AND u.id = 'patient-uuid';
```

**Example Result:**
```
first_name | last_name | language_name | native_name
-----------|-----------|---------------|------------
Ahmet      | YILMAZ    | Turkish       | Türkçe
```

### 3. Get Psychologist's Languages

```sql
SELECT
  pp.full_name,
  l.code,
  l.name,
  l.native_name
FROM psychologist_profiles pp
JOIN psychologist_languages pl ON pp.id = pl.psychologist_id
JOIN languages l ON pl.language_id = l.id
WHERE pp.user_id = 'psychologist-uuid'
ORDER BY l.name;
```

**Example Result:**
```
full_name        | code | name    | native_name
-----------------|------|---------|------------
Dr. Sarah Smith  | en   | English | English
Dr. Sarah Smith  | th   | Thai    | ไทย
Dr. Sarah Smith  | tr   | Turkish | Türkçe
```

### 4. Find Psychologists Supporting a Language

```sql
SELECT
  pp.id,
  pp.full_name,
  pp.title,
  pp.price_per_session
FROM psychologist_profiles pp
JOIN psychologist_languages pl ON pp.id = pl.psychologist_id
JOIN languages l ON pl.language_id = l.id
WHERE l.code = 'tr'  -- Turkish
  AND pp.verified = true
  AND pp.status = 'active'
  AND pp.deleted_at IS NULL;
```

**Example Result:**
```
id          | full_name        | title         | price_per_session
------------|------------------|---------------|------------------
uuid-1      | Dr. Sarah Smith  | Psychologist  | 500.00
uuid-2      | Ahmet Kaya       | Psychologist  | 450.00
```

### 5. Find Matching Psychologists for a Patient

```sql
-- Get patient's language
WITH patient_language AS (
  SELECT language_id
  FROM user_profiles
  WHERE user_id = 'patient-uuid'
)
-- Find psychologists who support that language
SELECT DISTINCT
  pp.id,
  pp.full_name,
  pp.title,
  pp.bio,
  pp.price_per_session,
  pp.specialties
FROM psychologist_profiles pp
JOIN psychologist_languages pl ON pp.id = pl.psychologist_id
WHERE pl.language_id = (SELECT language_id FROM patient_language)
  AND pp.verified = true
  AND pp.verification_status = 'approved'
  AND pp.status = 'active'
  AND pp.deleted_at IS NULL
ORDER BY pp.full_name;
```

### 6. Count Patients by Language

```sql
SELECT
  l.name,
  l.native_name,
  COUNT(up.id) as patient_count
FROM languages l
LEFT JOIN user_profiles up ON l.id = up.language_id AND up.role = 'patient'
GROUP BY l.id, l.name, l.native_name
ORDER BY patient_count DESC, l.name;
```

**Example Result:**
```
name        | native_name        | patient_count
------------|--------------------|--------------
English     | English            | 45
Turkish     | Türkçe             | 32
Thai        | ไทย                | 28
Vietnamese  | Tiếng Việt         | 15
German      | Deutsch            | 8
Korean      | 한국어              | 5
Japanese    | 日本語              | 3
French      | Français           | 2
Indonesian  | Bahasa Indonesia   | 1
Italian     | Italiano           | 0
Filipino    | Filipino | 0
```

### 7. Count Psychologists by Language

```sql
SELECT
  l.name,
  l.native_name,
  COUNT(DISTINCT pl.psychologist_id) as psychologist_count
FROM languages l
LEFT JOIN psychologist_languages pl ON l.id = pl.language_id
GROUP BY l.id, l.name, l.native_name
ORDER BY psychologist_count DESC, l.name;
```

**Example Result:**
```
name        | native_name        | psychologist_count
------------|--------------------|-----------------
English     | English            | 25
Thai        | ไทย                | 18
Turkish     | Türkçe             | 12
Vietnamese  | Tiếng Việt         | 8
German      | Deutsch            | 5
Korean      | 한국어              | 3
```

### 8. Find Multilingual Psychologists

```sql
SELECT
  pp.id,
  pp.full_name,
  COUNT(pl.language_id) as language_count,
  STRING_AGG(l.name, ', ' ORDER BY l.name) as languages
FROM psychologist_profiles pp
JOIN psychologist_languages pl ON pp.id = pl.psychologist_id
JOIN languages l ON pl.language_id = l.id
WHERE pp.verified = true
  AND pp.status = 'active'
GROUP BY pp.id, pp.full_name
HAVING COUNT(pl.language_id) > 1
ORDER BY language_count DESC, pp.full_name;
```

**Example Result:**
```
id     | full_name        | language_count | languages
-------|------------------|----------------|-------------------------
uuid-1 | Dr. Sarah Smith  | 3              | English, Thai, Turkish
uuid-2 | Kim Min-jun      | 2              | English, Korean
uuid-3 | Hans Müller      | 2              | English, German
```

### 9. Verify Patient-Psychologist Language Match

```sql
-- Check if a specific psychologist supports the patient's language
SELECT
  u.first_name as patient_name,
  pl_lang.name as patient_language,
  pp.full_name as psychologist_name,
  CASE
    WHEN pl.id IS NOT NULL THEN 'YES - Match Found'
    ELSE 'NO - No Match'
  END as can_book
FROM users u
JOIN user_profiles up ON u.id = up.user_id
JOIN languages pl_lang ON up.language_id = pl_lang.id
CROSS JOIN psychologist_profiles pp
LEFT JOIN psychologist_languages pl
  ON pp.id = pl.psychologist_id
  AND pl.language_id = up.language_id
WHERE u.id = 'patient-uuid'
  AND pp.id = 'psychologist-uuid';
```

**Example Results:**

**Scenario A - Match Found:**
```
patient_name | patient_language | psychologist_name | can_book
-------------|------------------|-------------------|------------------
Ahmet        | Turkish          | Dr. Sarah Smith   | YES - Match Found
```

**Scenario B - No Match:**
```
patient_name | patient_language | psychologist_name | can_book
-------------|------------------|-------------------|-------------
Ahmet        | Turkish          | Dr. Nguyen Thi    | NO - No Match
```

### 10. Find Patients Without Language (Data Validation)

```sql
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  up.role
FROM users u
JOIN user_profiles up ON u.id = up.user_id
WHERE up.role = 'patient'
  AND up.language_id IS NULL;
```

This should return **zero rows** if all validations are working correctly.

### 11. Find Psychologists Without Languages (Data Validation)

```sql
SELECT
  pp.id,
  pp.full_name,
  pp.user_id,
  pp.status
FROM psychologist_profiles pp
LEFT JOIN psychologist_languages pl ON pp.id = pl.psychologist_id
WHERE pl.id IS NULL
  AND pp.deleted_at IS NULL;
```

This should return **zero rows** for active psychologists if all validations are working correctly.

## Edge Cases & Examples

### Edge Case 1: Patient Changes Language (Future Feature)

**Current State:**
```sql
-- Patient's current language
SELECT language_id FROM user_profiles WHERE user_id = 'patient-123';
-- Returns: 'lang-turkish'
```

**If patient changes to English:**
```sql
UPDATE user_profiles
SET language_id = 'lang-english'
WHERE user_id = 'patient-123';
```

**Impact:**
- Patient will now see different set of psychologists
- Existing bookings with Turkish-only psychologists remain valid
- Future bookings will be with English-supporting psychologists

### Edge Case 2: Psychologist Removes a Language

**Before:**
```sql
-- Psychologist supports: English, Turkish, Thai
SELECT l.name
FROM psychologist_languages pl
JOIN languages l ON pl.language_id = l.id
WHERE pl.psychologist_id = 'psych-123';
-- Returns: English, Thai, Turkish
```

**Psychologist removes Turkish:**
```sql
DELETE FROM psychologist_languages
WHERE psychologist_id = 'psych-123'
  AND language_id = 'lang-turkish';
```

**Impact:**
- Turkish-speaking patients can no longer see this psychologist
- Existing appointments with Turkish patients remain valid
- Psychologist still supports English and Thai

### Edge Case 3: New Language Addition

**Add a new language:**
```sql
INSERT INTO languages (code, name, native_name, is_active)
VALUES ('es', 'Spanish', 'Español', true);
```

**Impact:**
- Immediately available in registration forms
- Existing users can add it to their profiles
- No automatic association with existing users

## Performance Considerations

### Index Usage

```sql
-- Check index usage on psychologist_languages
EXPLAIN ANALYZE
SELECT pp.*
FROM psychologist_profiles pp
JOIN psychologist_languages pl ON pp.id = pl.psychologist_id
WHERE pl.language_id = 'lang-english';

-- Should show index scan on idx_psychologist_languages_language
```

### Query Optimization

**Inefficient (multiple queries):**
```typescript
// DON'T DO THIS
for (const psychologist of psychologists) {
  const languages = await getLanguages(psychologist.id);
  psychologist.languages = languages;
}
```

**Efficient (single query with join):**
```typescript
// DO THIS
const psychologistsWithLanguages = await db
  .select()
  .from(psychologistProfiles)
  .leftJoin(psychologistLanguages, eq(...))
  .leftJoin(languages, eq(...));
```

## Data Integrity Checks

### Check 1: All Active Psychologists Have Languages

```sql
SELECT
  COUNT(*) as psychologists_without_languages
FROM psychologist_profiles pp
LEFT JOIN psychologist_languages pl ON pp.id = pl.psychologist_id
WHERE pp.verified = true
  AND pp.status = 'active'
  AND pp.deleted_at IS NULL
  AND pl.id IS NULL;
```

Expected: **0**

### Check 2: All Active Patients Have a Language

```sql
SELECT
  COUNT(*) as patients_without_language
FROM user_profiles up
WHERE up.role = 'patient'
  AND up.status = 'active'
  AND up.deleted_at IS NULL
  AND up.language_id IS NULL;
```

Expected: **0**

### Check 3: No Invalid Language References

```sql
-- Check user_profiles
SELECT COUNT(*)
FROM user_profiles up
LEFT JOIN languages l ON up.language_id = l.id
WHERE up.language_id IS NOT NULL
  AND l.id IS NULL;

-- Check psychologist_languages
SELECT COUNT(*)
FROM psychologist_languages pl
LEFT JOIN languages l ON pl.language_id = l.id
WHERE l.id IS NULL;
```

Both Expected: **0**

## Summary

These SQL examples demonstrate:
- ✅ How to query language data
- ✅ How matching works at the database level
- ✅ How to validate data integrity
- ✅ How to handle edge cases
- ✅ Performance optimization patterns

Use these queries for:
- Debugging matching issues
- Data validation
- Analytics and reporting
- Understanding the system architecture
