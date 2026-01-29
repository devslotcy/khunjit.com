/**
 * Stripe Checkout Service
 *
 * Handles Stripe Checkout Session creation and payment processing
 * with country-based tax calculation for psychologist payouts.
 */

import Stripe from 'stripe';
import { db } from '../db';
import { payments, appointments, psychologistProfiles, countryTaxRules, payoutLedger, users, userProfiles, languages } from '@shared/schema';
import { eq, and, isNull, lte, gte, or } from 'drizzle-orm';
import * as stripeConnect from '../stripe-connect';

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-12-15.clover' as any, // Use latest stable API version
  });
  const isLiveMode = stripeSecretKey.startsWith('sk_live_');
  console.log(`[Stripe Checkout] Initialized in ${isLiveMode ? 'LIVE' : 'TEST'} mode`);
} else {
  console.warn('[Stripe Checkout] No STRIPE_SECRET_KEY found - Stripe Checkout disabled');
}

// Platform configuration
const PLATFORM_FEE_RATE = 0.20; // 20% platform fee
const DEFAULT_CURRENCY = 'usd';

// Types
export interface TaxBreakdown {
  sessionPrice: number;
  currency: string;
  platformFeeRate: number;
  platformFee: number;
  psychologistGross: number;
  countryCode: string;
  withholdingRate: number;
  withholdingAmount: number;
  psychologistNet: number;
  platformNet: number;
  calculatedAt: string;
}

export interface CheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  paymentId?: string;
  breakdown?: TaxBreakdown;
  error?: string;
}

/**
 * Get active tax rule for a country
 */
export async function getCountryTaxRule(countryCode: string): Promise<{ withholdingRate: number; platformTaxRate: number } | null> {
  const now = new Date();

  const [rule] = await db
    .select()
    .from(countryTaxRules)
    .where(
      and(
        eq(countryTaxRules.countryCode, countryCode),
        lte(countryTaxRules.effectiveFrom, now),
        or(
          isNull(countryTaxRules.effectiveTo),
          gte(countryTaxRules.effectiveTo, now)
        )
      )
    )
    .limit(1);

  if (!rule) {
    // Default: no withholding
    return { withholdingRate: 0, platformTaxRate: 0 };
  }

  return {
    withholdingRate: parseFloat(rule.withholdingRate || '0'),
    platformTaxRate: parseFloat(rule.platformTaxRate || '0'),
  };
}

/**
 * Calculate payment breakdown with country-based tax
 */
export function calculatePaymentBreakdown(
  sessionPrice: number,
  countryCode: string,
  withholdingRate: number,
  currency: string = DEFAULT_CURRENCY
): TaxBreakdown {
  const platformFee = sessionPrice * PLATFORM_FEE_RATE;
  const psychologistGross = sessionPrice - platformFee; // 80%
  const withholdingAmount = psychologistGross * withholdingRate;
  const psychologistNet = psychologistGross - withholdingAmount;
  const platformNet = platformFee; // Platform keeps its 20% (no withholding on platform)

  return {
    sessionPrice,
    currency,
    platformFeeRate: PLATFORM_FEE_RATE,
    platformFee: Math.round(platformFee * 100) / 100,
    psychologistGross: Math.round(psychologistGross * 100) / 100,
    countryCode,
    withholdingRate,
    withholdingAmount: Math.round(withholdingAmount * 100) / 100,
    psychologistNet: Math.round(psychologistNet * 100) / 100,
    platformNet: Math.round(platformNet * 100) / 100,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Create Stripe Checkout Session for an appointment
 */
export async function createCheckoutSession(
  appointmentId: string,
  successUrl: string,
  cancelUrl: string
): Promise<CheckoutResult> {
  if (!stripe) {
    return { success: false, error: 'Stripe not configured' };
  }

  try {
    // 1. Get appointment with psychologist details
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    // Check appointment status
    if (!['reserved', 'payment_pending'].includes(appointment.status)) {
      return { success: false, error: `Invalid appointment status: ${appointment.status}` };
    }

    // 2. Check for existing payment
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.appointmentId, appointmentId),
          eq(payments.status, 'paid')
        )
      )
      .limit(1);

    if (existingPayment) {
      return { success: false, error: 'Appointment already paid' };
    }

    // 3. Get psychologist profile
    const [psychologist] = await db
      .select()
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.id, appointment.psychologistId))
      .limit(1);

    if (!psychologist) {
      return { success: false, error: 'Psychologist not found' };
    }

    // 4. Get tax rule for psychologist's country
    const countryCode = psychologist.countryCode || 'US';
    const taxRule = await getCountryTaxRule(countryCode);
    const withholdingRate = taxRule?.withholdingRate || 0;

    // 5. Calculate breakdown
    const sessionPrice = parseFloat(psychologist.pricePerSession || '50');
    const breakdown = calculatePaymentBreakdown(sessionPrice, countryCode, withholdingRate);

    // 6. Get patient info for Stripe metadata
    const [patientUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, appointment.patientId))
      .limit(1);

    // 7. Create payment record in DB (pending status)
    const [payment] = await db
      .insert(payments)
      .values({
        appointmentId,
        patientId: appointment.patientId,
        psychologistId: appointment.psychologistId,
        provider: 'stripe',
        status: 'pending',
        amount: sessionPrice.toString(),
        currency: DEFAULT_CURRENCY.toUpperCase(),
        platformFee: breakdown.platformFee.toString(),
        platformFeeRate: (PLATFORM_FEE_RATE * 100).toString(),
        providerPayout: breakdown.psychologistNet.toString(),
        metadata: {
          breakdown,
          psychologistCountry: countryCode,
          withholdingRate,
        },
      })
      .returning();

    // 8. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: DEFAULT_CURRENCY,
            product_data: {
              name: `Therapy Session with ${psychologist.fullName}`,
              description: `${psychologist.sessionDuration || 50} minute session`,
            },
            unit_amount: Math.round(sessionPrice * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        appointmentId,
        paymentId: payment.id,
        psychologistId: appointment.psychologistId,
        patientId: appointment.patientId,
        countryCode,
        withholdingRate: withholdingRate.toString(),
      },
      customer_email: patientUser?.email || undefined,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    // 9. Update payment with Stripe session ID
    await db
      .update(payments)
      .set({
        stripeCheckoutSessionId: session.id,
        expiresAt: new Date(session.expires_at! * 1000),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // 10. Update appointment status
    await db
      .update(appointments)
      .set({
        status: 'payment_pending',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    console.log(`[Stripe Checkout] Session created: ${session.id} for appointment ${appointmentId}`);

    return {
      success: true,
      checkoutUrl: session.url!,
      sessionId: session.id,
      paymentId: payment.id,
      breakdown,
    };
  } catch (error) {
    console.error('[Stripe Checkout] Error creating session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    };
  }
}

/**
 * Handle successful checkout (called from webhook)
 */
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<{ success: boolean; error?: string }> {
  const appointmentId = session.metadata?.appointmentId;
  const paymentId = session.metadata?.paymentId;

  if (!appointmentId || !paymentId) {
    console.error('[Stripe Checkout] Missing metadata in session:', session.id);
    return { success: false, error: 'Missing metadata' };
  }

  try {
    // 1. Get payment
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    // Idempotency: already processed
    if (payment.status === 'paid') {
      console.log(`[Stripe Checkout] Payment ${paymentId} already processed`);
      return { success: true };
    }

    // 2. Update payment status
    await db
      .update(payments)
      .set({
        status: 'paid',
        stripePaymentIntentId: session.payment_intent as string || null,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    // 3. Update appointment status
    await db
      .update(appointments)
      .set({
        status: 'confirmed',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    // 4. Create payout ledger entry and trigger automatic payout
    const metadata = payment.metadata as { breakdown?: TaxBreakdown } | null;
    const breakdown = metadata?.breakdown;

    if (breakdown && payment.psychologistId) {
      // Import payout service
      const { payoutToPsychologist } = await import('./payout-service.js');

      // Trigger automatic payout to psychologist's Stripe Connect account
      const payoutResult = await payoutToPsychologist({
        appointmentId,
        paymentId,
        psychologistId: payment.psychologistId,
        amount: breakdown.sessionPrice,
        currency: breakdown.currency,
        countryCode: breakdown.countryCode,
      });

      if (payoutResult.success) {
        console.log(`[Stripe Checkout] ✅ Automatic payout successful: ${payoutResult.transferId}`);
      } else {
        console.warn(`[Stripe Checkout] ⚠️  Automatic payout failed: ${payoutResult.error}`);
        console.warn(`[Stripe Checkout] Payout can be retried manually from admin panel`);
      }
    }

    console.log(`[Stripe Checkout] Payment ${paymentId} completed, appointment ${appointmentId} confirmed`);

    return { success: true };
  } catch (error) {
    console.error('[Stripe Checkout] Error handling completed checkout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process checkout',
    };
  }
}

/**
 * Handle refund (called from webhook)
 */
export async function handleChargeRefunded(charge: Stripe.Charge): Promise<{ success: boolean; error?: string }> {
  const paymentIntentId = charge.payment_intent as string;

  if (!paymentIntentId) {
    return { success: false, error: 'No payment intent ID' };
  }

  try {
    // Find payment by payment intent
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, paymentIntentId))
      .limit(1);

    if (!payment) {
      console.warn(`[Stripe Checkout] No payment found for refund: ${paymentIntentId}`);
      return { success: true }; // Not an error, might be unrelated charge
    }

    // Update payment status
    await db
      .update(payments)
      .set({
        status: 'refunded',
        refundedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // Update appointment status
    await db
      .update(appointments)
      .set({
        status: 'refunded',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, payment.appointmentId));

    // Update payout ledger
    await db
      .update(payoutLedger)
      .set({ payoutStatus: 'cancelled' })
      .where(eq(payoutLedger.paymentId, payment.id));

    console.log(`[Stripe Checkout] Refund processed for payment ${payment.id}`);

    return { success: true };
  } catch (error) {
    console.error('[Stripe Checkout] Error handling refund:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process refund',
    };
  }
}

/**
 * Get checkout session status
 */
export async function getCheckoutSessionStatus(sessionId: string): Promise<{
  success: boolean;
  status?: string;
  paymentStatus?: string;
  error?: string;
}> {
  if (!stripe) {
    return { success: false, error: 'Stripe not configured' };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return {
      success: true,
      status: session.status || 'unknown',
      paymentStatus: session.payment_status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get session status',
    };
  }
}

// ==================== PAYMENT INTENTS API ====================
// These functions support the Stripe Payment Element flow
// (card fields embedded directly in our UI)

export interface PaymentIntentResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  paymentId?: string;
  breakdown?: TaxBreakdown;
  error?: string;
}

/**
 * Create a Stripe Payment Intent for an appointment
 * This is used with Stripe Payment Element (embedded card fields)
 */
export async function createPaymentIntent(
  appointmentId: string
): Promise<PaymentIntentResult> {
  if (!stripe) {
    return { success: false, error: 'Stripe not configured' };
  }

  try {
    // 1. Get appointment with psychologist details
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    // Check appointment status
    if (!['reserved', 'payment_pending'].includes(appointment.status)) {
      return { success: false, error: `Invalid appointment status: ${appointment.status}` };
    }

    // 2. Check for existing payment
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.appointmentId, appointmentId),
          eq(payments.status, 'paid')
        )
      )
      .limit(1);

    if (existingPayment) {
      return { success: false, error: 'Appointment already paid' };
    }

    // 3. Check for existing pending payment with valid payment intent
    const [pendingPayment] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.appointmentId, appointmentId),
          eq(payments.status, 'pending')
        )
      )
      .limit(1);

    // If there's a pending payment with a payment intent, retrieve it
    if (pendingPayment?.stripePaymentIntentId) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(pendingPayment.stripePaymentIntentId);
        if (existingIntent.status !== 'canceled' && existingIntent.status !== 'succeeded') {
          // Return existing payment intent
          const metadata = pendingPayment.metadata as { breakdown?: TaxBreakdown } | null;
          return {
            success: true,
            clientSecret: existingIntent.client_secret!,
            paymentIntentId: existingIntent.id,
            paymentId: pendingPayment.id,
            breakdown: metadata?.breakdown,
          };
        }
      } catch (err) {
        // Payment intent doesn't exist or is invalid, create new one
        console.log('[Stripe PaymentIntent] Existing intent invalid, creating new one');
      }
    }

    // 4. Get psychologist profile
    const [psychologist] = await db
      .select()
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.id, appointment.psychologistId))
      .limit(1);

    if (!psychologist) {
      return { success: false, error: 'Psychologist not found' };
    }

    // 5. Get tax rule for psychologist's country
    const countryCode = psychologist.countryCode || 'US';
    const taxRule = await getCountryTaxRule(countryCode);
    const withholdingRate = taxRule?.withholdingRate || 0;

    // 6. Calculate breakdown
    const sessionPrice = parseFloat(psychologist.pricePerSession || '50');
    const breakdown = calculatePaymentBreakdown(sessionPrice, countryCode, withholdingRate);

    // 7. Get patient info for Stripe metadata
    const [patientUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, appointment.patientId))
      .limit(1);

    // 8. Create or update payment record in DB (pending status)
    let payment;
    if (pendingPayment) {
      // Update existing pending payment
      [payment] = await db
        .update(payments)
        .set({
          amount: sessionPrice.toString(),
          platformFee: breakdown.platformFee.toString(),
          platformFeeRate: (PLATFORM_FEE_RATE * 100).toString(),
          providerPayout: breakdown.psychologistNet.toString(),
          metadata: {
            breakdown,
            psychologistCountry: countryCode,
            withholdingRate,
          },
          updatedAt: new Date(),
        })
        .where(eq(payments.id, pendingPayment.id))
        .returning();
    } else {
      // Create new payment record
      [payment] = await db
        .insert(payments)
        .values({
          appointmentId,
          patientId: appointment.patientId,
          psychologistId: appointment.psychologistId,
          provider: 'stripe',
          status: 'pending',
          amount: sessionPrice.toString(),
          currency: DEFAULT_CURRENCY.toUpperCase(),
          platformFee: breakdown.platformFee.toString(),
          platformFeeRate: (PLATFORM_FEE_RATE * 100).toString(),
          providerPayout: breakdown.psychologistNet.toString(),
          metadata: {
            breakdown,
            psychologistCountry: countryCode,
            withholdingRate,
          },
        })
        .returning();
    }

    // 9. Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(sessionPrice * 100), // Stripe uses cents
      currency: DEFAULT_CURRENCY,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        appointmentId,
        paymentId: payment.id,
        psychologistId: appointment.psychologistId,
        patientId: appointment.patientId,
        countryCode,
        withholdingRate: withholdingRate.toString(),
      },
      receipt_email: patientUser?.email || undefined,
      description: `Therapy Session with ${psychologist.fullName}`,
    });

    // 10. Update payment with Payment Intent ID
    await db
      .update(payments)
      .set({
        stripePaymentIntentId: paymentIntent.id,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // 11. Update appointment status
    await db
      .update(appointments)
      .set({
        status: 'payment_pending',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    console.log(`[Stripe PaymentIntent] Created: ${paymentIntent.id} for appointment ${appointmentId}`);

    return {
      success: true,
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      paymentId: payment.id,
      breakdown,
    };
  } catch (error) {
    console.error('[Stripe PaymentIntent] Error creating:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    };
  }
}

/**
 * Handle successful Payment Intent (called from webhook)
 */
export async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<{ success: boolean; error?: string }> {
  const appointmentId = paymentIntent.metadata?.appointmentId;
  const paymentId = paymentIntent.metadata?.paymentId;

  if (!appointmentId || !paymentId) {
    console.error('[Stripe PaymentIntent] Missing metadata in payment intent:', paymentIntent.id);
    return { success: false, error: 'Missing metadata' };
  }

  try {
    // 1. Get payment
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    // Idempotency: already processed
    if (payment.status === 'paid') {
      console.log(`[Stripe PaymentIntent] Payment ${paymentId} already processed`);
      return { success: true };
    }

    // 2. Update payment status
    await db
      .update(payments)
      .set({
        status: 'paid',
        stripePaymentIntentId: paymentIntent.id,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    // 3. Update appointment status
    await db
      .update(appointments)
      .set({
        status: 'confirmed',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    // 4. Create payout ledger entry and trigger automatic payout
    const paymentMetadata = payment.metadata as { breakdown?: TaxBreakdown } | null;
    const breakdown = paymentMetadata?.breakdown;

    if (breakdown && payment.psychologistId) {
      // Import payout service
      const { payoutToPsychologist } = await import('./payout-service.js');

      // Trigger automatic payout to psychologist's Stripe Connect account
      const payoutResult = await payoutToPsychologist({
        appointmentId,
        paymentId,
        psychologistId: payment.psychologistId,
        amount: breakdown.sessionPrice,
        currency: breakdown.currency,
        countryCode: breakdown.countryCode,
      });

      if (payoutResult.success) {
        console.log(`[Stripe PaymentIntent] ✅ Automatic payout successful: ${payoutResult.transferId}`);
      } else {
        console.warn(`[Stripe PaymentIntent] ⚠️  Automatic payout failed: ${payoutResult.error}`);
        console.warn(`[Stripe PaymentIntent] Payout can be retried manually from admin panel`);
      }
    }

    console.log(`[Stripe PaymentIntent] Payment ${paymentId} completed, appointment ${appointmentId} confirmed`);

    // 5. Send confirmation emails to patient and psychologist
    (async () => {
      try {
        const { sendAppointmentConfirmedToPatient, sendAppointmentConfirmedToPsychologist } = await import('../email/helpers.js');
        const { format } = await import('date-fns');

        // Get appointment details with patient and psychologist info
        const [fullAppointment] = await db
          .select()
          .from(appointments)
          .where(eq(appointments.id, appointmentId))
          .limit(1);

        if (!fullAppointment) return;

        // Get patient and psychologist
        const [patient] = await db.select().from(users).where(eq(users.id, fullAppointment.patientId)).limit(1);
        const [psychProfile] = await db.select().from(psychologistProfiles).where(eq(psychologistProfiles.id, fullAppointment.psychologistId)).limit(1);
        const [psychUser] = psychProfile ? await db.select().from(users).where(eq(users.id, psychProfile.userId)).limit(1) : [null];

        if (!patient || !psychProfile || !psychUser) return;

        // Get patient's language
        const [patientProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, patient.id)).limit(1);
        let patientLang = 'en';
        if (patientProfile?.languageId) {
          const [lang] = await db.select().from(languages).where(eq(languages.id, patientProfile.languageId)).limit(1);
          patientLang = lang?.code || 'en';
        }

        // Get psychologist's language
        const [psychUserProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, psychUser.id)).limit(1);
        let psychLang = 'en';
        if (psychUserProfile?.languageId) {
          const [lang] = await db.select().from(languages).where(eq(languages.id, psychUserProfile.languageId)).limit(1);
          psychLang = lang?.code || 'en';
        }

        // Format appointment date/time
        const appointmentDate = format(new Date(fullAppointment.startAt), 'PPP');
        const appointmentTime = format(new Date(fullAppointment.startAt), 'p');
        const joinLink = `${process.env.PLATFORM_URL || 'http://localhost:5173'}/appointments/${appointmentId}`;

        // Send email to patient
        await sendAppointmentConfirmedToPatient(
          patient.id,
          patient.email,
          appointmentId,
          {
            firstName: patient.firstName,
            psychologistName: psychProfile.fullName,
            appointmentDate,
            appointmentTime,
            joinLink,
          },
          patientLang as any
        );
        console.log(`[Email] Appointment confirmation sent to patient: ${patient.email} (${patientLang})`);

        // Send email to psychologist
        await sendAppointmentConfirmedToPsychologist(
          psychUser.id,
          psychUser.email,
          appointmentId,
          {
            firstName: psychUser.firstName,
            patientName: patient.firstName,
            appointmentDate,
            appointmentTime,
          },
          psychLang as any
        );
        console.log(`[Email] Appointment confirmation sent to psychologist: ${psychUser.email} (${psychLang})`);
      } catch (err) {
        console.error('[Email] Failed to send appointment confirmation emails:', err);
      }
    })();

    return { success: true };
  } catch (error) {
    console.error('[Stripe PaymentIntent] Error handling succeeded:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process payment',
    };
  }
}

/**
 * Handle failed Payment Intent (called from webhook)
 */
export async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<{ success: boolean; error?: string }> {
  const paymentId = paymentIntent.metadata?.paymentId;

  if (!paymentId) {
    console.log('[Stripe PaymentIntent] No paymentId in failed intent metadata');
    return { success: true };
  }

  try {
    // Update payment status to failed
    await db
      .update(payments)
      .set({
        status: 'failed',
        metadata: {
          ...(await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1).then(p => (p[0]?.metadata || {}) as Record<string, any>)),
          failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
          failedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    console.log(`[Stripe PaymentIntent] Payment ${paymentId} marked as failed`);

    return { success: true };
  } catch (error) {
    console.error('[Stripe PaymentIntent] Error handling failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update payment status',
    };
  }
}

/**
 * Get Payment Intent status
 */
export async function getPaymentIntentStatus(paymentIntentId: string): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
  if (!stripe) {
    return { success: false, error: 'Stripe not configured' };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      success: true,
      status: paymentIntent.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get payment intent status',
    };
  }
}

/**
 * Get payment status by payment ID
 */
export async function getPaymentStatus(paymentId: string): Promise<{
  success: boolean;
  status?: string;
  paymentIntentStatus?: string;
  appointmentId?: string;
  error?: string;
}> {
  try {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    let paymentIntentStatus: string | undefined;
    if (payment.stripePaymentIntentId && stripe) {
      try {
        const pi = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
        paymentIntentStatus = pi.status;
      } catch (err) {
        // Ignore errors fetching payment intent
      }
    }

    return {
      success: true,
      status: payment.status,
      paymentIntentStatus,
      appointmentId: payment.appointmentId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get payment status',
    };
  }
}

export { stripe };
