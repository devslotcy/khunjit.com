# Email Template Migration Plan

## Goal
Reorganize templates to prevent role mixup bugs using structure: `{language}/{role}/{template}`

## Template Mapping

### Patient Templates (server/email/templates/{lang}/patient/)
- welcome.html (from welcome.html)
- appointment-confirmed.html (from booking-confirmed-patient.html)
- appointment-cancelled.html (from appointment-cancelled.html - patient version)
- reminder-24h.html (from reminder.html)
- reminder-1h.html (from reminder.html)
- session-followup.html (from after-session.html)

### Psychologist Templates (server/email/templates/{lang}/psychologist/)
- welcome.html (from welcome.html - needs psychologist-specific messaging)
- appointment-confirmed.html (from booking-confirmed-psychologist.html)
- appointment-cancelled.html (from appointment-cancelled.html - psychologist version)
- reminder-24h.html (from reminder.html)
- reminder-1h.html (from reminder.html)
- verification-approved.html (from verification-approved.html)
- verification-rejected.html (from verification-rejected.html)

## Migration Steps
1. Create patient/ and psychologist/ subdirectories under each language
2. Copy and rename templates to new structure
3. Keep old templates temporarily for backward compatibility
4. Update service.ts to use new structure with role parameter
5. Update all callers to specify role
6. Remove old templates after verification

## Notes
- Old structure will be deprecated but remain as fallback
- New code MUST use role-specific paths
- Template loader will fail loud if role is missing for new templates
