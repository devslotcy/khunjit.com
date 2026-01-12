import { 
  userProfiles,
  psychologistProfiles,
  availabilityRules,
  availabilityExceptions,
  appointments,
  payments,
  payouts,
  conversations,
  messages,
  sessionNotes,
  auditLogs,
  platformSettings,
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
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type SessionNote,
  type InsertSessionNote,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, isNull, desc, or, ilike } from "drizzle-orm";

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
  createAvailabilityException(exception: InsertAvailabilityException): Promise<AvailabilityException>;
  
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByPatient(patientId: string): Promise<Appointment[]>;
  getAppointmentsByPsychologist(psychologistId: string): Promise<Appointment[]>;
  getUpcomingAppointments(userId: string, role: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
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
  createSessionNote(note: InsertSessionNote): Promise<SessionNote>;
  updateSessionNote(id: string, data: Partial<SessionNote>): Promise<SessionNote | undefined>;
  
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { entityType?: string; entityId?: string }): Promise<AuditLog[]>;
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
    return profile || undefined;
  }

  async getPsychologistByUserId(userId: string): Promise<PsychologistProfile | undefined> {
    const [profile] = await db.select().from(psychologistProfiles)
      .where(and(eq(psychologistProfiles.userId, userId), isNull(psychologistProfiles.deletedAt)));
    return profile || undefined;
  }

  async getAllPsychologists(filters?: { search?: string; specialty?: string; verified?: boolean }): Promise<PsychologistProfile[]> {
    let query = db.select().from(psychologistProfiles)
      .where(and(
        isNull(psychologistProfiles.deletedAt),
        filters?.verified !== undefined ? eq(psychologistProfiles.verified, filters.verified) : undefined
      ));
    
    const results = await query;
    
    let filtered = results;
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
    return created;
  }

  async updatePsychologistProfile(id: string, data: Partial<PsychologistProfile>): Promise<PsychologistProfile | undefined> {
    const [updated] = await db.update(psychologistProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(psychologistProfiles.id, id))
      .returning();
    return updated || undefined;
  }

  async getPendingPsychologists(): Promise<PsychologistProfile[]> {
    return db.select().from(psychologistProfiles)
      .where(and(
        eq(psychologistProfiles.verified, false),
        eq(psychologistProfiles.status, "pending"),
        isNull(psychologistProfiles.deletedAt)
      ));
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

  async createAvailabilityException(exception: InsertAvailabilityException): Promise<AvailabilityException> {
    const [created] = await db.insert(availabilityExceptions).values(exception).returning();
    return created;
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

  async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updated || undefined;
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
}

export const storage = new DatabaseStorage();
