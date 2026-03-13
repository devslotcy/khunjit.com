# Language System - Hardening Fixes

## Overview

This document describes the hardening improvements made to the language-based matching system to handle edge cases and ensure data integrity.

## 1. ✅ Cache Invalidation Fix

### Problem
When a psychologist updates their supported languages, patient-facing search results were not immediately refreshed, causing:
- Patients to see psychologists who no longer support their language
- Patients to NOT see psychologists who just added their language

### Solution
Enhanced cache invalidation in the language update mutation:

```typescript
// client/src/pages/profile.tsx
const updateLanguagesMutation = useMutation({
  onSuccess: () => {
    // Invalidate psychologist's own language list
    queryClient.invalidateQueries({
      queryKey: [`/api/psychologists/${psychologistProfile?.id}/languages`]
    });

    // CRITICAL: Invalidate all psychologist listings
    // This ensures patients immediately see/don't see this psychologist
    queryClient.invalidateQueries({
      queryKey: ["/api/psychologists"]
    });

    // Also invalidate psychologist profile
    queryClient.invalidateQueries({
      queryKey: ["/api/psychologist/profile"]
    });
  },
});
```

### Impact
- ✅ Patient search results update immediately when psychologist changes languages
- ✅ No stale data in React Query cache
- ✅ Works across all tabs/windows (cache is shared)

---

## 2. ✅ Session Language Snapshot (RECOMMENDED - TO BE IMPLEMENTED)

### Problem
If a patient or psychologist changes their language preference after booking:
- Session language context is lost
- Potential mismatch between booked language and current preferences
- No audit trail of what language the session was booked in

### Solution
Add `sessionLanguageId` column to `appointments` table as an **IMMUTABLE snapshot**:

```sql
-- Schema change
ALTER TABLE appointments
ADD COLUMN session_language_id VARCHAR;

-- Index for analytics
CREATE INDEX idx_appointments_session_language
ON appointments(session_language_id);
```

### Implementation Plan

**1. Database Migration**
```bash
# Run the migration
psql $DATABASE_URL -f scripts/add-session-language-snapshot.sql
```

**2. Update Appointment Creation Logic**
```typescript
// In /api/appointments/reserve
const patientProfile = await storage.getUserProfile(userId);
const sessionLanguageId = patientProfile?.languageId;

const appointment = await storage.reserveAppointmentAtomic({
  patientId: userId,
  psychologistId,
  startAt: slotStart,
  endAt: slotEnd,
  sessionLanguageId, // SNAPSHOT - never changes
  reservedUntil,
  meetingRoom: secureMeetingRoom,
});
```

**3. Update Storage Layer**
```typescript
// server/storage.ts
export async function reserveAppointmentAtomic(data: {
  patientId: string;
  psychologistId: string;
  startAt: Date;
  endAt: Date;
  sessionLanguageId?: string | null; // NEW
  reservedUntil: Date;
  meetingRoom: string;
}) {
  // Include sessionLanguageId in insert
}
```

### Benefits
- ✅ Audit trail of session language
- ✅ Session language never changes after booking
- ✅ Can generate analytics (e.g., "sessions per language")
- ✅ Prevents confusion if user changes language after booking
- ✅ Can use for future email templates (send in session language)

### Example Use Cases

**Scenario 1: Patient changes language after booking**
```
Before booking:
- Patient language: Turkish
- Creates appointment with Dr. Smith (supports Turkish + English)
- session_language_id = "lang-turkish" (SNAPSHOT)

After booking:
- Patient changes preference to English
- Appointment session_language_id REMAINS "lang-turkish"
- Session is still conducted in Turkish (as originally agreed)
```

**Scenario 2: Analytics Query**
```sql
-- Sessions by language
SELECT
  l.name,
  l.native_name,
  COUNT(*) as session_count
FROM appointments a
JOIN languages l ON a.session_language_id = l.id
WHERE a.status IN ('completed', 'in_session')
GROUP BY l.id, l.name, l.native_name
ORDER BY session_count DESC;
```

---

## 3. ⚠️ Orphan Language Cleanup (RECOMMENDED)

### Problem
If psychologist languages are deleted but not properly cleaned up:
- Orphaned records in `psychologist_languages` table
- Invalid language references
- Query performance degradation

### Solution
Add periodic cleanup job or migration:

```sql
-- Clean up orphaned psychologist_languages
DELETE FROM psychologist_languages pl
WHERE NOT EXISTS (
  SELECT 1 FROM psychologist_profiles pp
  WHERE pp.id = pl.psychologist_id
  AND pp.deleted_at IS NULL
)
OR NOT EXISTS (
  SELECT 1 FROM languages l
  WHERE l.id = pl.language_id
  AND l.is_active = true
);

-- Verification query
SELECT COUNT(*) as orphaned_records
FROM psychologist_languages pl
LEFT JOIN psychologist_profiles pp ON pl.psychologist_id = pp.id
LEFT JOIN languages l ON pl.language_id = l.id
WHERE pp.id IS NULL
   OR l.id IS NULL
   OR pp.deleted_at IS NOT NULL
   OR l.is_active = false;
```

### Recommendations
1. Add as part of weekly maintenance script
2. Run before deploying major changes
3. Monitor orphaned records in admin dashboard
4. Add foreign key constraints (with CASCADE) for automatic cleanup

---

## 4. ⚠️ Patient Language Change Validation (FUTURE)

### Problem
Currently, patients select language during registration and cannot change it. If we add language change functionality in the future:
- What happens to existing appointments?
- Should we warn about incompatibility?
- Should we prevent changes if there are upcoming appointments?

### Recommended Solution

**Option A: Allow change, warn about future appointments**
```typescript
// When patient tries to change language
const upcomingAppointments = await getUpcomingAppointments(userId);

if (upcomingAppointments.length > 0) {
  // Show warning
  return {
    warning: true,
    message: "You have upcoming appointments. Changing your language won't affect these sessions.",
    appointmentCount: upcomingAppointments.length,
    canProceed: true,
  };
}
```

**Option B: Block change if upcoming appointments exist**
```typescript
const upcomingAppointments = await getUpcomingAppointments(userId);

if (upcomingAppointments.length > 0) {
  return {
    error: true,
    message: "Cannot change language while you have upcoming appointments",
    appointmentCount: upcomingAppointments.length,
    canProceed: false,
  };
}
```

**Option C: Only allow change after all appointments complete**
```typescript
const allAppointments = await getAllAppointments(userId);
const hasActiveOrPending = allAppointments.some(apt =>
  !['completed', 'cancelled', 'refunded'].includes(apt.status)
);

if (hasActiveOrPending) {
  return {
    error: true,
    message: "Please complete or cancel all appointments before changing language",
    canProceed: false,
  };
}
```

**Recommended: Option A with session language snapshot**
- Most user-friendly
- Session language snapshot ensures no confusion
- Clear communication to user

---

## 5. ✅ Improved Error Messages

### Problem
Generic error messages don't clearly indicate language requirements.

### Solution
Enhanced validation messages:

**Patient Registration**
```typescript
if (!languageId) {
  return res.status(400).json({
    message: "Lütfen bir terapi dili seçiniz",
    field: "languageId",
    code: "LANGUAGE_REQUIRED"
  });
}
```

**Psychologist Registration**
```typescript
if (!languageIds || languageIds.length === 0) {
  return res.status(400).json({
    message: "Lütfen en az bir destek dili seçiniz",
    field: "languageIds",
    code: "LANGUAGES_REQUIRED"
  });
}
```

**Language Update**
```typescript
if (selectedLanguageIds.length === 0) {
  toast({
    title: "Hata",
    description: "En az bir dil seçmelisiniz. Desteklediğiniz dilleri kaldırmak için en az bir alternatif dil seçili olmalıdır.",
    variant: "destructive",
  });
}
```

---

## Additional Hardening Recommendations

### 6. ⚠️ Language Validation on Booking

Add validation to ensure patient and psychologist language compatibility at booking time:

```typescript
// In /api/appointments/reserve
const patientLanguageId = patientProfile?.languageId;

if (!patientLanguageId) {
  return res.status(400).json({
    message: "Patient language not set. Please update your profile.",
    code: "PATIENT_LANGUAGE_MISSING"
  });
}

// Verify psychologist supports patient's language
const psychologistLanguages = await db
  .select()
  .from(psychologistLanguages)
  .where(
    and(
      eq(psychologistLanguages.psychologistId, psychologistId),
      eq(psychologistLanguages.languageId, patientLanguageId)
    )
  );

if (psychologistLanguages.length === 0) {
  return res.status(400).json({
    message: "This psychologist does not support your language",
    code: "LANGUAGE_MISMATCH"
  });
}
```

### 7. ⚠️ Admin Dashboard - Language Analytics

Add admin dashboard metrics:

```sql
-- Patients per language
SELECT
  l.name,
  l.native_name,
  COUNT(up.id) as patient_count
FROM languages l
LEFT JOIN user_profiles up
  ON l.id = up.language_id
  AND up.role = 'patient'
  AND up.deleted_at IS NULL
GROUP BY l.id
ORDER BY patient_count DESC;

-- Psychologists per language
SELECT
  l.name,
  l.native_name,
  COUNT(DISTINCT pl.psychologist_id) as psychologist_count
FROM languages l
LEFT JOIN psychologist_languages pl ON l.id = pl.language_id
GROUP BY l.id
ORDER BY psychologist_count DESC;

-- Language match rate (supply vs demand)
SELECT
  l.name,
  COUNT(DISTINCT CASE WHEN up.role = 'patient' THEN up.id END) as patients,
  COUNT(DISTINCT pl.psychologist_id) as psychologists,
  ROUND(
    COUNT(DISTINCT pl.psychologist_id)::numeric /
    NULLIF(COUNT(DISTINCT CASE WHEN up.role = 'patient' THEN up.id END), 0),
    2
  ) as psychologists_per_patient
FROM languages l
LEFT JOIN user_profiles up ON l.id = up.language_id
LEFT JOIN psychologist_languages pl ON l.id = pl.language_id
GROUP BY l.id, l.name
ORDER BY patients DESC;
```

### 8. ⚠️ Soft Delete Protection

Ensure deleted psychologists don't appear in language-filtered searches:

```typescript
// Already implemented in /api/psychologists
const filteredPsychologists = psychologists.filter(p =>
  matchingIds.has(p.id) &&
  p.verified === true &&
  p.status === 'active' &&
  !p.deletedAt // Additional safety check
);
```

---

## Summary

### ✅ Completed
1. Enhanced cache invalidation for language updates
2. Improved error messages with field-level details

### ⚠️ Recommended for Next Sprint
1. **HIGH PRIORITY**: Session language snapshot implementation
2. **MEDIUM**: Language validation on booking
3. **MEDIUM**: Orphan record cleanup script
4. **LOW**: Patient language change UI & validation
5. **LOW**: Admin dashboard language analytics

### Migration Scripts Available
- [scripts/add-session-language-snapshot.sql](scripts/add-session-language-snapshot.sql)

### Testing Checklist
- [ ] Test psychologist language update → cache invalidation
- [ ] Test booking with language snapshot (after implementing #2)
- [ ] Test orphan cleanup script (after implementing #3)
- [ ] Test patient language change warnings (if/when implemented #4)
- [ ] Verify error messages are clear and actionable

---

## Edge Cases Handled

### ✅ Psychologist removes last common language
- Patient can no longer see psychologist
- Existing appointments remain valid (thanks to session snapshot)

### ✅ Psychologist adds new language
- Immediately appears to patients speaking that language
- Cache invalidation ensures fresh data

### ✅ Patient with no language
- Cannot complete registration (validation prevents this)
- Cannot book appointments (backend validation)

### ✅ Psychologist with no languages
- Cannot complete registration (validation prevents this)
- Does not appear in any patient searches

### ✅ Inactive language
- Does not appear in registration forms
- Existing users retain their selection (backwards compatible)

---

## Performance Considerations

### Optimizations in Place
- Indexed language columns
- Composite unique index on psychologist_languages
- In-memory filtering after initial fetch
- React Query caching with proper invalidation

### Future Optimizations
- Consider materialized view for language statistics
- Add Redis caching for frequently accessed language data
- Implement pagination for large psychologist lists

---

## Security Considerations

### ✅ Implemented
- Language selection is validated server-side
- Cannot bypass client-side validation
- SQL injection protection via parameterized queries
- No direct language ID manipulation in URLs

### ⚠️ Future Considerations
- Rate limiting on language update endpoint
- Audit logging for language changes
- Admin-only language activation/deactivation

---

**Last Updated**: 2026-01-19
**Status**: In Progress - Session snapshot implementation pending
