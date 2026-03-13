# Email System Quick Reference

## 🚀 Quick Start

### Import
```typescript
import {
  sendWelcomeEmail,
  sendAppointmentConfirmedToPatient,
  sendAppointmentConfirmedToPsychologist,
  sendReminderEmail,
  sendVerificationApprovedEmail
} from './server/email/index.js';
```

---

## 📧 Common Email Scenarios

### 1. User Registers (Patient or Psychologist)
```typescript
await sendWelcomeEmail(userId, email, firstName, language);
// Automatically detects role from database
```

### 2. Patient Books Appointment
```typescript
// Send to patient
await sendAppointmentConfirmedToPatient(
  patientId,
  patientEmail,
  appointmentId,
  {
    firstName: patient.firstName,
    psychologistName: psychologist.fullName,
    appointmentDate: 'January 30, 2026',
    appointmentTime: '14:00 - 14:50',
    joinLink: 'https://khunjit.com/session/abc123'
  },
  patientLanguage
);

// Send to psychologist
await sendAppointmentConfirmedToPsychologist(
  psychologistId,
  psychologistEmail,
  appointmentId,
  {
    firstName: psychologist.firstName,
    patientName: patient.fullName,
    appointmentDate: 'January 30, 2026',
    appointmentTime: '14:00 - 14:50'
  },
  psychologistLanguage
);
```

### 3. Appointment Cancelled
```typescript
await sendAppointmentCancelledEmail(
  userId,
  email,
  appointmentId,
  role, // 'patient' or 'psychologist'
  {
    firstName,
    psychologistName, // for patients
    patientName,      // for psychologists
    appointmentDate,
    appointmentTime
  },
  language
);
```

### 4. Send Reminder (24h or 1h before)
```typescript
await sendReminderEmail(
  userId,
  email,
  appointmentId,
  role, // 'patient' or 'psychologist'
  '24h', // or '1h'
  {
    firstName,
    psychologistName, // for patients
    patientName,      // for psychologists
    appointmentDate,
    appointmentTime,
    joinLink          // for patients
  },
  language
);
```

### 5. Psychologist Verification
```typescript
// Approved
await sendVerificationApprovedEmail(psychologistId, email, firstName, language);

// Rejected
await sendVerificationRejectedEmail(psychologistId, email, firstName, language);
```

---

## 🎯 Type-Safe Service (Advanced)

For maximum control, use the type-safe service directly:

```typescript
import { typeSafeEmailService } from './server/email/index.js';

// Patient email
await typeSafeEmailService.sendToPatient({
  userId: patientId,
  email: patient.email,
  eventType: 'welcome', // Type-checked event
  variables: {          // Type-checked variables
    firstName: patient.firstName,
    psychologistName: 'Dr. Smith'
  },
  language: 'en',
  appointmentId: 'optional-id'
});

// Psychologist email
await typeSafeEmailService.sendToPsychologist({
  userId: psychologistId,
  email: psychologist.email,
  eventType: 'verification_approved',
  variables: {
    firstName: psychologist.firstName
  },
  language: 'tr'
});
```

---

## 📋 Event Types

### Patient Events
- `welcome` - Registration welcome
- `appointment_confirmed` - Booking confirmation
- `appointment_cancelled` - Cancellation notice
- `reminder_24h` - 24-hour reminder
- `reminder_1h` - 1-hour reminder
- `session_followup` - After session

### Psychologist Events
- `welcome` - Registration welcome
- `appointment_confirmed` - New booking notification
- `appointment_cancelled` - Cancellation notice
- `reminder_24h` - 24-hour reminder
- `reminder_1h` - 1-hour reminder
- `verification_approved` - Account approved
- `verification_rejected` - Account rejected

---

## 🌍 Supported Languages

`'de' | 'en' | 'fil' | 'fr' | 'id' | 'it' | 'ja' | 'ko' | 'th' | 'tr' | 'vi'`

Fallback: English (`'en'`) if language not available

---

## 🔍 Debugging

### Check Email Logs
```sql
SELECT
  recipient_role,
  template_path,
  type,
  status,
  sent_at
FROM email_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Expected Template Paths
```
en/patient/welcome.html
en/patient/appointment-confirmed.html
en/psychologist/welcome.html
en/psychologist/verification-approved.html
```

---

## ⚠️ Common Mistakes

### ❌ DON'T: Send psychologist event to patient
```typescript
// This will THROW ERROR:
await typeSafeEmailService.sendToPatient({
  eventType: 'verification_approved', // Psychologist-only!
  // ...
});
```

### ❌ DON'T: Use wrong variables
```typescript
// This won't compile:
await typeSafeEmailService.sendToPatient({
  variables: {
    patientName: 'John' // ❌ Patients receive psychologist name, not patient name
  }
});
```

### ✅ DO: Use correct method for each role
```typescript
// Correct:
await typeSafeEmailService.sendToPatient({
  variables: {
    psychologistName: 'Dr. Smith' // ✅ Correct
  }
});

await typeSafeEmailService.sendToPsychologist({
  variables: {
    patientName: 'John Doe' // ✅ Correct
  }
});
```

---

## 📚 More Help

- Full Documentation: `EMAIL_SYSTEM_REFACTOR_COMPLETE.md`
- Migration Guide: `EMAIL_MIGRATION_CHECKLIST.md`
- Test Script: `npx tsx test-templates-structure.ts`
