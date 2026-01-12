import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// User roles enum
export const userRoles = ["patient", "psychologist", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

// Appointment status enum
export const appointmentStatuses = [
  "reserved",
  "payment_pending",
  "confirmed",
  "ready",
  "in_session",
  "completed",
  "cancelled",
  "expired",
  "refunded",
  "no_show"
] as const;
export type AppointmentStatus = (typeof appointmentStatuses)[number];

// Payment status enum
export const paymentStatuses = ["pending", "completed", "failed", "refunded", "refund_pending"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

// ========== USER PROFILES ==========

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  role: text("role").notNull().default("patient"),
  phone: varchar("phone"),
  timezone: varchar("timezone").default("Europe/Istanbul"),
  status: varchar("status").default("active"),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// ========== PSYCHOLOGIST PROFILES ==========

export const psychologistProfiles = pgTable("psychologist_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  fullName: varchar("full_name").notNull(),
  title: varchar("title"),
  bio: text("bio"),
  specialties: text("specialties").array(),
  languages: text("languages").array(),
  pricePerSession: decimal("price_per_session", { precision: 10, scale: 2 }).notNull(),
  sessionDuration: integer("session_duration").default(50),
  timezone: varchar("timezone").default("Europe/Istanbul"),
  verified: boolean("verified").default(false),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by"),
  verificationNotes: text("verification_notes"),
  profileImageUrl: varchar("profile_image_url"),
  yearsOfExperience: integer("years_of_experience"),
  education: text("education"),
  certifications: text("certifications").array(),
  status: varchar("status").default("pending"),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPsychologistProfileSchema = createInsertSchema(psychologistProfiles).omit({
  id: true,
  verified: true,
  verifiedAt: true,
  verifiedBy: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPsychologistProfile = z.infer<typeof insertPsychologistProfileSchema>;
export type PsychologistProfile = typeof psychologistProfiles.$inferSelect;

// ========== AVAILABILITY RULES ==========

export const availabilityRules = pgTable("availability_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  psychologistId: varchar("psychologist_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: varchar("start_time").notNull(),
  endTime: varchar("end_time").notNull(),
  slotDurationMin: integer("slot_duration_min").default(50),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAvailabilityRuleSchema = createInsertSchema(availabilityRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAvailabilityRule = z.infer<typeof insertAvailabilityRuleSchema>;
export type AvailabilityRule = typeof availabilityRules.$inferSelect;

// ========== AVAILABILITY EXCEPTIONS ==========

export const availabilityExceptions = pgTable("availability_exceptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  psychologistId: varchar("psychologist_id").notNull(),
  date: timestamp("date").notNull(),
  isOff: boolean("is_off").default(true),
  customSlots: jsonb("custom_slots"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAvailabilityExceptionSchema = createInsertSchema(availabilityExceptions).omit({
  id: true,
  createdAt: true,
});

export type InsertAvailabilityException = z.infer<typeof insertAvailabilityExceptionSchema>;
export type AvailabilityException = typeof availabilityExceptions.$inferSelect;

// ========== APPOINTMENTS ==========

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  psychologistId: varchar("psychologist_id").notNull(),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  status: varchar("status").notNull().default("reserved"),
  reservedUntil: timestamp("reserved_until"),
  meetingRoom: varchar("meeting_room"),
  joinCode: varchar("join_code"),
  joinCodeExpiresAt: timestamp("join_code_expires_at"),
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  cancelledBy: varchar("cancelled_by"),
  noShowReportedBy: varchar("no_show_reported_by"),
  noShowAt: timestamp("no_show_at"),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_appointments_patient").on(table.patientId),
  index("idx_appointments_psychologist").on(table.psychologistId),
  index("idx_appointments_start").on(table.startAt),
]);

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// ========== PAYMENTS ==========

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").notNull(),
  patientId: varchar("patient_id").notNull(),
  psychologistId: varchar("psychologist_id").notNull(),
  provider: varchar("provider").default("mock"),
  externalRef: varchar("external_ref"),
  status: varchar("status").notNull().default("pending"),
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("20"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }),
  netOfVat: decimal("net_of_vat", { precision: 10, scale: 2 }),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }),
  platformFeeRate: decimal("platform_fee_rate", { precision: 5, scale: 2 }).default("15"),
  platformVatAmount: decimal("platform_vat_amount", { precision: 10, scale: 2 }),
  processorFee: decimal("processor_fee", { precision: 10, scale: 2 }),
  providerPayout: decimal("provider_payout", { precision: 10, scale: 2 }),
  currency: varchar("currency").default("TRY"),
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  refundReason: text("refund_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// ========== PAYOUTS ==========

export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  psychologistId: varchar("psychologist_id").notNull(),
  paymentId: varchar("payment_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default("pending"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  createdAt: true,
});

export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payouts.$inferSelect;

// ========== CONVERSATIONS ==========

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  psychologistId: varchar("psychologist_id").notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_conversations_patient").on(table.patientId),
  index("idx_conversations_psychologist").on(table.psychologistId),
]);

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// ========== MESSAGES ==========

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  senderUserId: varchar("sender_user_id").notNull(),
  text: text("text").notNull(),
  readAt: timestamp("read_at"),
  reportedAt: timestamp("reported_at"),
  reportReason: text("report_reason"),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_messages_conversation").on(table.conversationId),
]);

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ========== SESSION NOTES ==========

export const sessionNotes = pgTable("session_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").notNull(),
  psychologistId: varchar("psychologist_id").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSessionNoteSchema = createInsertSchema(sessionNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSessionNote = z.infer<typeof insertSessionNoteSchema>;
export type SessionNote = typeof sessionNotes.$inferSelect;

// ========== AUDIT LOGS ==========

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: varchar("actor_user_id"),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  action: varchar("action").notNull(),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_actor").on(table.actorUserId),
  index("idx_audit_entity").on(table.entityType, table.entityId),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ========== PLATFORM SETTINGS ==========

export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;

// ========== RELATIONS ==========

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  psychologistProfile: one(psychologistProfiles, {
    fields: [userProfiles.userId],
    references: [psychologistProfiles.userId],
  }),
}));

export const psychologistProfilesRelations = relations(psychologistProfiles, ({ many }) => ({
  availabilityRules: many(availabilityRules),
  availabilityExceptions: many(availabilityExceptions),
  appointments: many(appointments),
  conversations: many(conversations),
}));

export const availabilityRulesRelations = relations(availabilityRules, ({ one }) => ({
  psychologist: one(psychologistProfiles, {
    fields: [availabilityRules.psychologistId],
    references: [psychologistProfiles.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  psychologist: one(psychologistProfiles, {
    fields: [appointments.psychologistId],
    references: [psychologistProfiles.id],
  }),
  payments: many(payments),
  sessionNotes: many(sessionNotes),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  appointment: one(appointments, {
    fields: [payments.appointmentId],
    references: [appointments.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));
