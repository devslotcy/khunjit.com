/**
 * Email Helper Functions
 *
 * Convenience functions to make email sending easier and more consistent.
 * These helpers automatically determine recipient role and call the appropriate
 * type-safe email method.
 */

import { typeSafeEmailService } from "./type-safe-service.js";
import type {
  SendToPatientOptions,
  SendToPsychologistOptions,
  TypeSafeEmailResult,
  PatientEmailVariables,
  PsychologistEmailVariables
} from "./type-safe-service.js";
import type { SupportedLanguage } from "./service.js";
import { storage } from "../storage.js";

// ========== HELPER FUNCTIONS ==========

/**
 * Get user's role from database
 */
async function getUserRole(userId: string): Promise<'patient' | 'psychologist' | null> {
  const profile = await storage.getUserProfile(userId);
  if (!profile) return null;

  if (profile.role === 'patient' || profile.role === 'psychologist') {
    return profile.role;
  }

  return null;
}

/**
 * Send welcome email (automatically determines role)
 */
export async function sendWelcomeEmail(
  userId: string,
  email: string,
  firstName: string,
  language: SupportedLanguage = 'en'
): Promise<TypeSafeEmailResult> {
  const role = await getUserRole(userId);

  if (!role) {
    return {
      success: false,
      error: `Cannot send welcome email: User ${userId} not found or has invalid role`
    };
  }

  if (role === 'patient') {
    return typeSafeEmailService.sendToPatient({
      userId,
      email,
      eventType: 'welcome',
      variables: { firstName },
      language
    });
  } else {
    return typeSafeEmailService.sendToPsychologist({
      userId,
      email,
      eventType: 'welcome',
      variables: { firstName },
      language
    });
  }
}

/**
 * Send appointment confirmed email to patient
 */
export async function sendAppointmentConfirmedToPatient(
  userId: string,
  email: string,
  appointmentId: string,
  variables: {
    firstName: string;
    psychologistName: string;
    appointmentDate: string;
    appointmentTime: string;
    joinLink?: string;
  },
  language: SupportedLanguage = 'en'
): Promise<TypeSafeEmailResult> {
  return typeSafeEmailService.sendToPatient({
    userId,
    email,
    eventType: 'appointment_confirmed',
    variables,
    language,
    appointmentId
  });
}

/**
 * Send appointment confirmed email to psychologist
 */
export async function sendAppointmentConfirmedToPsychologist(
  userId: string,
  email: string,
  appointmentId: string,
  variables: {
    firstName: string;
    patientName: string;
    appointmentDate: string;
    appointmentTime: string;
  },
  language: SupportedLanguage = 'en'
): Promise<TypeSafeEmailResult> {
  return typeSafeEmailService.sendToPsychologist({
    userId,
    email,
    eventType: 'appointment_confirmed',
    variables,
    language,
    appointmentId
  });
}

/**
 * Send appointment cancelled email
 */
export async function sendAppointmentCancelledEmail(
  userId: string,
  email: string,
  appointmentId: string,
  role: 'patient' | 'psychologist',
  variables: {
    firstName: string;
    psychologistName?: string;
    patientName?: string;
    appointmentDate: string;
    appointmentTime: string;
  },
  language: SupportedLanguage = 'en'
): Promise<TypeSafeEmailResult> {
  if (role === 'patient') {
    return typeSafeEmailService.sendToPatient({
      userId,
      email,
      eventType: 'appointment_cancelled',
      variables: {
        firstName: variables.firstName,
        psychologistName: variables.psychologistName,
        appointmentDate: variables.appointmentDate,
        appointmentTime: variables.appointmentTime,
      },
      language,
      appointmentId
    });
  } else {
    return typeSafeEmailService.sendToPsychologist({
      userId,
      email,
      eventType: 'appointment_cancelled',
      variables: {
        firstName: variables.firstName,
        patientName: variables.patientName,
        appointmentDate: variables.appointmentDate,
        appointmentTime: variables.appointmentTime,
      },
      language,
      appointmentId
    });
  }
}

/**
 * Send reminder email (24h or 1h)
 */
export async function sendReminderEmail(
  userId: string,
  email: string,
  appointmentId: string,
  role: 'patient' | 'psychologist',
  reminderType: '24h' | '1h',
  variables: {
    firstName: string;
    psychologistName?: string;
    patientName?: string;
    appointmentDate: string;
    appointmentTime: string;
    joinLink?: string;
  },
  language: SupportedLanguage = 'en'
): Promise<TypeSafeEmailResult> {
  const eventType = reminderType === '24h' ? 'reminder_24h' : 'reminder_1h';

  if (role === 'patient') {
    return typeSafeEmailService.sendToPatient({
      userId,
      email,
      eventType,
      variables: {
        firstName: variables.firstName,
        psychologistName: variables.psychologistName,
        appointmentDate: variables.appointmentDate,
        appointmentTime: variables.appointmentTime,
        joinLink: variables.joinLink,
      },
      language,
      appointmentId
    });
  } else {
    return typeSafeEmailService.sendToPsychologist({
      userId,
      email,
      eventType,
      variables: {
        firstName: variables.firstName,
        patientName: variables.patientName,
        appointmentDate: variables.appointmentDate,
        appointmentTime: variables.appointmentTime,
      },
      language,
      appointmentId
    });
  }
}

/**
 * Send session followup email (after session ends)
 */
export async function sendSessionFollowupEmail(
  userId: string,
  email: string,
  appointmentId: string,
  variables: {
    firstName: string;
    psychologistName: string;
    appointmentDate: string;
    appointmentTime: string;
  },
  language: SupportedLanguage = 'en'
): Promise<TypeSafeEmailResult> {
  return typeSafeEmailService.sendToPatient({
    userId,
    email,
    eventType: 'session_followup',
    variables,
    language,
    appointmentId
  });
}

/**
 * Send verification approved email (psychologist only)
 */
export async function sendVerificationApprovedEmail(
  userId: string,
  email: string,
  firstName: string,
  language: SupportedLanguage = 'en'
): Promise<TypeSafeEmailResult> {
  return typeSafeEmailService.sendToPsychologist({
    userId,
    email,
    eventType: 'verification_approved',
    variables: { firstName },
    language
  });
}

/**
 * Send verification rejected email (psychologist only)
 */
export async function sendVerificationRejectedEmail(
  userId: string,
  email: string,
  firstName: string,
  language: SupportedLanguage = 'en'
): Promise<TypeSafeEmailResult> {
  return typeSafeEmailService.sendToPsychologist({
    userId,
    email,
    eventType: 'verification_rejected',
    variables: { firstName },
    language
  });
}
