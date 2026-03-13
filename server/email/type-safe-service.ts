/**
 * Type-Safe Email Service
 *
 * Provides role-based email sending methods to prevent template mixup bugs.
 *
 * Key Features:
 * - Explicit role-based methods (sendToPatient, sendToPsychologist)
 * - Type-safe variable validation at compile-time
 * - Template path resolution with role enforcement
 * - Fail-loud error handling for missing templates or invalid roles
 *
 * Usage:
 * ```typescript
 * // Send to patient
 * await typeSafeEmailService.sendToPatient({
 *   userId: patientId,
 *   email: patient.email,
 *   eventType: 'welcome',
 *   variables: { firstName: patient.firstName },
 *   language: 'en'
 * });
 *
 * // Send to psychologist
 * await typeSafeEmailService.sendToPsychologist({
 *   userId: psychologistId,
 *   email: psychologist.email,
 *   eventType: 'verification_approved',
 *   variables: { firstName: psychologist.firstName },
 *   language: 'en'
 * });
 * ```
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { emailProvider } from "./provider.js";
import type { EmailType, InsertEmailLog } from "../../shared/schema.js";
import type { EmailLogStorage, SupportedLanguage } from "./service.js";

// Handle ESM environment
const __filename = fileURLToPath(import.meta.url);
const currentDirname = dirname(__filename);

// Platform URL
const PLATFORM_URL = process.env.PLATFORM_URL || "https://khunjit.com";

// ========== TYPE DEFINITIONS ==========

export type UserRole = 'patient' | 'psychologist' | 'admin';

// Email event types (semantic names for business events)
export type EmailEventType =
  | 'welcome'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'reminder_24h'
  | 'reminder_1h'
  | 'session_followup'
  | 'verification_approved'
  | 'verification_rejected';

// Base variables available to all email templates
export interface BaseEmailVariables {
  firstName: string;
  platformUrl?: string;
  dashboardLink?: string;
}

// Patient-specific variables
export interface PatientEmailVariables extends BaseEmailVariables {
  psychologistName?: string;
  psychologistTitle?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  joinLink?: string;
}

// Psychologist-specific variables
export interface PsychologistEmailVariables extends BaseEmailVariables {
  patientName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  sessionNotesLink?: string;
}

// Email send options for patients
export interface SendToPatientOptions {
  userId: string;
  email: string;
  eventType: EmailEventType;
  variables: PatientEmailVariables;
  language: SupportedLanguage;
  appointmentId?: string;
}

// Email send options for psychologists
export interface SendToPsychologistOptions {
  userId: string;
  email: string;
  eventType: EmailEventType;
  variables: PsychologistEmailVariables;
  language: SupportedLanguage;
  appointmentId?: string;
}

// Email send result
export interface TypeSafeEmailResult {
  success: boolean;
  emailLogId?: string;
  alreadySent?: boolean;
  templatePath?: string;
  error?: string;
}

// ========== TEMPLATE CONFIGURATION ==========

// Map event types to template filenames
const EVENT_TO_TEMPLATE: Record<EmailEventType, string> = {
  'welcome': 'welcome.html',
  'appointment_confirmed': 'appointment-confirmed.html',
  'appointment_cancelled': 'appointment-cancelled.html',
  'reminder_24h': 'reminder-24h.html',
  'reminder_1h': 'reminder-1h.html',
  'session_followup': 'session-followup.html',
  'verification_approved': 'verification-approved.html',
  'verification_rejected': 'verification-rejected.html',
};

// Map event types to EmailType enum (for email_logs table)
const EVENT_TO_EMAIL_TYPE: Record<EmailEventType, EmailType> = {
  'welcome': 'welcome',
  'appointment_confirmed': 'appointment_confirmed',
  'appointment_cancelled': 'appointment_cancelled',
  'reminder_24h': 'reminder_24h',
  'reminder_1h': 'reminder_1h',
  'session_followup': 'after_session',
  'verification_approved': 'verification_approved',
  'verification_rejected': 'verification_rejected',
};

// Language-specific subjects
const SUBJECTS: Record<SupportedLanguage, Record<EmailEventType, string>> = {
  de: {
    welcome: "Willkommen bei KhunJit! 🎉",
    appointment_confirmed: "Ihr Termin wurde bestätigt - KhunJit",
    appointment_cancelled: "Ihr Termin wurde storniert - KhunJit",
    reminder_24h: "Ihre Sitzung in 24 Stunden - KhunJit",
    reminder_1h: "Ihre Sitzung in 1 Stunde - KhunJit",
    session_followup: "Ihre Sitzung ist abgeschlossen - KhunJit",
    verification_approved: "Ihr Konto wurde genehmigt - KhunJit",
    verification_rejected: "Über Ihre Kontoanfrage - KhunJit",
  },
  en: {
    welcome: "Welcome to KhunJit! 🎉",
    appointment_confirmed: "Your Appointment Confirmed - KhunJit",
    appointment_cancelled: "Your Appointment Cancelled - KhunJit",
    reminder_24h: "Your Session in 24 Hours - KhunJit",
    reminder_1h: "Your Session in 1 Hour - KhunJit",
    session_followup: "Your Session is Complete - KhunJit",
    verification_approved: "Your Account Has Been Approved - KhunJit",
    verification_rejected: "About Your Account Application - KhunJit",
  },
  fil: {
    welcome: "Maligayang pagdating sa KhunJit! 🎉",
    appointment_confirmed: "Nakumpirma ang Iyong Appointment - KhunJit",
    appointment_cancelled: "Nakansela ang Iyong Appointment - KhunJit",
    reminder_24h: "Ang Iyong Session sa 24 na Oras - KhunJit",
    reminder_1h: "Ang Iyong Session sa 1 Oras - KhunJit",
    session_followup: "Tapos Na ang Iyong Session - KhunJit",
    verification_approved: "Naaprubahan Na ang Iyong Account - KhunJit",
    verification_rejected: "Tungkol sa Iyong Application - KhunJit",
  },
  fr: {
    welcome: "Bienvenue sur KhunJit! 🎉",
    appointment_confirmed: "Votre rendez-vous est confirmé - KhunJit",
    appointment_cancelled: "Votre rendez-vous est annulé - KhunJit",
    reminder_24h: "Votre séance dans 24 heures - KhunJit",
    reminder_1h: "Votre séance dans 1 heure - KhunJit",
    session_followup: "Votre séance est terminée - KhunJit",
    verification_approved: "Votre compte a été approuvé - KhunJit",
    verification_rejected: "À propos de votre demande - KhunJit",
  },
  id: {
    welcome: "Selamat datang di KhunJit! 🎉",
    appointment_confirmed: "Janji Temu Anda Dikonfirmasi - KhunJit",
    appointment_cancelled: "Janji Temu Anda Dibatalkan - KhunJit",
    reminder_24h: "Sesi Anda dalam 24 Jam - KhunJit",
    reminder_1h: "Sesi Anda dalam 1 Jam - KhunJit",
    session_followup: "Sesi Anda Selesai - KhunJit",
    verification_approved: "Akun Anda Telah Disetujui - KhunJit",
    verification_rejected: "Tentang Aplikasi Akun Anda - KhunJit",
  },
  it: {
    welcome: "Benvenuto su KhunJit! 🎉",
    appointment_confirmed: "Il tuo appuntamento è confermato - KhunJit",
    appointment_cancelled: "Il tuo appuntamento è stato cancellato - KhunJit",
    reminder_24h: "La tua sessione tra 24 ore - KhunJit",
    reminder_1h: "La tua sessione tra 1 ora - KhunJit",
    session_followup: "La tua sessione è completata - KhunJit",
    verification_approved: "Il tuo account è stato approvato - KhunJit",
    verification_rejected: "Riguardo la tua richiesta - KhunJit",
  },
  ja: {
    welcome: "KhunJitへようこそ！🎉",
    appointment_confirmed: "予約が確認されました - KhunJit",
    appointment_cancelled: "予約がキャンセルされました - KhunJit",
    reminder_24h: "24時間後にセッションがあります - KhunJit",
    reminder_1h: "1時間後にセッションがあります - KhunJit",
    session_followup: "セッションが完了しました - KhunJit",
    verification_approved: "アカウントが承認されました - KhunJit",
    verification_rejected: "アカウント申請について - KhunJit",
  },
  ko: {
    welcome: "KhunJit에 오신 것을 환영합니다! 🎉",
    appointment_confirmed: "예약이 확인되었습니다 - KhunJit",
    appointment_cancelled: "예약이 취소되었습니다 - KhunJit",
    reminder_24h: "24시간 후 세션 예정 - KhunJit",
    reminder_1h: "1시간 후 세션 예정 - KhunJit",
    session_followup: "세션이 완료되었습니다 - KhunJit",
    verification_approved: "계정이 승인되었습니다 - KhunJit",
    verification_rejected: "계정 신청에 대해 - KhunJit",
  },
  th: {
    welcome: "ยินดีต้อนรับสู่ KhunJit! 🎉",
    appointment_confirmed: "การนัดหมายของคุณได้รับการยืนยันแล้ว - KhunJit",
    appointment_cancelled: "การนัดหมายของคุณถูกยกเลิกแล้ว - KhunJit",
    reminder_24h: "เซสชันของคุณใน 24 ชั่วโมง - KhunJit",
    reminder_1h: "เซสชันของคุณใน 1 ชั่วโมง - KhunJit",
    session_followup: "เซสชันของคุณเสร็จสมบูรณ์แล้ว - KhunJit",
    verification_approved: "บัญชีของคุณได้รับการอนุมัติแล้ว - KhunJit",
    verification_rejected: "เกี่ยวกับใบสมัครของคุณ - KhunJit",
  },
  tr: {
    welcome: "KhunJit'e Hoş Geldiniz! 🎉",
    appointment_confirmed: "Randevunuz Onaylandı - KhunJit",
    appointment_cancelled: "Randevunuz İptal Edildi - KhunJit",
    reminder_24h: "Seansınıza 24 Saat Kaldı - KhunJit",
    reminder_1h: "Seansınıza 1 Saat Kaldı - KhunJit",
    session_followup: "Seansınız Tamamlandı - KhunJit",
    verification_approved: "Hesabınız Onaylandı - KhunJit",
    verification_rejected: "Hesap Başvurunuz Hakkında - KhunJit",
  },
  vi: {
    welcome: "Chào mừng đến với KhunJit! 🎉",
    appointment_confirmed: "Lịch hẹn của bạn đã được xác nhận - KhunJit",
    appointment_cancelled: "Lịch hẹn của bạn đã bị hủy - KhunJit",
    reminder_24h: "Phiên của bạn sau 24 giờ - KhunJit",
    reminder_1h: "Phiên của bạn sau 1 giờ - KhunJit",
    session_followup: "Phiên của bạn đã hoàn thành - KhunJit",
    verification_approved: "Tài khoản của bạn đã được phê duyệt - KhunJit",
    verification_rejected: "Về đơn đăng ký của bạn - KhunJit",
  },
};

// ========== HELPER FUNCTIONS ==========

/**
 * Get the template path for a given event, role, and language
 */
function getTemplatePath(
  eventType: EmailEventType,
  role: UserRole,
  language: SupportedLanguage
): string {
  const templateFile = EVENT_TO_TEMPLATE[eventType];
  return `${language}/${role}/${templateFile}`;
}

/**
 * Load template from file system with role enforcement
 * FAIL LOUD: Throws error if template doesn't exist
 */
function loadTemplate(
  templatePath: string,
  eventType: EmailEventType,
  role: UserRole
): string {
  const fullPath = join(currentDirname, "templates", templatePath);

  // Check if template exists
  if (!existsSync(fullPath)) {
    // Try English fallback
    const [, roleDir, templateFile] = templatePath.split('/');
    const fallbackPath = join(currentDirname, "templates", "en", roleDir, templateFile);

    if (existsSync(fallbackPath)) {
      console.warn(`[TypeSafeEmail] Template not found at ${templatePath}, falling back to English`);
      return readFileSync(fallbackPath, "utf-8");
    }

    // FAIL LOUD: Template doesn't exist even in English
    throw new Error(
      `[TypeSafeEmail] CRITICAL ERROR: Template not found for ${eventType} / ${role}.\n` +
      `Expected path: ${fullPath}\n` +
      `Fallback path: ${fallbackPath}\n` +
      `This is a configuration error. The template must exist for both roles.`
    );
  }

  return readFileSync(fullPath, "utf-8");
}

/**
 * Render template with variables
 */
function renderTemplate(
  template: string,
  variables: BaseEmailVariables
): string {
  let rendered = template;

  // Add default variables
  const allVariables: Record<string, string> = {
    platformUrl: PLATFORM_URL,
    dashboardLink: `${PLATFORM_URL}/dashboard`,
    ...variables,
  };

  // Replace all {{variable}} placeholders
  for (const [key, value] of Object.entries(allVariables)) {
    if (value !== undefined) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      rendered = rendered.replace(regex, value);
    }
  }

  return rendered;
}

/**
 * Validate that psychologist-only events are not sent to patients
 */
function validateRoleForEvent(eventType: EmailEventType, role: UserRole): void {
  const psychologistOnlyEvents: EmailEventType[] = [
    'verification_approved',
    'verification_rejected',
  ];

  if (psychologistOnlyEvents.includes(eventType) && role !== 'psychologist') {
    throw new Error(
      `[TypeSafeEmail] ROLE VALIDATION ERROR: Event "${eventType}" can only be sent to psychologists, ` +
      `but attempted to send to role "${role}". This is a bug in the calling code.`
    );
  }
}

// ========== TYPE-SAFE EMAIL SERVICE ==========

class TypeSafeEmailService {
  private storage: EmailLogStorage | null = null;

  // Set storage instance (called during server startup)
  setStorage(storage: EmailLogStorage): void {
    this.storage = storage;
  }

  /**
   * Send email to a PATIENT
   * Compile-time guarantee: can only pass patient variables
   */
  async sendToPatient(options: SendToPatientOptions): Promise<TypeSafeEmailResult> {
    return this.send({
      ...options,
      role: 'patient',
    });
  }

  /**
   * Send email to a PSYCHOLOGIST
   * Compile-time guarantee: can only pass psychologist variables
   */
  async sendToPsychologist(options: SendToPsychologistOptions): Promise<TypeSafeEmailResult> {
    return this.send({
      ...options,
      role: 'psychologist',
    });
  }

  /**
   * Internal send method with role enforcement
   */
  private async send(options: {
    userId: string;
    email: string;
    eventType: EmailEventType;
    role: UserRole;
    variables: BaseEmailVariables;
    language: SupportedLanguage;
    appointmentId?: string;
  }): Promise<TypeSafeEmailResult> {
    const { userId, email, eventType, role, variables, language, appointmentId } = options;

    // Check if storage is set
    if (!this.storage) {
      const error = "[TypeSafeEmail] Storage not initialized. Call setStorage() first.";
      console.error(error);
      return { success: false, error };
    }

    // Validate role for event (fail loud if invalid)
    try {
      validateRoleForEvent(eventType, role);
    } catch (error) {
      console.error(error);
      return { success: false, error: (error as Error).message };
    }

    // Get template path
    const templatePath = getTemplatePath(eventType, role, language);

    // Convert event type to EmailType for database
    const emailType = EVENT_TO_EMAIL_TYPE[eventType];

    // Check for existing email log (idempotency)
    const existingLog = await this.storage.getEmailLog(userId, emailType, appointmentId);
    if (existingLog && existingLog.status === "sent") {
      console.log(
        `[TypeSafeEmail] Email already sent: event=${eventType}, role=${role}, ` +
        `userId=${userId}, appointmentId=${appointmentId || "N/A"}`
      );
      return {
        success: true,
        alreadySent: true,
        emailLogId: existingLog.id,
        templatePath
      };
    }

    // Get subject
    const subject = SUBJECTS[language]?.[eventType] || SUBJECTS.en[eventType];

    // Load and render template (FAIL LOUD if template missing)
    let html: string;
    try {
      const template = loadTemplate(templatePath, eventType, role);
      html = renderTemplate(template, variables);
    } catch (error) {
      console.error(error);
      return { success: false, error: (error as Error).message };
    }

    // Create email log record (pending status)
    let emailLogId: string;
    try {
      const logRecord = await this.storage.createEmailLog({
        userId,
        appointmentId: appointmentId || null,
        type: emailType,
        status: "pending",
        recipientEmail: email,
        recipientRole: role, // NEW: Track recipient role
        subject,
        templatePath, // NEW: Track which template was used
      });
      emailLogId = logRecord.id;
    } catch (error) {
      console.error("[TypeSafeEmail] Failed to create email log:", error);
      return { success: false, error: "Failed to create email log" };
    }

    // Send email via provider
    const result = await emailProvider.send({ to: email, subject, html });

    // Update email log with result
    try {
      await this.storage.updateEmailLog(emailLogId, {
        status: result.success ? "sent" : "failed",
        sentAt: result.success ? new Date() : undefined,
        errorMessage: result.error,
      });
    } catch (error) {
      console.error("[TypeSafeEmail] Failed to update email log:", error);
    }

    console.log(
      `[TypeSafeEmail] Email ${result.success ? 'sent successfully' : 'failed'}: ` +
      `event=${eventType}, role=${role}, template=${templatePath}`
    );

    return {
      success: result.success,
      emailLogId,
      templatePath,
      error: result.error,
    };
  }
}

// Export singleton instance
export const typeSafeEmailService = new TypeSafeEmailService();
