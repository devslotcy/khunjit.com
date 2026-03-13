/**
 * Email Scheduler
 *
 * Runs periodic jobs to send reminder emails for upcoming appointments.
 * Uses node-cron for scheduling.
 */

import cron from "node-cron";
import { emailService, type SupportedLanguage } from "./service.js";
import { storage } from "../storage.js";
import { format } from "date-fns";
import { de, enUS, fr, id as idLocale, it, ja, ko, th, tr, vi, type Locale } from "date-fns/locale";

// Import users table for fetching user data
import { db } from "../db.js";
import { eq, and, or, gte, lte, isNull, sql } from "drizzle-orm";
import { users } from "@shared/models/auth";
import { psychologistProfiles, languages, userProfiles, conversations, messages, appointments } from "@shared/schema";
import * as notificationService from "../notifications.js";
import { randomUUID } from "crypto";

const PLATFORM_URL = process.env.PLATFORM_URL || "https://khunjit.com";

// Map language codes to date-fns locales
const DATE_LOCALES: Record<string, Locale> = {
  de,
  en: enUS,
  fil: enUS, // Use English for Filipino
  fr,
  id: idLocale,
  it,
  ja,
  ko,
  th,
  tr,
  vi,
};

interface ReminderConfig {
  hoursAhead: number;
  type: "reminder_24h" | "reminder_1h";
  reminderText: Record<SupportedLanguage, string>;
}

const REMINDER_CONFIGS: ReminderConfig[] = [
  {
    hoursAhead: 24,
    type: "reminder_24h",
    reminderText: {
      de: "24 Stunden",
      en: "24 hours",
      fil: "24 na oras",
      fr: "24 heures",
      id: "24 jam",
      it: "24 ore",
      ja: "24時間",
      ko: "24시간",
      th: "24 ชั่วโมง",
      tr: "24 saat",
      vi: "24 giờ",
    }
  },
  {
    hoursAhead: 1,
    type: "reminder_1h",
    reminderText: {
      de: "1 Stunde",
      en: "1 hour",
      fil: "1 oras",
      fr: "1 heure",
      id: "1 jam",
      it: "1 ora",
      ja: "1時間",
      ko: "1시간",
      th: "1 ชั่วโมง",
      tr: "1 saat",
      vi: "1 giờ",
    }
  },
];

async function getUserEmail(userId: string): Promise<{ email: string; firstName: string; languageCode: string } | null> {
  // Join with userProfiles and languages to get language preference
  const [result] = await db
    .select({
      email: users.email,
      firstName: users.firstName,
      languageCode: languages.code,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .leftJoin(languages, eq(languages.id, userProfiles.languageId))
    .where(eq(users.id, userId));

  if (!result || !result.email) return null;

  return {
    email: result.email,
    firstName: result.firstName || "User",
    languageCode: result.languageCode || "en",
  };
}

async function getPsychologistName(psychologistId: string): Promise<string> {
  const profile = await storage.getPsychologistProfile(psychologistId);
  return profile?.fullName || "Psikolog";
}

/**
 * Send a system message to user (appears in Messages page)
 * Creates or uses existing conversation with system user
 */
async function sendSystemMessage(userId: string, messageText: string): Promise<void> {
  try {
    const SYSTEM_USER_ID = 'system';

    // Find existing conversation where system is patient and user is psychologist
    // OR system is psychologist and user is patient
    const [existingConv] = await db
      .select()
      .from(conversations)
      .where(
        sql`(patient_id = ${SYSTEM_USER_ID} AND psychologist_id = ${userId}) OR (patient_id = ${userId} AND psychologist_id = ${SYSTEM_USER_ID})`
      )
      .limit(1);

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      // Create new conversation with system as patient, user as psychologist
      const [newConv] = await db.insert(conversations).values({
        patientId: SYSTEM_USER_ID,
        psychologistId: userId,
      }).returning();
      conversationId = newConv.id;
    }

    // Send message
    await db.insert(messages).values({
      conversationId,
      senderUserId: SYSTEM_USER_ID,
      text: messageText,
    });

    console.log(`[SystemMessage] Sent message to user ${userId}`);
  } catch (error) {
    console.error(`[SystemMessage] Error sending message to ${userId}:`, error);
  }
}

async function sendReminderEmails(config: ReminderConfig): Promise<void> {
  const { hoursAhead, type, reminderText } = config;

  try {
    const appointmentsNeedingReminders = await storage.getAppointmentsNeedingReminders(hoursAhead);

    if (appointmentsNeedingReminders.length === 0) {
      return;
    }

    console.log(`[EmailScheduler] Found ${appointmentsNeedingReminders.length} appointments needing ${type} reminder`);

    for (const appointment of appointmentsNeedingReminders) {
      try {
        // Get patient info with language preference
        const patientInfo = await getUserEmail(appointment.patientId);
        if (!patientInfo) {
          console.warn(`[EmailScheduler] Patient not found for appointment ${appointment.id}`);
          continue;
        }

        // Get patient's language
        const patientLanguage = (patientInfo.languageCode || 'en') as SupportedLanguage;
        const dateLocale = DATE_LOCALES[patientLanguage] || DATE_LOCALES.en;

        // Get psychologist name
        const psychologistName = await getPsychologistName(appointment.psychologistId);

        // Format date and time in patient's language
        const appointmentDate = format(new Date(appointment.startAt), "d MMMM yyyy, EEEE", { locale: dateLocale });
        const appointmentTime = format(new Date(appointment.startAt), "HH:mm");

        // Create join link
        const joinLink = `${PLATFORM_URL}/video-call?room=${appointment.meetingRoom}`;

        // Send reminder to patient in their language
        const result = await emailService.sendReminder(
          appointment.patientId,
          appointment.id,
          patientInfo.email,
          {
            firstName: patientInfo.firstName,
            psychologistName,
            appointmentDate,
            appointmentTime,
            joinLink,
            reminderTime: reminderText[patientLanguage] || reminderText.en,
          },
          type,
          patientLanguage
        );

        if (result.success && !result.alreadySent) {
          console.log(`[EmailScheduler] Sent ${type} reminder (${patientLanguage}) to ${patientInfo.email} for appointment ${appointment.id}`);
        } else if (result.alreadySent) {
          console.log(`[EmailScheduler] ${type} reminder already sent for appointment ${appointment.id}`);
        } else {
          console.error(`[EmailScheduler] Failed to send ${type} reminder: ${result.error}`);
        }

        // Send in-app notification and message to PATIENT (only for 1-hour reminder)
        if (type === 'reminder_1h') {
          const endTime = format(new Date(new Date(appointment.startAt).getTime() + 50 * 60000), "HH:mm");
          const patientNotificationMessages: Record<string, string> = {
            tr: `${psychologistName} ile 1 saat sonra seansınız var.\n\n📅 ${appointmentDate}\n🕐 ${appointmentTime} - ${endTime}\n\nKatılmak için hazır olduğunuzda randevular sayfasından seansa başlayabilirsiniz.`,
            en: `You have a session with ${psychologistName} in 1 hour.\n\n📅 ${appointmentDate}\n🕐 ${appointmentTime} - ${endTime}\n\nYou can start the session from your appointments page.`,
          };

          // Send notification to patient
          await notificationService.createNotification({
            userId: appointment.patientId,
            type: 'appointment_reminder',
            title: patientLanguage === 'tr' ? 'Seans Hatırlatması' : 'Session Reminder',
            message: patientNotificationMessages[patientLanguage] || patientNotificationMessages.en,
            relatedAppointmentId: appointment.id,
          });

          // Send system message to patient
          await sendSystemMessage(
            appointment.patientId,
            patientNotificationMessages[patientLanguage] || patientNotificationMessages.en
          );

          console.log(`[EmailScheduler] Sent in-app notification and message to patient ${appointment.patientId} for appointment ${appointment.id}`);
        }

        // Also send reminder to psychologist in their language
        const psychProfile = await storage.getPsychologistProfile(appointment.psychologistId);
        if (psychProfile) {
          const psychUserInfo = await getUserEmail(psychProfile.userId);
          if (psychUserInfo) {
            // Check if psychologist has appointment reminders enabled
            const psychProfileData = await db
              .select()
              .from(userProfiles)
              .where(eq(userProfiles.userId, psychProfile.userId))
              .limit(1);

            const notifyEnabled = psychProfileData[0]?.notifyAppointmentReminders ?? true;

            if (notifyEnabled) {
              const psychLanguage = (psychUserInfo.languageCode || 'en') as SupportedLanguage;
              const psychDateLocale = DATE_LOCALES[psychLanguage] || DATE_LOCALES.en;
              const psychAppointmentDate = format(new Date(appointment.startAt), "d MMMM yyyy, EEEE", { locale: psychDateLocale });

              // Get patient name for psychologist's email
              const patientName = patientInfo.firstName;

              // Send email reminder
              await emailService.sendReminder(
                psychProfile.userId,
                appointment.id,
                psychUserInfo.email,
                {
                  firstName: psychUserInfo.firstName,
                  psychologistName: patientName, // Show patient name
                  appointmentDate: psychAppointmentDate,
                  appointmentTime,
                  joinLink,
                  reminderTime: reminderText[psychLanguage] || reminderText.en,
                },
                type,
                psychLanguage
              );

              // Send in-app notification (only for 1-hour reminder)
              if (type === 'reminder_1h') {
                const endTime = format(new Date(new Date(appointment.startAt).getTime() + 50 * 60000), "HH:mm");
                const notificationMessages: Record<string, string> = {
                  tr: `${patientName} ile 1 saat sonra seansınız var.\n\n📅 ${psychAppointmentDate}\n🕐 ${appointmentTime} - ${endTime}\n\nKatılmak için hazır olduğunuzda randevular sayfasından seansa başlayabilirsiniz.`,
                  en: `You have a session with ${patientName} in 1 hour.\n\n📅 ${psychAppointmentDate}\n🕐 ${appointmentTime} - ${endTime}\n\nYou can start the session from your appointments page.`,
                };

                await notificationService.createNotification({
                  userId: psychProfile.userId,
                  type: 'appointment_reminder',
                  title: psychLanguage === 'tr' ? 'Seans Hatırlatması' : 'Session Reminder',
                  message: notificationMessages[psychLanguage] || notificationMessages.en,
                  relatedAppointmentId: appointment.id,
                });

                // Send system message to psychologist
                await sendSystemMessage(
                  psychProfile.userId,
                  notificationMessages[psychLanguage] || notificationMessages.en
                );

                console.log(`[EmailScheduler] Sent in-app notification and message to psychologist ${psychProfile.userId} for appointment ${appointment.id}`);
              }
            }
          }
        }
      } catch (error) {
        console.error(`[EmailScheduler] Error processing appointment ${appointment.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`[EmailScheduler] Error in ${type} reminder job:`, error);
  }
}

/**
 * Send reminders for appointments starting in less than 1 hour
 * Checks every minute and sends notification + message to both patient and psychologist
 */
async function sendUpcomingAppointmentReminders(): Promise<void> {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Find appointments that:
    // 1. Start in less than 1 hour
    // 2. Haven't received 1h reminder yet
    // 3. Are confirmed or ready
    const upcomingAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        or(
          eq(appointments.status, "confirmed"),
          eq(appointments.status, "ready")
        ),
        gte(appointments.startAt, now),
        lte(appointments.startAt, oneHourLater),
        eq(appointments.reminderSent1h, false),
        isNull(appointments.deletedAt)
      ));

    if (upcomingAppointments.length === 0) {
      return;
    }

    console.log(`[AppointmentReminder] Found ${upcomingAppointments.length} appointments needing reminder (< 1 hour)`);

    for (const appointment of upcomingAppointments) {
      try {
        const timeUntilStart = appointment.startAt.getTime() - now.getTime();
        const minutesUntil = Math.floor(timeUntilStart / (60 * 1000));

        // Get patient info
        const patientInfo = await getUserEmail(appointment.patientId);
        if (!patientInfo) {
          console.warn(`[AppointmentReminder] Patient not found for appointment ${appointment.id}`);
          continue;
        }

        // Get psychologist info (appointment.psychologistId is the USER ID, not profile ID)
        const psychProfile = await storage.getPsychologistByUserId(appointment.psychologistId);
        if (!psychProfile) {
          console.warn(`[AppointmentReminder] Psychologist not found for appointment ${appointment.id}`);
          continue;
        }

        const psychUserInfo = await getUserEmail(psychProfile.userId);
        if (!psychUserInfo) {
          console.warn(`[AppointmentReminder] Psychologist user not found for appointment ${appointment.id}`);
          continue;
        }

        // Format times
        const patientLanguage = (patientInfo.languageCode || 'tr') as SupportedLanguage;
        const psychLanguage = (psychUserInfo.languageCode || 'tr') as SupportedLanguage;

        const appointmentTime = format(new Date(appointment.startAt), "HH:mm");
        const appointmentDate = format(new Date(appointment.startAt), "d MMMM yyyy, EEEE", {
          locale: DATE_LOCALES[patientLanguage] || DATE_LOCALES.tr
        });

        // Patient notification and message
        const patientNotificationTitle = {
          tr: 'Seans Hatırlatması',
          en: 'Session Reminder'
        };

        const endTime = format(new Date(new Date(appointment.startAt).getTime() + 50 * 60000), "HH:mm");
        const patientNotificationMessage = {
          tr: `${psychProfile.fullName} ile ${minutesUntil} dakika sonra seansınız var.\n\n📅 ${appointmentDate}\n🕐 ${appointmentTime} - ${endTime}\n\nSeansı kaçırmayın. Randevular sayfasından katılabilirsiniz.`,
          en: `You have a session with ${psychProfile.fullName} in ${minutesUntil} minutes.\n\n📅 ${appointmentDate}\n🕐 ${appointmentTime} - ${endTime}\n\nDon't miss your session. You can join from the appointments page.`
        };

        // Get message in user's language with fallback
        const getPatientMessage = (lang: SupportedLanguage) => {
          return patientNotificationMessage[lang as keyof typeof patientNotificationMessage] || patientNotificationMessage.en;
        };
        const getPatientTitle = (lang: SupportedLanguage) => {
          return patientNotificationTitle[lang as keyof typeof patientNotificationTitle] || patientNotificationTitle.en;
        };

        // Send notification to patient
        await notificationService.createNotification({
          userId: appointment.patientId,
          type: 'appointment_reminder',
          title: getPatientTitle(patientLanguage),
          message: getPatientMessage(patientLanguage),
          relatedAppointmentId: appointment.id,
        });

        // Send system message to patient
        await sendSystemMessage(
          appointment.patientId,
          getPatientMessage(patientLanguage)
        );

        console.log(`[AppointmentReminder] Sent reminder to patient ${appointment.patientId} for appointment ${appointment.id} (${minutesUntil} min remaining)`);

        // Psychologist notification and message
        const psychNotificationTitle = {
          tr: 'Seans Hatırlatması',
          en: 'Session Reminder'
        };

        const psychAppointmentDate = format(new Date(appointment.startAt), "d MMMM yyyy, EEEE", {
          locale: DATE_LOCALES[psychLanguage] || DATE_LOCALES.tr
        });

        const psychNotificationMessage = {
          tr: `${patientInfo.firstName} ile ${minutesUntil} dakika sonra seansınız var.\n\n📅 ${psychAppointmentDate}\n🕐 ${appointmentTime} - ${endTime}\n\nRandevular sayfasından seansa başlayabilirsiniz.`,
          en: `You have a session with ${patientInfo.firstName} in ${minutesUntil} minutes.\n\n📅 ${psychAppointmentDate}\n🕐 ${appointmentTime} - ${endTime}\n\nYou can start the session from your appointments page.`
        };

        // Get message in user's language with fallback
        const getPsychMessage = (lang: SupportedLanguage) => {
          return psychNotificationMessage[lang as keyof typeof psychNotificationMessage] || psychNotificationMessage.en;
        };
        const getPsychTitle = (lang: SupportedLanguage) => {
          return psychNotificationTitle[lang as keyof typeof psychNotificationTitle] || psychNotificationTitle.en;
        };

        // Check if psychologist has reminders enabled
        const psychProfileData = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, psychProfile.userId))
          .limit(1);

        const notifyEnabled = psychProfileData[0]?.notifyAppointmentReminders ?? true;

        if (notifyEnabled) {
          // Send notification to psychologist
          await notificationService.createNotification({
            userId: psychProfile.userId,
            type: 'appointment_reminder',
            title: getPsychTitle(psychLanguage),
            message: getPsychMessage(psychLanguage),
            relatedAppointmentId: appointment.id,
          });

          // Send system message to psychologist
          await sendSystemMessage(
            psychProfile.userId,
            getPsychMessage(psychLanguage)
          );

          console.log(`[AppointmentReminder] Sent reminder to psychologist ${psychProfile.userId} for appointment ${appointment.id} (${minutesUntil} min remaining)`);
        }

        // Mark as sent to prevent duplicates
        await db.update(appointments)
          .set({ reminderSent1h: true })
          .where(eq(appointments.id, appointment.id));

      } catch (error) {
        console.error(`[AppointmentReminder] Error processing appointment ${appointment.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[AppointmentReminder] Error in reminder job:', error);
  }
}

/**
 * Expire appointments that have passed their reservedUntil time without payment
 */
async function expireUnpaidAppointments(): Promise<void> {
  try {
    const now = new Date();

    // Find appointments with status 'reserved' or 'payment_pending' where reservedUntil has passed
    const expiredAppointments = await storage.getExpiredReservations(now);

    if (expiredAppointments.length === 0) {
      return;
    }

    console.log(`[AppointmentScheduler] Found ${expiredAppointments.length} expired reservations to cancel`);

    for (const appointment of expiredAppointments) {
      try {
        await storage.updateAppointmentStatus(appointment.id, 'expired');
        console.log(`[AppointmentScheduler] Expired appointment ${appointment.id} (reserved until ${appointment.reservedUntil})`);

        await storage.createAuditLog({
          actorUserId: 'system',
          entityType: 'appointment',
          entityId: appointment.id,
          action: 'expired',
          afterData: { reason: 'Payment not completed within reservation window', reservedUntil: appointment.reservedUntil },
        });
      } catch (error) {
        console.error(`[AppointmentScheduler] Error expiring appointment ${appointment.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[AppointmentScheduler] Error in expiration job:', error);
  }
}

let schedulerStarted = false;

export function startEmailScheduler(): void {
  if (schedulerStarted) {
    console.warn("[EmailScheduler] Scheduler already started");
    return;
  }

  // Check if email service is configured
  if (!emailService.isConfigured()) {
    console.warn("[EmailScheduler] Email service not configured. Scheduler will run but emails will only be logged.");
  }

  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    console.log(`[EmailScheduler] Running reminder check at ${new Date().toISOString()}`);

    // Check both 24h and 1h reminders
    for (const config of REMINDER_CONFIGS) {
      await sendReminderEmails(config);
    }
  });

  // Run every minute to check for expired reservations and upcoming appointment reminders
  cron.schedule("* * * * *", async () => {
    console.log(`[EmailScheduler] Minute cron triggered at ${new Date().toISOString()}`);
    try {
      await expireUnpaidAppointments();
      await sendUpcomingAppointmentReminders();
    } catch (error) {
      console.error("[EmailScheduler] Error in minute cron:", error);
    }
  });

  schedulerStarted = true;
  console.log("[EmailScheduler] Started - checking every minute for upcoming appointments (< 1 hour), every 5 minutes for 24h reminders, and every minute for expired reservations");
}

export function stopEmailScheduler(): void {
  // node-cron doesn't have a direct stop method for all tasks
  // In production, you'd want to track the task and call task.stop()
  schedulerStarted = false;
  console.log("[EmailScheduler] Stopped");
}

// Export for testing
export { sendReminderEmails, REMINDER_CONFIGS };
