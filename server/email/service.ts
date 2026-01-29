/**
 * Email Service
 *
 * Central service for sending emails with template support and logging.
 * Handles idempotency through email_logs table.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { emailProvider } from "./provider.js";
import type { EmailType, InsertEmailLog } from "../../shared/schema.js";

// Handle ESM environment - use import.meta.url to get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const currentDirname = dirname(__filename);

// Supported languages for email templates
export type SupportedLanguage = 'de' | 'en' | 'fil' | 'fr' | 'id' | 'it' | 'ja' | 'ko' | 'th' | 'tr' | 'vi';

// Template variables interface
export interface TemplateVariables {
  firstName?: string;
  lastName?: string;
  psychologistName?: string;
  patientName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  reminderTime?: string;
  joinLink?: string;
  dashboardLink?: string;
  platformUrl?: string;
  [key: string]: string | undefined;
}

// Email send options
export interface SendEmailOptions {
  userId: string;
  appointmentId?: string;
  type: EmailType;
  to: string;
  variables: TemplateVariables;
  language?: SupportedLanguage; // User's preferred language
}

// Email send result
export interface SendEmailResult {
  success: boolean;
  emailLogId?: string;
  alreadySent?: boolean;
  error?: string;
}

// Storage interface for email logs (to avoid circular dependency)
export interface EmailLogStorage {
  getEmailLog(userId: string, type: EmailType, appointmentId?: string): Promise<{ id: string; status: string } | null>;
  createEmailLog(log: InsertEmailLog): Promise<{ id: string }>;
  updateEmailLog(id: string, data: { status: string; sentAt?: Date; errorMessage?: string }): Promise<void>;
}

// Platform URL
const PLATFORM_URL = process.env.PLATFORM_URL || "https://khunjit.com";

// Language-specific subjects
const SUBJECTS: Record<SupportedLanguage, Record<EmailType, string>> = {
  de: {
    welcome: "Willkommen bei KhunJit! 🎉",
    reminder_24h: "Ihre Sitzung in 24 Stunden - KhunJit",
    reminder_1h: "Ihre Sitzung in 1 Stunde - KhunJit",
    after_session: "Ihre Sitzung ist abgeschlossen - KhunJit",
    verification_approved: "Ihr Konto wurde genehmigt - KhunJit",
    verification_rejected: "Über Ihre Kontoanfrage - KhunJit",
    appointment_confirmed: "Ihr Termin wurde bestätigt - KhunJit",
    appointment_cancelled: "Ihr Termin wurde storniert - KhunJit",
  },
  en: {
    welcome: "Welcome to KhunJit! 🎉",
    reminder_24h: "Your Session in 24 Hours - KhunJit",
    reminder_1h: "Your Session in 1 Hour - KhunJit",
    after_session: "Your Session is Complete - KhunJit",
    verification_approved: "Your Account Has Been Approved - KhunJit",
    verification_rejected: "About Your Account Application - KhunJit",
    appointment_confirmed: "Your Appointment Confirmed - KhunJit",
    appointment_cancelled: "Your Appointment Cancelled - KhunJit",
  },
  fil: {
    welcome: "Maligayang pagdating sa KhunJit! 🎉",
    reminder_24h: "Ang Iyong Session sa 24 na Oras - KhunJit",
    reminder_1h: "Ang Iyong Session sa 1 Oras - KhunJit",
    after_session: "Tapos Na ang Iyong Session - KhunJit",
    verification_approved: "Naaprubahan Na ang Iyong Account - KhunJit",
    verification_rejected: "Tungkol sa Iyong Application - KhunJit",
    appointment_confirmed: "Nakumpirma ang Iyong Appointment - KhunJit",
    appointment_cancelled: "Nakansela ang Iyong Appointment - KhunJit",
  },
  fr: {
    welcome: "Bienvenue sur KhunJit! 🎉",
    reminder_24h: "Votre séance dans 24 heures - KhunJit",
    reminder_1h: "Votre séance dans 1 heure - KhunJit",
    after_session: "Votre séance est terminée - KhunJit",
    verification_approved: "Votre compte a été approuvé - KhunJit",
    verification_rejected: "À propos de votre demande - KhunJit",
    appointment_confirmed: "Votre rendez-vous est confirmé - KhunJit",
    appointment_cancelled: "Votre rendez-vous est annulé - KhunJit",
  },
  id: {
    welcome: "Selamat datang di KhunJit! 🎉",
    reminder_24h: "Sesi Anda dalam 24 Jam - KhunJit",
    reminder_1h: "Sesi Anda dalam 1 Jam - KhunJit",
    after_session: "Sesi Anda Selesai - KhunJit",
    verification_approved: "Akun Anda Telah Disetujui - KhunJit",
    verification_rejected: "Tentang Aplikasi Akun Anda - KhunJit",
    appointment_confirmed: "Janji Temu Anda Dikonfirmasi - KhunJit",
    appointment_cancelled: "Janji Temu Anda Dibatalkan - KhunJit",
  },
  it: {
    welcome: "Benvenuto su KhunJit! 🎉",
    reminder_24h: "La tua sessione tra 24 ore - KhunJit",
    reminder_1h: "La tua sessione tra 1 ora - KhunJit",
    after_session: "La tua sessione è completata - KhunJit",
    verification_approved: "Il tuo account è stato approvato - KhunJit",
    verification_rejected: "Riguardo la tua richiesta - KhunJit",
    appointment_confirmed: "Il tuo appuntamento è confermato - KhunJit",
    appointment_cancelled: "Il tuo appuntamento è stato cancellato - KhunJit",
  },
  ja: {
    welcome: "KhunJitへようこそ！🎉",
    reminder_24h: "24時間後にセッションがあります - KhunJit",
    reminder_1h: "1時間後にセッションがあります - KhunJit",
    after_session: "セッションが完了しました - KhunJit",
    verification_approved: "アカウントが承認されました - KhunJit",
    verification_rejected: "アカウント申請について - KhunJit",
    appointment_confirmed: "予約が確認されました - KhunJit",
    appointment_cancelled: "予約がキャンセルされました - KhunJit",
  },
  ko: {
    welcome: "KhunJit에 오신 것을 환영합니다! 🎉",
    reminder_24h: "24시간 후 세션 예정 - KhunJit",
    reminder_1h: "1시간 후 세션 예정 - KhunJit",
    after_session: "세션이 완료되었습니다 - KhunJit",
    verification_approved: "계정이 승인되었습니다 - KhunJit",
    verification_rejected: "계정 신청에 대해 - KhunJit",
    appointment_confirmed: "예약이 확인되었습니다 - KhunJit",
    appointment_cancelled: "예약이 취소되었습니다 - KhunJit",
  },
  th: {
    welcome: "ยินดีต้อนรับสู่ KhunJit! 🎉",
    reminder_24h: "เซสชันของคุณใน 24 ชั่วโมง - KhunJit",
    reminder_1h: "เซสชันของคุณใน 1 ชั่วโมง - KhunJit",
    after_session: "เซสชันของคุณเสร็จสมบูรณ์แล้ว - KhunJit",
    verification_approved: "บัญชีของคุณได้รับการอนุมัติแล้ว - KhunJit",
    verification_rejected: "เกี่ยวกับใบสมัครของคุณ - KhunJit",
    appointment_confirmed: "การนัดหมายของคุณได้รับการยืนยันแล้ว - KhunJit",
    appointment_cancelled: "การนัดหมายของคุณถูกยกเลิกแล้ว - KhunJit",
  },
  tr: {
    welcome: "KhunJit'e Hoş Geldiniz! 🎉",
    reminder_24h: "Seansınıza 24 Saat Kaldı - KhunJit",
    reminder_1h: "Seansınıza 1 Saat Kaldı - KhunJit",
    after_session: "Seansınız Tamamlandı - KhunJit",
    verification_approved: "Hesabınız Onaylandı - KhunJit",
    verification_rejected: "Hesap Başvurunuz Hakkında - KhunJit",
    appointment_confirmed: "Randevunuz Onaylandı - KhunJit",
    appointment_cancelled: "Randevunuz İptal Edildi - KhunJit",
  },
  vi: {
    welcome: "Chào mừng đến với KhunJit! 🎉",
    reminder_24h: "Phiên của bạn sau 24 giờ - KhunJit",
    reminder_1h: "Phiên của bạn sau 1 giờ - KhunJit",
    after_session: "Phiên của bạn đã hoàn thành - KhunJit",
    verification_approved: "Tài khoản của bạn đã được phê duyệt - KhunJit",
    verification_rejected: "Về đơn đăng ký của bạn - KhunJit",
    appointment_confirmed: "Lịch hẹn của bạn đã được xác nhận - KhunJit",
    appointment_cancelled: "Lịch hẹn của bạn đã bị hủy - KhunJit",
  },
};

// Template configuration (file names are same across languages)
const TEMPLATE_FILES: Record<EmailType, string> = {
  welcome: "welcome.html",
  reminder_24h: "reminder.html",
  reminder_1h: "reminder.html",
  after_session: "after-session.html",
  verification_approved: "verification-approved.html",
  verification_rejected: "verification-rejected.html",
  appointment_confirmed: "booking-confirmed.html", // Note: use booking-confirmed-patient.html or booking-confirmed-psychologist.html via sendBookingConfirmed
  appointment_cancelled: "appointment-cancelled.html",
};

// Template cache to avoid reading files repeatedly
const templateCache: Map<string, string> = new Map();

function loadTemplate(templateFile: string, language: SupportedLanguage = 'en'): string {
  const cacheKey = `${language}/${templateFile}`;
  const cached = templateCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const templatePath = join(currentDirname, "templates", language, templateFile);
    const content = readFileSync(templatePath, "utf-8");
    templateCache.set(cacheKey, content);
    return content;
  } catch (error) {
    console.error(`[Email] Failed to load template ${language}/${templateFile}:`, error);

    // Try fallback to English if language-specific template not found
    if (language !== 'en') {
      console.warn(`[Email] Falling back to English template for ${templateFile}`);
      try {
        const fallbackPath = join(currentDirname, "templates", "en", templateFile);
        const content = readFileSync(fallbackPath, "utf-8");
        return content;
      } catch (fallbackError) {
        console.error(`[Email] English fallback also failed:`, fallbackError);
      }
    }

    // Return a simple fallback template
    return `
      <html>
        <body>
          <h1>KhunJit</h1>
          <p>Hello {{firstName}},</p>
          <p>This email was sent automatically.</p>
        </body>
      </html>
    `;
  }
}

function renderTemplate(template: string, variables: TemplateVariables): string {
  let rendered = template;

  // Add default variables
  const allVariables: TemplateVariables = {
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

class EmailService {
  private storage: EmailLogStorage | null = null;

  // Set storage instance (called during server startup)
  setStorage(storage: EmailLogStorage): void {
    this.storage = storage;
  }

  // Check if email service is configured
  isConfigured(): boolean {
    return emailProvider.isConfigured();
  }

  // Send email with idempotency check
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const { userId, appointmentId, type, to, variables, language = 'en' } = options;

    // Check if storage is set
    if (!this.storage) {
      console.error("[Email] Storage not initialized. Call setStorage() first.");
      return { success: false, error: "Storage not initialized" };
    }

    // Check for existing email log (idempotency)
    const existingLog = await this.storage.getEmailLog(userId, type, appointmentId);
    if (existingLog && existingLog.status === "sent") {
      console.log(`[Email] Email already sent: type=${type}, userId=${userId}, appointmentId=${appointmentId || "N/A"}`);
      return { success: true, alreadySent: true, emailLogId: existingLog.id };
    }

    // Get template file for this email type
    const templateFile = TEMPLATE_FILES[type];
    if (!templateFile) {
      return { success: false, error: `Unknown email type: ${type}` };
    }

    // Get subject for this language and type
    const subject = SUBJECTS[language]?.[type] || SUBJECTS.en[type];

    // Load and render template with language support
    const template = loadTemplate(templateFile, language);
    const html = renderTemplate(template, variables);

    // Create email log record (pending status)
    let emailLogId: string;
    try {
      const logRecord = await this.storage.createEmailLog({
        userId,
        appointmentId: appointmentId || null,
        type,
        status: "pending",
        recipientEmail: to,
        subject,
      });
      emailLogId = logRecord.id;
    } catch (error) {
      console.error("[Email] Failed to create email log:", error);
      return { success: false, error: "Failed to create email log" };
    }

    // Send email via provider
    const result = await emailProvider.send({ to, subject, html });

    // Update email log with result
    try {
      await this.storage.updateEmailLog(emailLogId, {
        status: result.success ? "sent" : "failed",
        sentAt: result.success ? new Date() : undefined,
        errorMessage: result.error,
      });
    } catch (error) {
      console.error("[Email] Failed to update email log:", error);
    }

    return {
      success: result.success,
      emailLogId,
      error: result.error,
    };
  }

  // Convenience methods for specific email types
  /**
   * @deprecated Use sendWelcomeEmail() from helpers.ts instead for better role-based handling
   */
  async sendWelcome(
    userId: string,
    to: string,
    firstName: string,
    language: SupportedLanguage = 'en'
  ): Promise<SendEmailResult> {
    return this.send({
      userId,
      type: "welcome",
      to,
      variables: { firstName },
      language,
    });
  }

  async sendReminder(
    userId: string,
    appointmentId: string,
    to: string,
    variables: {
      firstName: string;
      psychologistName: string;
      appointmentDate: string;
      appointmentTime: string;
      joinLink: string;
      reminderTime: string;
    },
    type: "reminder_24h" | "reminder_1h" = "reminder_1h",
    language: SupportedLanguage = 'en'
  ): Promise<SendEmailResult> {
    return this.send({
      userId,
      appointmentId,
      type,
      to,
      variables,
      language,
    });
  }

  async sendAfterSession(
    userId: string,
    appointmentId: string,
    to: string,
    variables: {
      firstName: string;
      psychologistName: string;
      appointmentDate: string;
      appointmentTime: string;
    },
    language: SupportedLanguage = 'en'
  ): Promise<SendEmailResult> {
    return this.send({
      userId,
      appointmentId,
      type: "after_session",
      to,
      variables,
      language,
    });
  }

  async sendBookingConfirmed(
    userId: string,
    appointmentId: string,
    to: string,
    variables: {
      firstName: string;
      psychologistName?: string;
      patientName?: string;
      appointmentDate: string;
      appointmentTime: string;
      joinLink: string;
    },
    language: SupportedLanguage = 'en',
    recipientType: 'patient' | 'psychologist' = 'patient'
  ): Promise<SendEmailResult> {
    // Use different template based on recipient type
    const templateFile = recipientType === 'patient'
      ? 'booking-confirmed-patient.html'
      : 'booking-confirmed-psychologist.html';

    // Load template manually for this specific case
    const template = loadTemplate(templateFile, language);
    const html = renderTemplate(template, variables);

    // Check for existing email log
    if (!this.storage) {
      return { success: false, error: "Storage not initialized" };
    }

    const existingLog = await this.storage.getEmailLog(userId, "appointment_confirmed", appointmentId);
    if (existingLog && existingLog.status === "sent") {
      return { success: true, alreadySent: true, emailLogId: existingLog.id };
    }

    // Get subject
    const subject = SUBJECTS[language]?.['appointment_confirmed'] || SUBJECTS.en['appointment_confirmed'];

    // Create email log
    const logRecord = await this.storage.createEmailLog({
      userId,
      appointmentId: appointmentId,
      type: "appointment_confirmed",
      status: "pending",
      recipientEmail: to,
      subject,
    });

    // Send email
    const result = await emailProvider.send({ to, subject, html });

    // Update log
    await this.storage.updateEmailLog(logRecord.id, {
      status: result.success ? "sent" : "failed",
      sentAt: result.success ? new Date() : undefined,
      errorMessage: result.error,
    });

    return {
      success: result.success,
      emailLogId: logRecord.id,
      error: result.error,
    };
  }

  /**
   * @deprecated Use sendVerificationApprovedEmail() from helpers.ts instead for better role-based handling
   */
  async sendVerificationApproved(
    userId: string,
    to: string,
    firstName: string,
    language: SupportedLanguage = 'en'
  ): Promise<SendEmailResult> {
    return this.send({
      userId,
      type: "verification_approved",
      to,
      variables: { firstName },
      language,
    });
  }

  /**
   * @deprecated Use sendVerificationRejectedEmail() from helpers.ts instead for better role-based handling
   */
  async sendVerificationRejected(
    userId: string,
    to: string,
    firstName: string,
    language: SupportedLanguage = 'en'
  ): Promise<SendEmailResult> {
    return this.send({
      userId,
      type: "verification_rejected",
      to,
      variables: { firstName },
      language,
    });
  }

  /**
   * @deprecated Use sendAppointmentCancelledEmail() from helpers.ts instead for better role-based handling
   */
  async sendAppointmentCancelled(
    userId: string,
    appointmentId: string,
    to: string,
    variables: {
      firstName: string;
      psychologistName?: string;
      patientName?: string;
      appointmentDate: string;
      appointmentTime: string;
    },
    language: SupportedLanguage = 'en'
  ): Promise<SendEmailResult> {
    return this.send({
      userId,
      appointmentId,
      type: "appointment_cancelled",
      to,
      variables,
      language,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
