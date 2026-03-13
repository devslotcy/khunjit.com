# Email Service Migration Checklist

## Current Email Calls to Update

### 1. Welcome Emails
- [ ] server/routes.ts:304 - Patient/Psychologist registration welcome
- [ ] server/routes.ts:6365 - Admin-triggered welcome

### 2. Booking Confirmed
- [ ] server/routes.ts:5069 - Patient booking confirmation
- [ ] server/routes.ts:5089 - Psychologist booking confirmation
- [ ] server/payments/stripe-checkout.ts:787 - Payment success confirmation

### 3. Appointment Cancelled
- [ ] server/routes.ts:1605 - Cancellation email 1
- [ ] server/routes.ts:1824 - Cancellation email 2
- [ ] server/routes.ts:1841 - Cancellation email 3

### 4. Session Followup
- [ ] server/routes.ts:2347 - After session email

### 5. Verification Emails
- [ ] server/routes.ts:4152 - Verification approved
- [ ] server/routes.ts:4263 - Verification rejected

### 6. Reminders
- [ ] server/email/scheduler.ts:189 - 24h/1h reminders
- [ ] server/email/scheduler.ts:262 - Reminder fallback

## Migration Pattern

### Old Way (example):
```typescript
await emailService.sendWelcome(userId, email, firstName, 'en');
```

### New Way:
```typescript
// Determine user role first
const userProfile = await storage.getUserProfile(userId);
const role = userProfile?.role;

if (role === 'patient') {
  await typeSafeEmailService.sendToPatient({
    userId,
    email,
    eventType: 'welcome',
    variables: { firstName },
    language: 'en'
  });
} else if (role === 'psychologist') {
  await typeSafeEmailService.sendToPsychologist({
    userId,
    email,
    eventType: 'welcome',
    variables: { firstName },
    language: 'en'
  });
}
```

## Testing Strategy
1. Update one email type at a time
2. Test in development environment
3. Verify template path in email_logs table
4. Check recipientRole is correctly set
5. Move to next email type

