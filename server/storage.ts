import {
  userProfiles,
  psychologistProfiles,
  availabilityRules,
  availabilityExceptions,
  appointments,
  payments,
  payouts,
  refunds,
  earnings,
  conversations,
  messages,
  sessionNotes,
  auditLogs,
  platformSettings,
  bankTransfers,
  emailLogs,
  type UserProfile,
  type InsertUserProfile,
  type PsychologistProfile,
  type InsertPsychologistProfile,
  type AvailabilityRule,
  type InsertAvailabilityRule,
  type AvailabilityException,
  type InsertAvailabilityException,
  type Appointment,
  type InsertAppointment,
  type Payment,
  type InsertPayment,
  type Refund,
  type InsertRefund,
  type Earning,
  type InsertEarning,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type SessionNote,
  type InsertSessionNote,
  type AuditLog,
  type InsertAuditLog,
  type BankTransfer,
  type InsertBankTransfer,
  type EmailLog,
  type InsertEmailLog,
  type EmailType,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, isNull, desc, asc, or, ilike, sql } from "drizzle-orm";

// Mapping for Turkish specialty/approach values to English keys
const SPECIALTY_TR_TO_EN: Record<string, string> = {
  "Bireysel Terapi": "individual",
  "Çift Terapisi": "couples",
  "Aile Terapisi": "family",
  "Çocuk ve Ergen": "childAdolescent",
  "Depresyon": "depression",
  "Anksiyete": "anxiety",
  "Travma ve TSSB": "trauma",
  "Obsesif Kompulsif Bozukluk": "ocd",
  "Yeme Bozuklukları": "eatingDisorders",
  "Bağımlılık": "addiction",
  "Kariyer Danışmanlığı": "careerCounseling",
  "Stres Yönetimi": "stressManagement",
  "Öfke Yönetimi": "angerManagement",
};

const THERAPY_APPROACH_TR_TO_EN: Record<string, string> = {
  "Bilişsel Davranışçı Terapi (BDT)": "cbt",
  "Psikodinamik Terapi": "psychodynamic",
  "EMDR": "emdr",
  "Şema Terapi": "schema",
  "Kabul ve Kararlılık Terapisi (ACT)": "act",
  "Gestalt Terapi": "gestalt",
  "Çözüm Odaklı Terapi": "solutionFocused",
  "Varoluşçu Terapi": "existential",
  "Farkındalık Temelli Terapi": "mindfulness",
};

// Reverse mappings for EN to TR (for saving)
const SPECIALTY_EN_TO_TR: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIALTY_TR_TO_EN).map(([tr, en]) => [en, tr])
);

const THERAPY_APPROACH_EN_TO_TR: Record<string, string> = Object.fromEntries(
  Object.entries(THERAPY_APPROACH_TR_TO_EN).map(([tr, en]) => [en, tr])
);

// Helper function to convert Turkish values to English keys
function convertTurkishToEnglishKeys(values: string[] | null, mapping: Record<string, string>): string[] {
  if (!values) return [];
  return values
    .map(value => {
      // If already an English key, return as-is
      if (Object.values(mapping).includes(value)) {
        return value;
      }
      // Otherwise map from Turkish
      return mapping[value] || value;
    })
    .filter(Boolean);
}

// Helper function to convert English keys to Turkish values (for saving to DB)
function convertEnglishToTurkishKeys(keys: string[] | null, mapping: Record<string, string>): string[] {
  if (!keys) return [];
  return keys
    .map(key => {
      // If already a Turkish value, return as-is
      if (Object.keys(SPECIALTY_TR_TO_EN).includes(key) || Object.keys(THERAPY_APPROACH_TR_TO_EN).includes(key)) {
        return key;
      }
      // Otherwise map from English
      return mapping[key] || key;
    })
    .filter(Boolean);
}

export interface IStorage {
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | undefined>;
  
  getPsychologistProfile(id: string): Promise<PsychologistProfile | undefined>;
  getPsychologistByUserId(userId: string): Promise<PsychologistProfile | undefined>;
  getAllPsychologists(filters?: { search?: string; specialty?: string; verified?: boolean }): Promise<PsychologistProfile[]>;
  createPsychologistProfile(profile: InsertPsychologistProfile): Promise<PsychologistProfile>;
  updatePsychologistProfile(id: string, data: Partial<PsychologistProfile>): Promise<PsychologistProfile | undefined>;
  getPendingPsychologists(): Promise<PsychologistProfile[]>;
  
  getAvailabilityRules(psychologistId: string): Promise<AvailabilityRule[]>;
  setAvailabilityRules(psychologistId: string, rules: InsertAvailabilityRule[]): Promise<AvailabilityRule[]>;
  
  getAvailabilityExceptions(psychologistId: string, startDate: Date, endDate: Date): Promise<AvailabilityException[]>;
  getAvailabilityException(psychologistId: string, date: Date): Promise<AvailabilityException | undefined>;
  createAvailabilityException(exception: InsertAvailabilityException): Promise<AvailabilityException>;
  deleteAvailabilityException(id: string, psychologistId: string): Promise<void>;

  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByPatient(patientId: string): Promise<Appointment[]>;
  getAppointmentsByPsychologist(psychologistId: string): Promise<Appointment[]>;
  getUpcomingAppointments(userId: string, role: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  reserveAppointmentAtomic(params: {
    patientId: string;
    psychologistId: string;
    startAt: Date;
    endAt: Date;
    reservedUntil: Date;
    meetingRoom: string;
  }): Promise<Appointment>;
  updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | undefined>;
  
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentByAppointment(appointmentId: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, data: Partial<Payment>): Promise<Payment | undefined>;
  
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationByParticipants(patientId: string, psychologistId: string): Promise<Conversation | undefined>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  
  getSessionNote(appointmentId: string): Promise<SessionNote | undefined>;
  getSessionNoteById(id: string): Promise<SessionNote | undefined>;
  createSessionNote(note: InsertSessionNote): Promise<SessionNote>;
  updateSessionNote(id: string, data: Partial<SessionNote>): Promise<SessionNote | undefined>;
  
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { entityType?: string; entityId?: string }): Promise<AuditLog[]>;
  
  getRefund(id: string): Promise<Refund | undefined>;
  getRefundByAppointment(appointmentId: string): Promise<Refund | undefined>;
  getRefundsByPayment(paymentId: string): Promise<Refund[]>;
  getAllRefunds(): Promise<Refund[]>;
  createRefund(refund: InsertRefund): Promise<Refund>;
  updateRefund(id: string, data: Partial<Refund>): Promise<Refund | undefined>;
  
  getAllPayments(filters?: { status?: string; patientId?: string; psychologistId?: string }): Promise<Payment[]>;
  getPaymentsByPatient(patientId: string): Promise<Payment[]>;
  getPaymentsByPsychologist(psychologistId: string): Promise<Payment[]>;

  getAllAppointments(filters?: { status?: string; psychologistId?: string; patientId?: string }): Promise<Appointment[]>;
  getAllUserProfiles(): Promise<UserProfile[]>;

  getBankTransfer(id: string): Promise<BankTransfer | undefined>;
  getBankTransferByAppointment(appointmentId: string): Promise<BankTransfer | undefined>;
  createBankTransfer(transfer: InsertBankTransfer): Promise<BankTransfer>;
  updateBankTransfer(id: string, data: Partial<BankTransfer>): Promise<BankTransfer | undefined>;
  getAllPendingBankTransfers(): Promise<BankTransfer[]>;
  getAllBankTransfers(filters?: {
    status?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ transfers: BankTransfer[]; total: number }>;

  // Earnings
  getEarning(id: string): Promise<Earning | undefined>;
  getEarningByAppointment(appointmentId: string): Promise<Earning | undefined>;
  getEarningsByPsychologist(psychologistId: string): Promise<Earning[]>;
  createEarning(earning: InsertEarning): Promise<Earning>;
  createEarningIfNotExists(earning: InsertEarning): Promise<Earning | null>;
  updateEarning(id: string, data: Partial<Earning>): Promise<Earning | undefined>;

  // Email Logs
  getEmailLog(userId: string, type: EmailType, appointmentId?: string): Promise<EmailLog | null>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;
  updateEmailLog(id: string, data: { status: string; sentAt?: Date; errorMessage?: string }): Promise<void>;
  getAppointmentsNeedingReminders(hoursAhead: number): Promise<Appointment[]>;
}

export class DatabaseStorage implements IStorage {
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }

  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db.update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated || undefined;
  }

  async getPsychologistProfile(id: string): Promise<PsychologistProfile | undefined> {
    const [profile] = await db.select().from(psychologistProfiles)
      .where(and(eq(psychologistProfiles.id, id), isNull(psychologistProfiles.deletedAt)));

    // Clean duplicates and convert Turkish values to English keys
    if (profile) {
      const uniqueSpecialties = Array.from(new Set(profile.specialties || []));
      const uniqueApproaches = Array.from(new Set(profile.therapyApproaches || []));

      return {
        ...profile,
        specialties: convertTurkishToEnglishKeys(uniqueSpecialties, SPECIALTY_TR_TO_EN),
        therapyApproaches: convertTurkishToEnglishKeys(uniqueApproaches, THERAPY_APPROACH_TR_TO_EN)
      };
    }
    return undefined;
  }

  async getPsychologistByUserId(userId: string): Promise<PsychologistProfile | undefined> {
    const [profile] = await db.select().from(psychologistProfiles)
      .where(and(eq(psychologistProfiles.userId, userId), isNull(psychologistProfiles.deletedAt)));

    // Clean duplicates and convert Turkish values to English keys
    if (profile) {
      const uniqueSpecialties = Array.from(new Set(profile.specialties || []));
      const uniqueApproaches = Array.from(new Set(profile.therapyApproaches || []));

      return {
        ...profile,
        specialties: convertTurkishToEnglishKeys(uniqueSpecialties, SPECIALTY_TR_TO_EN),
        therapyApproaches: convertTurkishToEnglishKeys(uniqueApproaches, THERAPY_APPROACH_TR_TO_EN)
      };
    }
    return undefined;
  }

  async getAllPsychologists(filters?: { search?: string; specialty?: string; verified?: boolean }): Promise<PsychologistProfile[]> {
    const conditions = [
      isNull(psychologistProfiles.deletedAt),
      eq(psychologistProfiles.status, "active"),
      eq(psychologistProfiles.verified, true),
      eq(psychologistProfiles.verificationStatus, "approved"),
    ];

    const query = db.select().from(psychologistProfiles)
      .where(and(...conditions));

    const results = await query;

    // Clean duplicates and convert Turkish values to English keys
    const cleanedResults = results.map(profile => {
      const uniqueSpecialties = Array.from(new Set(profile.specialties || []));
      const uniqueApproaches = Array.from(new Set(profile.therapyApproaches || []));

      return {
        ...profile,
        specialties: convertTurkishToEnglishKeys(uniqueSpecialties, SPECIALTY_TR_TO_EN),
        therapyApproaches: convertTurkishToEnglishKeys(uniqueApproaches, THERAPY_APPROACH_TR_TO_EN)
      };
    });

    let filtered = cleanedResults;
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.fullName?.toLowerCase().includes(searchLower) ||
        p.bio?.toLowerCase().includes(searchLower)
      );
    }
    if (filters?.specialty) {
      filtered = filtered.filter(p =>
        p.specialties?.includes(filters.specialty!)
      );
    }

    return filtered;
  }

  async createPsychologistProfile(profile: InsertPsychologistProfile): Promise<PsychologistProfile> {
    const [created] = await db.insert(psychologistProfiles).values(profile).returning();

    // Create default availability rules (Mon-Fri, 09:00-17:00)
    const defaultRules = [1, 2, 3, 4, 5].map(dayOfWeek => ({
      psychologistId: created.id,
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
      slotDurationMin: 50,
      isActive: true,
    }));

    await db.insert(availabilityRules).values(defaultRules);

    return created;
  }

  async updatePsychologistProfile(id: string, data: Partial<PsychologistProfile>): Promise<PsychologistProfile | undefined> {
    // Convert English keys to Turkish values before saving
    const dataToSave = { ...data };
    if (data.specialties) {
      dataToSave.specialties = convertEnglishToTurkishKeys(data.specialties, SPECIALTY_EN_TO_TR);
    }
    if (data.therapyApproaches) {
      dataToSave.therapyApproaches = convertEnglishToTurkishKeys(data.therapyApproaches, THERAPY_APPROACH_EN_TO_TR);
    }

    const [updated] = await db.update(psychologistProfiles)
      .set({ ...dataToSave, updatedAt: new Date() })
      .where(eq(psychologistProfiles.id, id))
      .returning();

    // Convert back to English keys for return value
    if (updated) {
      const uniqueSpecialties = Array.from(new Set(updated.specialties || []));
      const uniqueApproaches = Array.from(new Set(updated.therapyApproaches || []));

      return {
        ...updated,
        specialties: convertTurkishToEnglishKeys(uniqueSpecialties, SPECIALTY_TR_TO_EN),
        therapyApproaches: convertTurkishToEnglishKeys(uniqueApproaches, THERAPY_APPROACH_TR_TO_EN)
      };
    }
    return undefined;
  }

  async getPendingPsychologists(): Promise<PsychologistProfile[]> {
    return db.select().from(psychologistProfiles)
      .where(and(
        eq(psychologistProfiles.verified, false),
        eq(psychologistProfiles.verificationStatus, "pending"),
        isNull(psychologistProfiles.deletedAt)
      ))
      .orderBy(psychologistProfiles.createdAt);
  }

  async getAvailabilityRules(psychologistId: string): Promise<AvailabilityRule[]> {
    return db.select().from(availabilityRules)
      .where(and(
        eq(availabilityRules.psychologistId, psychologistId),
        eq(availabilityRules.isActive, true)
      ));
  }

  async setAvailabilityRules(psychologistId: string, rules: InsertAvailabilityRule[]): Promise<AvailabilityRule[]> {
    await db.update(availabilityRules)
      .set({ isActive: false })
      .where(eq(availabilityRules.psychologistId, psychologistId));

    if (rules.length === 0) return [];

    const created = await db.insert(availabilityRules)
      .values(rules.map(r => ({ ...r, psychologistId })))
      .returning();
    return created;
  }

  async getAvailabilityExceptions(psychologistId: string, startDate: Date, endDate: Date): Promise<AvailabilityException[]> {
    return db.select().from(availabilityExceptions)
      .where(and(
        eq(availabilityExceptions.psychologistId, psychologistId),
        gte(availabilityExceptions.date, startDate),
        lte(availabilityExceptions.date, endDate)
      ));
  }

  async getAvailabilityException(psychologistId: string, date: Date): Promise<AvailabilityException | undefined> {
    const [exception] = await db.select().from(availabilityExceptions)
      .where(and(
        eq(availabilityExceptions.psychologistId, psychologistId),
        eq(availabilityExceptions.date, date)
      ))
      .limit(1);
    return exception;
  }

  async createAvailabilityException(exception: InsertAvailabilityException): Promise<AvailabilityException> {
    const [created] = await db.insert(availabilityExceptions).values(exception).returning();
    return created;
  }

  async deleteAvailabilityException(id: string, psychologistId: string): Promise<void> {
    await db.delete(availabilityExceptions)
      .where(and(
        eq(availabilityExceptions.id, id),
        eq(availabilityExceptions.psychologistId, psychologistId)
      ));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments)
      .where(and(eq(appointments.id, id), isNull(appointments.deletedAt)));
    return appointment || undefined;
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    return db.select().from(appointments)
      .where(and(eq(appointments.patientId, patientId), isNull(appointments.deletedAt)))
      .orderBy(desc(appointments.startAt));
  }

  async getAppointmentsByPsychologist(psychologistId: string): Promise<Appointment[]> {
    return db.select().from(appointments)
      .where(and(eq(appointments.psychologistId, psychologistId), isNull(appointments.deletedAt)))
      .orderBy(desc(appointments.startAt));
  }

  async getUpcomingAppointments(userId: string, role: string): Promise<Appointment[]> {
    const now = new Date();
    const condition = role === "psychologist" 
      ? eq(appointments.psychologistId, userId)
      : eq(appointments.patientId, userId);
    
    return db.select().from(appointments)
      .where(and(
        condition,
        gte(appointments.startAt, now),
        isNull(appointments.deletedAt)
      ))
      .orderBy(appointments.startAt);
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [created] = await db.insert(appointments).values(appointment).returning();
    return created;
  }

  async reserveAppointmentAtomic(params: {
    patientId: string;
    psychologistId: string;
    startAt: Date;
    endAt: Date;
    reservedUntil: Date;
    meetingRoom: string;
  }): Promise<Appointment> {
    const { patientId, psychologistId, startAt, endAt, reservedUntil, meetingRoom } = params;

    const result = await db.execute(sql`
      SELECT reserve_appointment_slot(
        ${patientId}::VARCHAR,
        ${psychologistId}::VARCHAR,
        ${startAt.toISOString()}::TIMESTAMPTZ,
        ${endAt.toISOString()}::TIMESTAMPTZ,
        ${reservedUntil.toISOString()}::TIMESTAMPTZ,
        ${meetingRoom}::VARCHAR
      )
    `);

    const appointmentId = (result.rows[0] as any).reserve_appointment_slot;

    const appointment = await this.getAppointment(appointmentId);
    if (!appointment) {
      throw new Error("Failed to create appointment");
    }

    return appointment;
  }

  async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updated || undefined;
  }

  async updateAppointmentStatus(id: string, status: string): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updated || undefined;
  }

  async getExpiredReservations(now: Date): Promise<Appointment[]> {
    return await db.select()
      .from(appointments)
      .where(
        and(
          or(
            eq(appointments.status, 'reserved'),
            eq(appointments.status, 'payment_pending')
          ),
          lte(appointments.reservedUntil, now)
        )
      );
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentByAppointment(appointmentId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.appointmentId, appointmentId));
    return payment || undefined;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    return created;
  }

  async updatePayment(id: string, data: Partial<Payment>): Promise<Payment | undefined> {
    const [updated] = await db.update(payments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return updated || undefined;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationByParticipants(patientId: string, psychologistId: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations)
      .where(and(
        eq(conversations.patientId, patientId),
        eq(conversations.psychologistId, psychologistId)
      ));
    return conversation || undefined;
  }

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return db.select().from(conversations)
      .where(or(
        eq(conversations.patientId, userId),
        eq(conversations.psychologistId, userId)
      ))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conversation).returning();
    return created;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return db.select().from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        isNull(messages.deletedAt)
      ))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    
    await db.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, message.conversationId));
    
    return created;
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await db.update(messages)
      .set({ readAt: new Date() })
      .where(and(
        eq(messages.conversationId, conversationId),
        isNull(messages.readAt)
      ));
  }

  async getSessionNote(appointmentId: string): Promise<SessionNote | undefined> {
    const [note] = await db.select().from(sessionNotes).where(eq(sessionNotes.appointmentId, appointmentId));
    return note || undefined;
  }

  async getSessionNoteById(id: string): Promise<SessionNote | undefined> {
    const [note] = await db.select().from(sessionNotes).where(eq(sessionNotes.id, id));
    return note || undefined;
  }

  async createSessionNote(note: InsertSessionNote): Promise<SessionNote> {
    const [created] = await db.insert(sessionNotes).values(note).returning();
    return created;
  }

  async updateSessionNote(id: string, data: Partial<SessionNote>): Promise<SessionNote | undefined> {
    const [updated] = await db.update(sessionNotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sessionNotes.id, id))
      .returning();
    return updated || undefined;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getAuditLogs(filters?: { entityType?: string; entityId?: string }): Promise<AuditLog[]> {
    let conditions = [];
    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters?.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }
    
    if (conditions.length > 0) {
      return db.select().from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt));
    }
    
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
  }

  async getRefund(id: string): Promise<Refund | undefined> {
    const [refund] = await db.select().from(refunds).where(eq(refunds.id, id));
    return refund || undefined;
  }

  async getRefundByAppointment(appointmentId: string): Promise<Refund | undefined> {
    const [refund] = await db.select().from(refunds).where(eq(refunds.appointmentId, appointmentId));
    return refund || undefined;
  }

  async getRefundsByPayment(paymentId: string): Promise<Refund[]> {
    return db.select().from(refunds).where(eq(refunds.paymentId, paymentId));
  }

  async getAllRefunds(): Promise<Refund[]> {
    return db.select().from(refunds).orderBy(desc(refunds.createdAt));
  }

  async createRefund(refund: InsertRefund): Promise<Refund> {
    const [created] = await db.insert(refunds).values(refund).returning();
    return created;
  }

  async updateRefund(id: string, data: Partial<Refund>): Promise<Refund | undefined> {
    const [updated] = await db.update(refunds)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(refunds.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllPayments(filters?: { status?: string; patientId?: string; psychologistId?: string }): Promise<Payment[]> {
    let conditions = [];
    if (filters?.status) {
      conditions.push(eq(payments.status, filters.status));
    }
    if (filters?.patientId) {
      conditions.push(eq(payments.patientId, filters.patientId));
    }
    if (filters?.psychologistId) {
      conditions.push(eq(payments.psychologistId, filters.psychologistId));
    }
    
    if (conditions.length > 0) {
      return db.select().from(payments)
        .where(and(...conditions))
        .orderBy(desc(payments.createdAt));
    }
    
    return db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async getPaymentsByPatient(patientId: string): Promise<Payment[]> {
    return db.select().from(payments)
      .where(eq(payments.patientId, patientId))
      .orderBy(desc(payments.createdAt));
  }

  async getPaymentsByPsychologist(psychologistId: string): Promise<Payment[]> {
    return db.select().from(payments)
      .where(eq(payments.psychologistId, psychologistId))
      .orderBy(desc(payments.createdAt));
  }

  async getAllAppointments(filters?: { status?: string; psychologistId?: string; patientId?: string }): Promise<Appointment[]> {
    let conditions = [isNull(appointments.deletedAt)];
    if (filters?.status) {
      conditions.push(eq(appointments.status, filters.status));
    }
    if (filters?.psychologistId) {
      conditions.push(eq(appointments.psychologistId, filters.psychologistId));
    }
    if (filters?.patientId) {
      conditions.push(eq(appointments.patientId, filters.patientId));
    }
    
    return db.select().from(appointments)
      .where(and(...conditions))
      .orderBy(desc(appointments.startAt));
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    return db.select().from(userProfiles)
      .where(isNull(userProfiles.deletedAt))
      .orderBy(desc(userProfiles.createdAt));
  }

  async getBankTransfer(id: string): Promise<BankTransfer | undefined> {
    const [transfer] = await db.select().from(bankTransfers).where(eq(bankTransfers.id, id));
    return transfer || undefined;
  }

  async getBankTransferByAppointment(appointmentId: string): Promise<BankTransfer | undefined> {
    const [transfer] = await db.select().from(bankTransfers).where(eq(bankTransfers.appointmentId, appointmentId));
    return transfer || undefined;
  }

  async createBankTransfer(transfer: InsertBankTransfer): Promise<BankTransfer> {
    const [newTransfer] = await db.insert(bankTransfers).values(transfer).returning();
    return newTransfer;
  }

  async updateBankTransfer(id: string, data: Partial<BankTransfer>): Promise<BankTransfer | undefined> {
    const [updated] = await db.update(bankTransfers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bankTransfers.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllPendingBankTransfers(): Promise<BankTransfer[]> {
    return db.select().from(bankTransfers)
      .where(eq(bankTransfers.status, "pending_review"))
      .orderBy(desc(bankTransfers.submittedAt));
  }

  async getAllBankTransfers(filters?: {
    status?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ transfers: BankTransfer[]; total: number }> {
    const conditions = [];

    // Status filter
    if (filters?.status && filters.status !== 'all') {
      conditions.push(eq(bankTransfers.status, filters.status));
    }

    // Date range filter
    if (filters?.startDate) {
      conditions.push(gte(bankTransfers.submittedAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(bankTransfers.submittedAt, filters.endDate));
    }

    // Search filter (referenceCode, bankName, accountHolder, iban)
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(bankTransfers.referenceCode, searchTerm),
          ilike(bankTransfers.bankName, searchTerm),
          ilike(bankTransfers.accountHolder, searchTerm),
          ilike(bankTransfers.iban, searchTerm)
        )
      );
    }

    // Build where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countQuery = whereClause
      ? db.select({ count: sql<number>`count(*)::int` }).from(bankTransfers).where(whereClause)
      : db.select({ count: sql<number>`count(*)::int` }).from(bankTransfers);

    const [{ count: total }] = await countQuery;

    // Determine sort column and order
    let orderByColumn;
    switch (filters?.sortBy) {
      case 'amount':
        orderByColumn = bankTransfers.amount;
        break;
      case 'status':
        orderByColumn = bankTransfers.status;
        break;
      case 'date':
      default:
        orderByColumn = bankTransfers.submittedAt;
    }

    const orderFn = filters?.sortOrder === 'asc' ? asc : desc;

    // Build query
    let query = db.select().from(bankTransfers);

    if (whereClause) {
      query = query.where(whereClause) as any;
    }

    query = query.orderBy(orderFn(orderByColumn)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const transfers = await query;

    return { transfers, total };
  }

  // ========== EARNINGS ==========

  async getEarning(id: string): Promise<Earning | undefined> {
    const [earning] = await db.select().from(earnings).where(eq(earnings.id, id));
    return earning || undefined;
  }

  async getEarningByAppointment(appointmentId: string): Promise<Earning | undefined> {
    const [earning] = await db.select().from(earnings).where(eq(earnings.appointmentId, appointmentId));
    return earning || undefined;
  }

  async getEarningsByPsychologist(psychologistId: string): Promise<Earning[]> {
    return db.select().from(earnings)
      .where(eq(earnings.psychologistId, psychologistId))
      .orderBy(desc(earnings.createdAt));
  }

  async createEarning(earning: InsertEarning): Promise<Earning> {
    const [created] = await db.insert(earnings).values(earning).returning();
    return created;
  }

  /**
   * Create earning only if it doesn't exist (idempotent)
   * Uses ON CONFLICT DO NOTHING for the unique appointment_id constraint
   */
  async createEarningIfNotExists(earning: InsertEarning): Promise<Earning | null> {
    const [created] = await db.insert(earnings)
      .values(earning)
      .onConflictDoNothing({ target: earnings.appointmentId })
      .returning();
    return created || null;
  }

  async updateEarning(id: string, data: Partial<Earning>): Promise<Earning | undefined> {
    const [updated] = await db.update(earnings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(earnings.id, id))
      .returning();
    return updated || undefined;
  }

  // ========== EMAIL LOGS ==========

  async getEmailLog(userId: string, type: EmailType, appointmentId?: string): Promise<EmailLog | null> {
    const conditions = [
      eq(emailLogs.userId, userId),
      eq(emailLogs.type, type),
    ];

    if (appointmentId) {
      conditions.push(eq(emailLogs.appointmentId, appointmentId));
    } else {
      conditions.push(isNull(emailLogs.appointmentId));
    }

    const [log] = await db.select().from(emailLogs).where(and(...conditions));
    return log || null;
  }

  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    const [created] = await db.insert(emailLogs).values(log).returning();
    return created;
  }

  async updateEmailLog(id: string, data: { status: string; sentAt?: Date; errorMessage?: string }): Promise<void> {
    await db.update(emailLogs)
      .set(data)
      .where(eq(emailLogs.id, id));
  }

  /**
   * Get appointments that need reminder emails
   * Returns confirmed/ready appointments starting within the specified hours
   * that haven't received a reminder email yet for that time period
   */
  async getAppointmentsNeedingReminders(hoursAhead: number): Promise<Appointment[]> {
    const now = new Date();
    const targetTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    // Window: hoursAhead +/- 5 minutes to catch appointments in scheduler interval
    const windowStart = new Date(targetTime.getTime() - 5 * 60 * 1000);
    const windowEnd = new Date(targetTime.getTime() + 5 * 60 * 1000);

    const reminderType = hoursAhead === 24 ? "reminder_24h" : "reminder_1h";

    // Get appointments in the time window with confirmed/ready status
    const upcomingAppointments = await db.select().from(appointments)
      .where(and(
        or(
          eq(appointments.status, "confirmed"),
          eq(appointments.status, "ready")
        ),
        gte(appointments.startAt, windowStart),
        lte(appointments.startAt, windowEnd),
        isNull(appointments.deletedAt)
      ));

    // Filter out appointments that already have a reminder sent
    const result: Appointment[] = [];
    for (const appointment of upcomingAppointments) {
      const existingLog = await db.select().from(emailLogs)
        .where(and(
          eq(emailLogs.appointmentId, appointment.id),
          eq(emailLogs.type, reminderType),
          eq(emailLogs.status, "sent")
        ));

      if (existingLog.length === 0) {
        result.push(appointment);
      }
    }

    return result;
  }
}

export const storage = new DatabaseStorage();
