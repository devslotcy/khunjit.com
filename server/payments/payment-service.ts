/**
 * Payment Service - Simple 1 Baht QR System
 *
 * Generates 1 THB QR codes for testing and manual confirmation
 */

import { db } from '../db';
import {
  payments,
  appointments,
  type Payment,
} from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { generateThaiQR } from './thai-qr-generator';

// Configuration - Always use 1 Baht for testing
const FIXED_AMOUNT = 1.00;
const DEFAULT_QR_EXPIRY_MINUTES = 15;
const DEFAULT_CURRENCY = 'THB';

// Types
export interface CreatePaymentParams {
  appointmentId: string;
  patientId: string;
  psychologistId: string;
  amount: number; // Will be ignored, always 1 Baht
  currency?: string;
  description?: string;
  expiryMinutes?: number;
}

export interface PaymentResult {
  success: boolean;
  payment?: Payment;
  qrImageUrl?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Create a new payment with 1 Baht QR code
 */
export async function createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
  const {
    appointmentId,
    patientId,
    psychologistId,
    currency = DEFAULT_CURRENCY,
    description,
    expiryMinutes = DEFAULT_QR_EXPIRY_MINUTES,
  } = params;

  try {
    console.log(`[PaymentService] Creating 1 Baht QR payment for appointment: ${appointmentId}`);

    // Verify appointment exists and is in correct state
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    console.log(`[PaymentService] Appointment found:`, appointment?.id, 'status:', appointment?.status);

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    // Allow payment for reserved and payment_pending appointments
    const validStatuses = ['reserved', 'payment_pending'];
    if (!validStatuses.includes(appointment.status)) {
      return { success: false, error: `Invalid appointment status: ${appointment.status}. Payment can only be created for reserved appointments.` };
    }

    // Check for existing pending payment
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.appointmentId, appointmentId),
          eq(payments.status, 'pending')
        )
      )
      .limit(1);

    if (existingPayment && existingPayment.expiresAt && new Date(existingPayment.expiresAt) > new Date()) {
      // Return existing valid payment
      return {
        success: true,
        payment: existingPayment,
        qrImageUrl: existingPayment.qrImageUrl || undefined,
        expiresAt: existingPayment.expiresAt ? new Date(existingPayment.expiresAt) : undefined,
      };
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Configuration from environment or defaults
    const receiverType = (process.env.PROMPTPAY_RECEIVER_TYPE as 'BANK_ACCOUNT' | 'PHONE') || 'PHONE';
    const receiverValue = receiverType === 'BANK_ACCOUNT'
      ? (process.env.KBANK_ACCOUNT || '0073902908')
      : (process.env.PROMPTPAY_PHONE || '0908925858');

    console.log(`[PaymentService] Generating 1 Baht QR: Type=${receiverType}, Value=${receiverValue}`);

    // Generate Thai QR code (always 1 Baht)
    const qrResult = await generateThaiQR({
      receiver: {
        type: receiverType,
        value: receiverValue,
      },
      amount: FIXED_AMOUNT, // Always 1 Baht
      description: description || `Test payment - Appointment ${appointmentId}`,
    });

    if (!qrResult.success) {
      return { success: false, error: qrResult.error };
    }

    // Create payment record
    console.log(`[PaymentService] Inserting payment with amount: ${FIXED_AMOUNT.toFixed(2)} THB`);

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const [payment] = await db
      .insert(payments)
      .values({
        id: paymentId,
        appointmentId,
        patientId,
        psychologistId,
        provider: 'thai-qr',
        providerPaymentId: paymentId,
        status: 'pending',
        amount: FIXED_AMOUNT.toFixed(2),
        grossAmount: FIXED_AMOUNT.toFixed(2),
        currency,
        qrImageUrl: qrResult.qrImageDataUrl,
        qrPayload: qrResult.qrPayload,
        expiresAt: expiresAt,
        metadata: {
          description,
          expiryMinutes,
          actualAmount: params.amount, // Store the original amount for reference
          note: '1 Baht test QR - Manual confirmation required',
        },
      })
      .returning();

    console.log(`[PaymentService] Payment created successfully: ${payment.id}`);

    // Update appointment status to payment_pending
    await db
      .update(appointments)
      .set({
        status: 'payment_pending',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    console.log(`[PaymentService] Created 1 Baht QR payment ${payment.id} for appointment ${appointmentId}`);

    return {
      success: true,
      payment,
      qrImageUrl: qrResult.qrImageDataUrl,
      expiresAt: expiresAt,
    };
  } catch (error) {
    console.error('[PaymentService] Error creating payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating payment',
    };
  }
}

/**
 * Get payment by ID
 */
export async function getPayment(paymentId: string): Promise<Payment | null> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  return payment || null;
}

/**
 * Get payment by appointment ID
 */
export async function getPaymentByAppointment(appointmentId: string): Promise<Payment | null> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.appointmentId, appointmentId))
    .limit(1);

  return payment || null;
}

/**
 * Get payment status (for client polling)
 */
export async function getPaymentStatus(paymentId: string): Promise<{
  status: string;
  paidAt?: Date;
  appointmentStatus?: string;
} | null> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment) return null;

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, payment.appointmentId))
    .limit(1);

  return {
    status: payment.status,
    paidAt: payment.paidAt ? new Date(payment.paidAt) : undefined,
    appointmentStatus: appointment?.status,
  };
}

// ==================== STRIPE PAYMENT FUNCTIONS ====================
// Re-export Stripe functions from stripe-checkout.ts for use in routes

import * as stripeCheckout from './stripe-checkout';
import type Stripe from 'stripe';

/**
 * Get Stripe payment status
 */
export async function getStripePaymentStatus(paymentId: string) {
  return stripeCheckout.getPaymentStatus(paymentId);
}

/**
 * Handle Stripe Payment Intent succeeded
 * Called from webhook or from frontend confirm endpoint
 */
export async function handleStripePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  return stripeCheckout.handlePaymentIntentSucceeded(paymentIntent);
}
