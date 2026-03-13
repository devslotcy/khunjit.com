/**
 * Email Provider Abstraction
 *
 * Provides a unified interface for sending emails.
 * Supports Resend (primary) and SMTP (fallback) via nodemailer.
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Resend } from "resend";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  send(options: EmailOptions): Promise<EmailResult>;
  isConfigured(): boolean;
}

// Lazy-load environment variables (called at runtime, not at import time)
const getResendApiKey = () => process.env.RESEND_API_KEY;

const getSMTPConfig = () => ({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || "KhunJit <noreply@khunjit.com>",
});

// Email from address (lazy)
const getEmailFrom = () => process.env.EMAIL_FROM || "KhunJit <noreply@khunjit.com>";

/**
 * Resend Email Provider (Primary)
 */
class ResendProvider implements EmailProvider {
  private resend: Resend | null = null;
  private configured: boolean = false;
  private initialized: boolean = false;

  constructor() {
    // Don't initialize in constructor - wait for first use
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;

    const apiKey = getResendApiKey();
    if (!apiKey) {
      console.warn("[Email] Resend not configured. Set RESEND_API_KEY to enable.");
      return;
    }

    try {
      this.resend = new Resend(apiKey);
      this.configured = true;
      console.log("[Email] Resend provider initialized");
    } catch (error) {
      console.error("[Email] Failed to initialize Resend:", error);
    }
  }

  isConfigured(): boolean {
    this.ensureInitialized();
    return this.configured;
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    this.ensureInitialized();
    const { to, subject, html, text } = options;

    if (!this.resend) {
      return {
        success: false,
        error: "Resend not configured",
      };
    }

    try {
      const result = await this.resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ""),
      });

      if (result.error) {
        console.error(`[Email] Resend error for ${to}: ${result.error.message}`);
        return {
          success: false,
          error: result.error.message,
        };
      }

      console.log(`[Email] Sent via Resend to ${to}: "${subject}" (id: ${result.data?.id})`);

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Email] Resend failed to send to ${to}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

/**
 * SMTP Email Provider (Fallback)
 */
class SMTPProvider implements EmailProvider {
  private transporter: Transporter | null = null;
  private configured: boolean = false;
  private initialized: boolean = false;

  constructor() {
    // Don't initialize in constructor - wait for first use
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;

    const { host, port, secure, user, pass } = getSMTPConfig();

    if (!host || !user || !pass) {
      console.warn(
        "[Email] SMTP not configured. " +
        "Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables to enable."
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates (development/testing)
        },
      });

      this.configured = true;
      console.log(`[Email] SMTP provider initialized (host: ${host})`);
    } catch (error) {
      console.error("[Email] Failed to initialize SMTP transporter:", error);
    }
  }

  isConfigured(): boolean {
    this.ensureInitialized();
    return this.configured;
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    this.ensureInitialized();
    const { to, subject, html, text } = options;

    if (!this.transporter) {
      console.warn(`[Email] Would send email to ${to}: "${subject}" (SMTP not configured)`);
      return {
        success: false,
        error: "SMTP not configured",
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: getSMTPConfig().from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for plain text fallback
      });

      console.log(`[Email] Sent via SMTP to ${to}: "${subject}" (messageId: ${info.messageId})`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Email] SMTP failed to send to ${to}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Verify SMTP connection (useful for health checks)
  async verify(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("[Email] SMTP verification failed:", error);
      return false;
    }
  }
}

/**
 * Hybrid Email Provider
 * Tries Resend first, falls back to SMTP if Resend fails
 */
class HybridEmailProvider implements EmailProvider {
  private resendProvider: ResendProvider;
  private smtpProvider: SMTPProvider;
  private warningShown: boolean = false;

  constructor() {
    this.resendProvider = new ResendProvider();
    this.smtpProvider = new SMTPProvider();
    // Don't check configuration in constructor - wait for first use
  }

  private checkConfiguration(): void {
    if (this.warningShown) return;

    if (!this.resendProvider.isConfigured() && !this.smtpProvider.isConfigured()) {
      console.warn(
        "[Email] No email providers configured. Emails will be logged but not sent. " +
        "Set RESEND_API_KEY (recommended) or SMTP credentials to enable email delivery."
      );
      this.warningShown = true;
    }
  }

  isConfigured(): boolean {
    return this.resendProvider.isConfigured() || this.smtpProvider.isConfigured();
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    this.checkConfiguration();

    // Try Resend first (modern, reliable, free tier)
    if (this.resendProvider.isConfigured()) {
      const result = await this.resendProvider.send(options);
      if (result.success) {
        return result;
      }

      // Resend failed, try SMTP fallback
      console.warn("[Email] Resend failed, attempting SMTP fallback...");
    }

    // Try SMTP fallback
    if (this.smtpProvider.isConfigured()) {
      return await this.smtpProvider.send(options);
    }

    // No providers available
    console.warn(`[Email] Would send email to ${options.to}: "${options.subject}" (no providers configured)`);
    return {
      success: false,
      error: "No email providers configured",
    };
  }
}

// Singleton instance - uses hybrid approach
export const emailProvider = new HybridEmailProvider();

// Export for testing
export { ResendProvider, SMTPProvider, HybridEmailProvider };
