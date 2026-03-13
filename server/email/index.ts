/**
 * Email Module
 *
 * Central email automation system for KhunJit.
 *
 * Features:
 * - SMTP provider with nodemailer
 * - HTML email templates
 * - Idempotent email sending (prevents duplicates)
 * - Scheduled reminders for appointments
 *
 * Email Types:
 * - welcome: Sent when a user registers
 * - reminder_24h: Sent 24 hours before appointment
 * - reminder_1h: Sent 1 hour before appointment
 * - after_session: Sent when appointment is completed
 *
 * Configuration (via environment variables):
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP server port (default: 587)
 * - SMTP_SECURE: Use SSL (default: false)
 * - SMTP_USER: SMTP username
 * - SMTP_PASS: SMTP password
 * - SMTP_FROM: From address for emails
 * - PLATFORM_URL: Platform URL for email links
 *
 * Usage:
 * ```typescript
 * import { emailService } from './email/service';
 * import { startEmailScheduler } from './email/scheduler';
 *
 * // Initialize with storage
 * emailService.setStorage(storage);
 *
 * // Start scheduler
 * startEmailScheduler();
 *
 * // Send welcome email
 * await emailService.sendWelcome(userId, email, firstName);
 * ```
 */

export { emailService } from "./service.js";
export { emailProvider } from "./provider.js";
export { startEmailScheduler, stopEmailScheduler } from "./scheduler.js";
export { typeSafeEmailService } from "./type-safe-service.js";
export type {
  SendToPatientOptions,
  SendToPsychologistOptions,
  TypeSafeEmailResult,
  PatientEmailVariables,
  PsychologistEmailVariables
} from "./type-safe-service.js";

// Convenience helpers for common email operations
export {
  sendWelcomeEmail,
  sendAppointmentConfirmedToPatient,
  sendAppointmentConfirmedToPsychologist,
  sendAppointmentCancelledEmail,
  sendReminderEmail,
  sendSessionFollowupEmail,
  sendVerificationApprovedEmail,
  sendVerificationRejectedEmail
} from "./helpers.js";
