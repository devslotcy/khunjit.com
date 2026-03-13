/**
 * Payout Ledger Management
 *
 * Records and tracks all payment splits and psychologist payouts.
 * Provides complete audit trail for financial transactions.
 */

import { db } from '../db';
import { payoutLedger, appointments, psychologistProfiles } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { calculatePayoutSplit } from './payout-calculator';
import type { PaymentSplit } from './types';

/**
 * Create payout ledger entry after payment is completed
 *
 * This function:
 * 1. Calculates the exact split using tax rules
 * 2. Records everything in payout_ledger table
 * 3. Returns ledger ID for tracking
 *
 * @param appointmentId - The appointment that was paid for
 * @param paymentId - The payment record ID
 * @param psychologistId - Psychologist who provided service
 * @param grossAmount - Total amount patient paid
 * @param currency - Currency code (THB, USD, etc.)
 * @param countryCode - Country for tax calculation
 */
export async function createPayoutLedger(params: {
  appointmentId: string;
  paymentId: string;
  psychologistId: string;
  grossAmount: number;
  currency: string;
  countryCode: string;
}): Promise<string> {
  const { appointmentId, paymentId, psychologistId, grossAmount, currency, countryCode } = params;

  console.log(`[Payout Ledger] Creating entry for appointment ${appointmentId}`);
  console.log(`  Amount: ${grossAmount} ${currency}, Country: ${countryCode}`);

  // Calculate split with tax
  const split: PaymentSplit = await calculatePayoutSplit(grossAmount, countryCode, currency);

  console.log(`[Payout Ledger] Calculated split:`);
  console.log(`  Platform Fee: ${split.platformFee} ${currency} (${split.platformFeeRate * 100}%)`);
  console.log(`  Psychologist Gross: ${split.psychologistGross} ${currency}`);
  console.log(`  Withholding Tax: ${split.withholdingAmount} ${currency} (${split.withholdingRate * 100}%)`);
  console.log(`  Psychologist Net: ${split.psychologistNet} ${currency} ✅`);
  console.log(`  Platform Net: ${split.platformNet} ${currency}`);

  // Verify calculation (CRITICAL: ensure no money is lost!)
  const total = split.psychologistNet + split.platformNet;
  const diff = Math.abs(total - grossAmount);
  if (diff > 0.02) {
    throw new Error(
      `[Payout Ledger] CRITICAL ERROR: Split calculation mismatch! ` +
      `Expected: ${grossAmount}, Got: ${total}, Difference: ${diff}`
    );
  }

  // Insert into database
  const [ledgerEntry] = await db
    .insert(payoutLedger)
    .values({
      appointmentId,
      paymentId,
      psychologistId,
      countryCode: split.countryCode,

      // Amounts
      amountGross: split.grossAmount.toString(),
      platformFeeRate: split.platformFeeRate.toString(),
      platformFee: split.platformFee.toString(),

      psychologistGross: split.psychologistGross.toString(),
      withholdingRate: split.withholdingRate.toString(),
      withholdingAmount: split.withholdingAmount.toString(),
      psychologistNet: split.psychologistNet.toString(),

      platformNet: split.platformNet.toString(),
      currency: split.currency,

      // Store complete breakdown for audit
      taxBreakdownJson: split.breakdown,

      // Initial status
      payoutStatus: 'pending',
    })
    .returning({ id: payoutLedger.id });

  console.log(`[Payout Ledger] ✅ Created ledger entry: ${ledgerEntry.id}`);

  return ledgerEntry.id;
}

/**
 * Get payout ledger entry by appointment ID
 */
export async function getPayoutLedgerByAppointment(appointmentId: string) {
  const [entry] = await db
    .select()
    .from(payoutLedger)
    .where(eq(payoutLedger.appointmentId, appointmentId))
    .limit(1);

  return entry || null;
}

/**
 * Get payout ledger entry by ID
 */
export async function getPayoutLedger(ledgerId: string) {
  const [entry] = await db
    .select()
    .from(payoutLedger)
    .where(eq(payoutLedger.id, ledgerId))
    .limit(1);

  return entry || null;
}

/**
 * Update payout status after Stripe transfer
 */
export async function markPayoutPaid(
  ledgerId: string,
  stripeTransferId: string
): Promise<void> {
  console.log(`[Payout Ledger] Marking ledger ${ledgerId} as paid`);
  console.log(`  Stripe Transfer ID: ${stripeTransferId}`);

  await db
    .update(payoutLedger)
    .set({
      payoutStatus: 'paid',
      stripeTransferId,
      transferredAt: new Date(),
    })
    .where(eq(payoutLedger.id, ledgerId));

  console.log(`[Payout Ledger] ✅ Marked as paid`);
}

/**
 * Mark payout as failed
 */
export async function markPayoutFailed(
  ledgerId: string,
  errorMessage: string
): Promise<void> {
  console.log(`[Payout Ledger] Marking ledger ${ledgerId} as failed`);
  console.log(`  Error: ${errorMessage}`);

  await db
    .update(payoutLedger)
    .set({
      payoutStatus: 'failed',
      taxBreakdownJson: {
        error: errorMessage,
        failedAt: new Date().toISOString(),
      },
    })
    .where(eq(payoutLedger.id, ledgerId));

  console.log(`[Payout Ledger] ❌ Marked as failed`);
}

/**
 * Get all pending payouts for a psychologist
 */
export async function getPendingPayouts(psychologistId: string) {
  const { and } = await import('drizzle-orm');
  const entries = await db
    .select()
    .from(payoutLedger)
    .where(
      and(
        eq(payoutLedger.psychologistId, psychologistId),
        eq(payoutLedger.payoutStatus, 'pending')
      )
    );

  return entries;
}

/**
 * Get payout statistics for a psychologist
 */
export async function getPayoutStats(psychologistId: string) {
  const allPayouts = await db
    .select()
    .from(payoutLedger)
    .where(eq(payoutLedger.psychologistId, psychologistId));

  const pending = allPayouts.filter(p => p.payoutStatus === 'pending');
  const paid = allPayouts.filter(p => p.payoutStatus === 'paid');
  const failed = allPayouts.filter(p => p.payoutStatus === 'failed');

  const totalPending = pending.reduce((sum, p) => sum + parseFloat(p.psychologistNet), 0);
  const totalPaid = paid.reduce((sum, p) => sum + parseFloat(p.psychologistNet), 0);
  const totalEarnings = totalPending + totalPaid;

  const currency = allPayouts[0]?.currency || 'USD';

  return {
    currency,
    pending: {
      count: pending.length,
      amount: Math.round(totalPending * 100) / 100,
    },
    paid: {
      count: paid.length,
      amount: Math.round(totalPaid * 100) / 100,
    },
    failed: {
      count: failed.length,
    },
    total: {
      earnings: Math.round(totalEarnings * 100) / 100,
      sessions: allPayouts.length,
    },
  };
}
