import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// User roles enum
export const userRoles = ["patient", "psychologist", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

// ========== LANGUAGES ==========

export const languages = pgTable("languages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).notNull().unique(), // e.g., "en", "tr", "th"
  name: varchar("name", { length: 50 }).notNull(), // e.g., "English", "Turkish", "Thai"
  nativeName: varchar("native_name", { length: 50 }), // e.g., "English", "Türkçe", "ไทย"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLanguageSchema = createInsertSchema(languages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLanguage = z.infer<typeof insertLanguageSchema>;
export type Language = typeof languages.$inferSelect;

// Appointment status enum
export const appointmentStatuses = [
  "pending_approval",  // Danışan talep gönderdi, psikolog onayı bekliyor
  "reserved",          // Slot geçici olarak rezerve edildi (10 dk)
  "payment_pending",   // Ödeme bekleniyor
  "payment_review",    // Havale bildirimi yapıldı, admin kontrolü bekleniyor
  "confirmed",         // Onaylandı ve ödendi
  "ready",            // Seans başlamaya hazır
  "in_session",       // Seans devam ediyor
  "completed",        // Seans tamamlandı
  "cancelled",        // İptal edildi
  "expired",          // Zaman aşımına uğradı
  "refunded",         // İade edildi
  "no_show",          // Katılmadı
  "rejected"          // Psikolog/Admin tarafından reddedildi
] as const;
export type AppointmentStatus = (typeof appointmentStatuses)[number];

// Payment status enum - PromptPay compatible
export const paymentStatuses = ["created", "pending", "paid", "failed", "expired", "refunded", "refund_pending"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

// ========== USER PROFILES ==========

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  role: text("role").notNull().default("patient"),
  languageId: varchar("language_id"), // Patient's communication language (REQUIRED for patients)
  birthDate: timestamp("birth_date"),
  gender: varchar("gender"),
  profession: varchar("profession"),
  bio: text("bio"),
  avatarUrl: varchar("avatar_url"),
  timezone: varchar("timezone").default("Europe/Istanbul"),
  status: varchar("status").default("active"),
  // Notification preferences
  notifyAppointmentReminders: boolean("notify_appointment_reminders").default(true),
  notifyMessages: boolean("notify_messages").default(true),
  notifyNewAppointments: boolean("notify_new_appointments").default(true), // For psychologists
  // Two-Factor Authentication
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: varchar("two_factor_secret"), // Encrypted TOTP secret
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

// Verification status enum
export const verificationStatuses = ["pending", "approved", "rejected"] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

// ========== PSYCHOLOGIST PROFILES ==========

export const psychologistProfiles = pgTable("psychologist_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  fullName: varchar("full_name").notNull(),
  title: varchar("title"),
  licenseNumber: varchar("license_number"),
  bio: text("bio"),
  specialties: text("specialties").array(),
  therapyApproaches: text("therapy_approaches").array(),
  languages: text("languages").array(),
  pricePerSession: decimal("price_per_session", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"), // ISO 4217 currency code
  sessionDuration: integer("session_duration").default(50),
  timezone: varchar("timezone").default("Asia/Bangkok"),

  // Country code for tax calculation (ISO 3166-1 alpha-2)
  countryCode: varchar("country_code", { length: 2 }).default("US"),

  // Payout information for Thailand
  promptpayId: varchar("promptpay_id"), // PromptPay ID (phone number or citizen ID)
  bankAccountNumber: varchar("bank_account_number"), // Bank account (fallback)
  bankName: varchar("bank_name"), // Bank name

  // Stripe Connect fields for international payouts
  stripeAccountId: varchar("stripe_account_id"),
  stripeOnboardingStatus: varchar("stripe_onboarding_status").default("NOT_CONNECTED"),
  chargesEnabled: boolean("charges_enabled").default(false),
  payoutsEnabled: boolean("payouts_enabled").default(false),
  requirementsDue: jsonb("requirements_due"),
  lastStripeSyncAt: timestamp("last_stripe_sync_at"),

  verified: boolean("verified").default(false),
  verificationStatus: varchar("verification_status").default("pending"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by"),
  verificationNotes: text("verification_notes"),
  rejectionReason: text("rejection_reason"),
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

// ========== PSYCHOLOGIST LANGUAGES (Pivot Table) ==========

export const psychologistLanguages = pgTable("psychologist_languages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  psychologistId: varchar("psychologist_id").notNull(), // References psychologist_profiles.id
  languageId: varchar("language_id").notNull(), // References languages.id
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_psychologist_languages_psychologist").on(table.psychologistId),
  index("idx_psychologist_languages_language").on(table.languageId),
  // Composite unique constraint: a psychologist can't have the same language twice
  index("idx_psychologist_languages_unique").on(table.psychologistId, table.languageId),
]);

export const insertPsychologistLanguageSchema = createInsertSchema(psychologistLanguages).omit({
  id: true,
  createdAt: true,
});

export type InsertPsychologistLanguage = z.infer<typeof insertPsychologistLanguageSchema>;
export type PsychologistLanguage = typeof psychologistLanguages.$inferSelect;

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
  sessionLanguageId: varchar("session_language_id"), // IMMUTABLE snapshot of patient's language at booking time
  meetingRoom: varchar("meeting_room"),
  joinCode: varchar("join_code"),
  joinCodeExpiresAt: timestamp("join_code_expires_at"),
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  cancelledBy: varchar("cancelled_by"),
  noShowReportedBy: varchar("no_show_reported_by"),
  noShowAt: timestamp("no_show_at"),
  reminderSent1h: boolean("reminder_sent_1h").default(false), // Track if 1-hour reminder was sent
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

  // Provider info (e.g., 'opn', 'stripe', 'bank_transfer')
  provider: varchar("provider").default("stripe"),

  // External payment provider reference (charge ID, payment intent ID, etc.)
  providerPaymentId: varchar("provider_payment_id"),
  externalRef: varchar("external_ref"),

  // Stripe-specific fields
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),

  // Payment status
  status: varchar("status").notNull().default("created"),

  // Amount info
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),

  // PromptPay QR specific fields (legacy)
  qrPayload: text("qr_payload"), // QR code data
  qrImageUrl: varchar("qr_image_url"), // QR code image URL
  expiresAt: timestamp("expires_at"), // QR expiration time

  // Legacy fields (kept for backward compatibility with old TRY payments)
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("0"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }),
  netOfVat: decimal("net_of_vat", { precision: 10, scale: 2 }),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }),
  platformFeeRate: decimal("platform_fee_rate", { precision: 5, scale: 2 }).default("30"),
  platformVatAmount: decimal("platform_vat_amount", { precision: 10, scale: 2 }),
  processorFee: decimal("processor_fee", { precision: 10, scale: 2 }),
  providerPayout: decimal("provider_payout", { precision: 10, scale: 2 }),

  // Metadata for additional provider-specific data
  metadata: jsonb("metadata"),

  // Timestamps
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  refundReason: text("refund_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_payments_appointment").on(table.appointmentId),
  index("idx_payments_provider_payment_id").on(table.providerPaymentId),
  index("idx_payments_stripe_checkout").on(table.stripeCheckoutSessionId),
  index("idx_payments_status").on(table.status),
]);

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// ========== REFUNDS ==========

export const refundTypes = ["patient_cancel", "provider_no_show", "admin_decision", "technical_issue"] as const;
export type RefundType = (typeof refundTypes)[number];

export const refundStatuses = ["pending", "approved", "rejected", "processed"] as const;
export type RefundStatus = (typeof refundStatuses)[number];

export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").notNull(),
  paymentId: varchar("payment_id").notNull(),
  type: varchar("type").notNull(),
  status: varchar("status").notNull().default("pending"),
  requestedBy: varchar("requested_by").notNull(),
  processedBy: varchar("processed_by"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  refundPercentage: decimal("refund_percentage", { precision: 5, scale: 2 }).default("100"),
  reason: text("reason"),
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_refunds_appointment").on(table.appointmentId),
  index("idx_refunds_payment").on(table.paymentId),
]);

export const insertRefundSchema = createInsertSchema(refunds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Refund = typeof refunds.$inferSelect;

// ========== LEDGERS (Revenue Split Tracking) ==========

export const ledgerStatuses = ["pending", "final"] as const;
export type LedgerStatus = (typeof ledgerStatuses)[number];

export const ledgers = pgTable("ledgers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").notNull().unique(), // One ledger per appointment
  paymentId: varchar("payment_id"),

  // Revenue split
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
  platformFeeAmount: decimal("platform_fee_amount", { precision: 10, scale: 2 }).notNull(),
  platformFeeRate: decimal("platform_fee_rate", { precision: 5, scale: 2 }).default("30"), // 30%
  therapistEarningAmount: decimal("therapist_earning_amount", { precision: 10, scale: 2 }).notNull(),
  therapistEarningRate: decimal("therapist_earning_rate", { precision: 5, scale: 2 }).default("70"), // 70%

  currency: varchar("currency").default("THB"),
  status: varchar("status").notNull().default("pending"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_ledgers_appointment").on(table.appointmentId),
  index("idx_ledgers_payment").on(table.paymentId),
]);

export const insertLedgerSchema = createInsertSchema(ledgers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLedger = z.infer<typeof insertLedgerSchema>;
export type Ledger = typeof ledgers.$inferSelect;

// ========== COUNTRY TAX RULES ==========

export const countryTaxRules = pgTable("country_tax_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryCode: varchar("country_code", { length: 2 }).notNull(), // ISO 3166-1 alpha-2
  countryName: varchar("country_name", { length: 100 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"), // ISO 4217 currency code
  withholdingRate: decimal("withholding_rate", { precision: 5, scale: 4 }).notNull().default("0"), // e.g., 0.15 = 15%
  platformTaxRate: decimal("platform_tax_rate", { precision: 5, scale: 4 }).default("0"), // Optional platform tax
  taxIncludedInPrice: boolean("tax_included_in_price").default(false), // Whether session price includes tax
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  effectiveTo: timestamp("effective_to"), // null = currently active
  notes: text("notes"), // Admin notes about tax rules
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_country_tax_rules_country").on(table.countryCode),
  index("idx_country_tax_rules_effective").on(table.effectiveFrom, table.effectiveTo),
]);

export const insertCountryTaxRuleSchema = createInsertSchema(countryTaxRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCountryTaxRule = z.infer<typeof insertCountryTaxRuleSchema>;
export type CountryTaxRule = typeof countryTaxRules.$inferSelect;

// ========== PAYOUT LEDGER (Detailed Revenue Split with Tax) ==========

export const payoutLedger = pgTable("payout_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").notNull(),
  paymentId: varchar("payment_id"),
  psychologistId: varchar("psychologist_id").notNull(),

  // Country-based calculation
  countryCode: varchar("country_code", { length: 2 }).notNull(),

  // Amounts in cents/smallest currency unit for precision
  amountGross: decimal("amount_gross", { precision: 10, scale: 2 }).notNull(), // Total payment
  platformFeeRate: decimal("platform_fee_rate", { precision: 5, scale: 4 }).default("0.30"), // 30%
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(), // Platform's 30%

  psychologistGross: decimal("psychologist_gross", { precision: 10, scale: 2 }).notNull(), // 70% before tax
  withholdingRate: decimal("withholding_rate", { precision: 5, scale: 4 }).notNull().default("0"),
  withholdingAmount: decimal("withholding_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  psychologistNet: decimal("psychologist_net", { precision: 10, scale: 2 }).notNull(), // After tax

  platformNet: decimal("platform_net", { precision: 10, scale: 2 }).notNull(), // Platform's net

  currency: varchar("currency", { length: 3 }).default("USD"),

  // Store complete breakdown for audit
  taxBreakdownJson: jsonb("tax_breakdown_json"), // Full calculation details

  // Payout status (for future Stripe Connect transfers)
  payoutStatus: varchar("payout_status").default("pending"), // pending, transferred, failed
  stripeTransferId: varchar("stripe_transfer_id"), // Stripe transfer ID when transfer is completed
  transferredAt: timestamp("transferred_at"), // When the transfer was made

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payout_ledger_appointment").on(table.appointmentId),
  index("idx_payout_ledger_payment").on(table.paymentId),
  index("idx_payout_ledger_psychologist").on(table.psychologistId),
  index("idx_payout_ledger_payout_status").on(table.payoutStatus),
]);

export const insertPayoutLedgerSchema = createInsertSchema(payoutLedger).omit({
  id: true,
  createdAt: true,
});

export type InsertPayoutLedger = z.infer<typeof insertPayoutLedgerSchema>;
export type PayoutLedger = typeof payoutLedger.$inferSelect;

// ========== PAYOUTS (Therapist Payments) ==========

export const payoutStatuses = ["queued", "processing", "paid", "failed"] as const;
export type PayoutStatus = (typeof payoutStatuses)[number];

export const payoutMethods = ["promptpay", "bank_transfer", "manual"] as const;
export type PayoutMethod = (typeof payoutMethods)[number];

export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  therapistId: varchar("therapist_id").notNull(),
  appointmentId: varchar("appointment_id").notNull(),
  ledgerId: varchar("ledger_id"),

  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("THB"),

  // Payout method and destination
  method: varchar("method").default("promptpay"), // promptpay, bank_transfer, manual
  destination: varchar("destination"), // PromptPay ID or bank account

  status: varchar("status").default("queued"),

  // Provider reference (if using automated payout API)
  providerReference: varchar("provider_reference"),

  // Error tracking
  errorMessage: text("error_message"),

  processedAt: timestamp("processed_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_payouts_therapist").on(table.therapistId),
  index("idx_payouts_appointment").on(table.appointmentId),
  index("idx_payouts_status").on(table.status),
]);

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payouts.$inferSelect;

// ========== EARNINGS ==========

export const earningStatuses = ["earned", "pending_payout", "paid"] as const;
export type EarningStatus = (typeof earningStatuses)[number];

export const earnings = pgTable("earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  psychologistId: varchar("psychologist_id").notNull(),
  appointmentId: varchar("appointment_id").notNull().unique(), // UNIQUE for idempotency
  paymentId: varchar("payment_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("TRY"),
  status: varchar("status").notNull().default("earned"),
  sessionDate: timestamp("session_date"),
  patientId: varchar("patient_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_earnings_psychologist").on(table.psychologistId),
  index("idx_earnings_status").on(table.status),
]);

export const insertEarningSchema = createInsertSchema(earnings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEarning = z.infer<typeof insertEarningSchema>;
export type Earning = typeof earnings.$inferSelect;

// ========== BANK TRANSFERS ==========

export const bankTransferStatuses = ["pending_review", "approved", "rejected", "cancelled"] as const;
export type BankTransferStatus = (typeof bankTransferStatuses)[number];

export const bankTransfers = pgTable("bank_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").notNull().unique(),
  patientId: varchar("patient_id").notNull(),
  psychologistId: varchar("psychologist_id").notNull(),
  referenceCode: varchar("reference_code").notNull(),
  bankName: varchar("bank_name").notNull(),
  accountHolder: varchar("account_holder").notNull(),
  iban: varchar("iban").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("TRY"),
  status: varchar("status").notNull().default("pending_review"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bank_transfers_appointment").on(table.appointmentId),
  index("idx_bank_transfers_patient").on(table.patientId),
  index("idx_bank_transfers_status").on(table.status),
]);

export const insertBankTransferSchema = createInsertSchema(bankTransfers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBankTransfer = z.infer<typeof insertBankTransferSchema>;
export type BankTransfer = typeof bankTransfers.$inferSelect;

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
  content: text("content"),
  isPrivate: boolean("is_private").default(true),
  notes: text("notes"), // Legacy field - kept for backward compatibility
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

// ========== NOTIFICATIONS ==========

export const notificationTypes = [
  "booking_received", // Psikolog: Yeni randevu talebi
  "booking_confirmed", // Danışan: Randevu onaylandı
  "booking_cancelled", // Her ikisi: Randevu iptal edildi
  "session_starting_soon", // Her ikisi: Seans 15 dk içinde başlıyor
  "appointment_reminder", // Her ikisi: Seans hatırlatması
  "message_received", // Her ikisi: Yeni mesaj geldi
  "payment_received", // Psikolog: Ödeme alındı
  "verification_approved", // Psikolog: Hesap onaylandı
  "verification_rejected", // Psikolog: Hesap reddedildi
] as const;
export type NotificationType = (typeof notificationTypes)[number];

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Bildirim alacak kullanıcı
  type: varchar("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  actionUrl: varchar("action_url"), // Tıklanınca gidilecek sayfa
  relatedAppointmentId: varchar("related_appointment_id"),
  relatedConversationId: varchar("related_conversation_id"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  metadata: jsonb("metadata"), // Ekstra bilgi (psikolog adı, tarih vb.)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notifications_user").on(table.userId),
  index("idx_notifications_user_read").on(table.userId, table.isRead),
  index("idx_notifications_created").on(table.createdAt),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ========== EMAIL LOGS ==========

export const emailTypes = [
  "welcome",
  "reminder_24h",
  "reminder_1h",
  "after_session",
  "verification_approved",
  "verification_rejected",
  "appointment_confirmed",
  "appointment_cancelled",
] as const;
export type EmailType = (typeof emailTypes)[number];

export const emailStatuses = ["pending", "sent", "failed"] as const;
export type EmailStatus = (typeof emailStatuses)[number];

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  appointmentId: varchar("appointment_id"),
  type: varchar("type").notNull(),
  status: varchar("status").notNull().default("pending"),
  recipientEmail: varchar("recipient_email").notNull(),
  recipientRole: varchar("recipient_role", { length: 20 }), // 'patient' | 'psychologist' | 'admin'
  subject: varchar("subject").notNull(),
  templatePath: varchar("template_path"), // e.g., "en/patient/welcome.html"
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_email_logs_user").on(table.userId),
  index("idx_email_logs_appointment").on(table.appointmentId),
  index("idx_email_logs_type").on(table.type),
  index("idx_email_logs_status").on(table.status),
  index("idx_email_logs_role").on(table.recipientRole), // NEW: Index for role-based queries
]);

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

// ========== WEBHOOK EVENTS (Payment Provider Webhooks) ==========

export const webhookEventStatuses = ["received", "processing", "processed", "failed"] as const;
export type WebhookEventStatus = (typeof webhookEventStatuses)[number];

export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Provider info
  provider: varchar("provider").notNull(), // 'opn', 'stripe', etc.
  eventType: varchar("event_type").notNull(), // 'charge.complete', 'payment.succeeded', etc.
  eventId: varchar("event_id"), // Provider's event ID (for idempotency)

  // Related entities
  paymentId: varchar("payment_id"), // Our payment ID (if matched)
  appointmentId: varchar("appointment_id"), // Our appointment ID (if matched)

  // Webhook data
  payload: jsonb("payload").notNull(), // Full webhook payload
  signature: varchar("signature"), // Webhook signature for verification

  // Processing status
  status: varchar("status").notNull().default("received"),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),

  // Request metadata
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_webhook_events_event_id").on(table.eventId),
  index("idx_webhook_events_payment").on(table.paymentId),
  index("idx_webhook_events_status").on(table.status),
  index("idx_webhook_events_provider").on(table.provider, table.eventType),
]);

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;

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
  language: one(languages, {
    fields: [userProfiles.languageId],
    references: [languages.id],
  }),
}));

export const languagesRelations = relations(languages, ({ many }) => ({
  users: many(userProfiles),
  psychologistLanguages: many(psychologistLanguages),
}));

export const psychologistProfilesRelations = relations(psychologistProfiles, ({ many }) => ({
  availabilityRules: many(availabilityRules),
  availabilityExceptions: many(availabilityExceptions),
  appointments: many(appointments),
  conversations: many(conversations),
  psychologistLanguages: many(psychologistLanguages),
}));

export const psychologistLanguagesRelations = relations(psychologistLanguages, ({ one }) => ({
  psychologist: one(psychologistProfiles, {
    fields: [psychologistLanguages.psychologistId],
    references: [psychologistProfiles.id],
  }),
  language: one(languages, {
    fields: [psychologistLanguages.languageId],
    references: [languages.id],
  }),
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
