/**
 * Payout Service - Stripe Connect Transfers
 *
 * Automatically transfers money to psychologists after session completion.
 *
 * Flow:
 * 1. Patient pays → Money goes to platform Stripe account
 * 2. Session completes → This service calculates split
 * 3. Platform keeps 30% + tax → Rest transferred to psychologist's Stripe Connect account
 *
 * CRITICAL: Every cent must be accounted for!
 */

import Stripe from 'stripe';
import { db } from '../db';
import { psychologistProfiles, appointments } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import {
  createPayoutLedger,
  getPayoutLedgerByAppointment,
  markPayoutPaid,
  markPayoutFailed,
} from './payout-ledger';

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-12-15.clover' as any,
  });
  console.log('[Payout Service] Stripe initialized');
} else {
  console.warn('[Payout Service] Stripe not configured - payouts disabled');
}

/**
 * Process payout to psychologist via Stripe Connect
 *
 * This is the MAIN function that handles money transfer!
 *
 * @param appointmentId - The completed appointment
 * @param paymentId - The payment record
 * @param amount - Gross amount patient paid
 * @param currency - Currency code
 * @param countryCode - Country for tax rules
 */
export async function payoutToPsychologist(params: {
  appointmentId: string;
  paymentId: string;
  psychologistId: string;
  amount: number;
  currency: string;
  countryCode: string;
}): Promise<{ success: boolean; transferId?: string; error?: string }> {
  const { appointmentId, paymentId, psychologistId, amount, currency, countryCode } = params;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`[Payout Service] Processing payout for appointment ${appointmentId}`);
  console.log(`  Psychologist: ${psychologistId}`);
  console.log(`  Amount: ${amount} ${currency}`);
  console.log(`  Country: ${countryCode}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!stripe) {
    console.error('[Payout Service] ❌ Stripe not configured');
    return { success: false, error: 'Stripe not configured' };
  }

  try {
    // Step 1: Check if payout already exists
    const existingLedger = await getPayoutLedgerByAppointment(appointmentId);
    if (existingLedger) {
      if (existingLedger.payoutStatus === 'paid') {
        console.log(`[Payout Service] ⚠️  Already paid (${existingLedger.stripeTransferId})`);
        return {
          success: true,
          transferId: existingLedger.stripeTransferId || undefined,
        };
      }
      console.log(`[Payout Service] Found existing ledger: ${existingLedger.id} (${existingLedger.payoutStatus})`);
    }

    // Step 2: Get psychologist's Stripe account
    const [psychologist] = await db
      .select()
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.id, psychologistId))
      .limit(1);

    if (!psychologist) {
      throw new Error(`Psychologist not found: ${psychologistId}`);
    }

    if (!psychologist.stripeAccountId) {
      throw new Error(`Psychologist ${psychologistId} has not connected Stripe account`);
    }

    console.log(`[Payout Service] Psychologist Stripe account: ${psychologist.stripeAccountId}`);

    // Step 3: Create or get payout ledger (calculates split)
    let ledgerId: string;
    if (existingLedger) {
      ledgerId = existingLedger.id;
      console.log(`[Payout Service] Using existing ledger: ${ledgerId}`);
    } else {
      ledgerId = await createPayoutLedger({
        appointmentId,
        paymentId,
        psychologistId,
        grossAmount: amount,
        currency,
        countryCode,
      });
      console.log(`[Payout Service] Created ledger: ${ledgerId}`);
    }

    // Get ledger to read calculated amounts
    const { payoutLedger: payoutLedgerTable } = await import('../../shared/schema.js');
    const ledger = await db
      .select()
      .from(payoutLedgerTable)
      .where(eq(payoutLedgerTable.id, ledgerId))
      .limit(1);

    if (!ledger[0]) {
      throw new Error(`Ledger not found: ${ledgerId}`);
    }

    const psychologistNet = parseFloat(ledger[0].psychologistNet);
    const psychologistGross = parseFloat(ledger[0].psychologistGross);
    const withholdingAmount = parseFloat(ledger[0].withholdingAmount);
    const platformFee = parseFloat(ledger[0].platformFee);

    console.log(`[Payout Service] Calculated amounts:`);
    console.log(`  Gross: ${amount} ${currency}`);
    console.log(`  Platform Fee (30%): ${platformFee} ${currency}`);
    console.log(`  Psychologist Gross: ${psychologistGross} ${currency}`);
    console.log(`  Withholding Tax: ${withholdingAmount} ${currency}`);
    console.log(`  Psychologist Net: ${psychologistNet} ${currency} 💰`);

    // CRITICAL: Verify calculation one more time
    const platformNet = platformFee + withholdingAmount;
    const total = psychologistNet + platformNet;
    const diff = Math.abs(total - amount);

    if (diff > 0.02) {
      throw new Error(
        `CALCULATION ERROR: ${total} !== ${amount} (diff: ${diff})`
      );
    }

    console.log(`[Payout Service] ✅ Calculation verified (diff: ${diff})`);

    // Step 4: Convert to Stripe's smallest currency unit (cents, satang, etc.)
    // Most currencies use 2 decimals, but some use 0 (JPY, KRW, VND, IDR)
    const decimals = ['JPY', 'KRW', 'VND', 'IDR'].includes(currency.toUpperCase()) ? 0 : 2;
    const multiplier = Math.pow(10, decimals);
    const amountInSmallestUnit = Math.round(psychologistNet * multiplier);

    console.log(`[Payout Service] Stripe transfer amount: ${amountInSmallestUnit} (smallest unit)`);

    // Step 5: Create Stripe Transfer
    console.log(`[Payout Service] Creating Stripe transfer...`);

    const transfer = await stripe.transfers.create({
      amount: amountInSmallestUnit,
      currency: currency.toLowerCase(),
      destination: psychologist.stripeAccountId,
      transfer_group: `appointment_${appointmentId}`,
      description: `Session payout for appointment ${appointmentId}`,
      metadata: {
        appointmentId,
        paymentId,
        psychologistId,
        ledgerId,
        grossAmount: amount.toString(),
        platformFee: platformFee.toString(),
        withholdingTax: withholdingAmount.toString(),
        netAmount: psychologistNet.toString(),
        currency,
        countryCode,
      },
    });

    console.log(`[Payout Service] ✅ Transfer created: ${transfer.id}`);
    console.log(`  Amount: ${transfer.amount} ${transfer.currency}`);
    console.log(`  Destination: ${transfer.destination}`);

    // Step 6: Mark as paid in ledger
    await markPayoutPaid(ledgerId, transfer.id);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`[Payout Service] 🎉 Payout successful!`);
    console.log(`  Psychologist received: ${psychologistNet} ${currency}`);
    console.log(`  Platform kept: ${platformNet} ${currency}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      success: true,
      transferId: transfer.id,
    };
  } catch (error: any) {
    console.error('[Payout Service] ❌ Payout failed:', error);

    // Try to mark as failed in ledger
    try {
      const ledger = await getPayoutLedgerByAppointment(appointmentId);
      if (ledger) {
        await markPayoutFailed(ledger.id, error.message || String(error));
      }
    } catch (markError) {
      console.error('[Payout Service] Failed to mark as failed:', markError);
    }

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Retry failed payout
 */
export async function retryPayout(appointmentId: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[Payout Service] Retrying payout for appointment ${appointmentId}`);

  const ledger = await getPayoutLedgerByAppointment(appointmentId);
  if (!ledger) {
    return { success: false, error: 'Ledger not found' };
  }

  if (ledger.payoutStatus === 'paid') {
    return { success: false, error: 'Already paid' };
  }

  // Get appointment and payment details
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appointment) {
    return { success: false, error: 'Appointment not found' };
  }

  return payoutToPsychologist({
    appointmentId,
    paymentId: ledger.paymentId || '',
    psychologistId: ledger.psychologistId,
    amount: parseFloat(ledger.amountGross),
    currency: ledger.currency,
    countryCode: ledger.countryCode,
  });
}
