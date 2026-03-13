/**
 * Payout Calculator
 *
 * Calculates payment splits between platform and psychologists
 * with country-specific tax withholding.
 *
 * Formula:
 * 1. Platform Fee = Gross × 20%
 * 2. Psychologist Gross = Gross × 80%
 * 3. Withholding Tax = Psychologist Gross × Country Tax Rate
 * 4. Psychologist Net = Psychologist Gross - Withholding Tax
 * 5. Platform Net = Platform Fee + Withholding Tax
 */

import { db } from '../db';
import { countryTaxRules } from '../../shared/schema';
import { eq, and, isNull, or, lte } from 'drizzle-orm';
import type { PaymentSplit, TaxRule } from './types';

// Platform commission rate (20%)
const PLATFORM_FEE_RATE = 0.20;

/**
 * Get active tax rule for a country
 */
export async function getTaxRule(countryCode: string): Promise<TaxRule | null> {
  try {
    // Find tax rule for country (simplified query for now)
    const [rule] = await db
      .select()
      .from(countryTaxRules)
      .where(eq(countryTaxRules.countryCode, countryCode))
      .limit(1);

    if (!rule) {
      console.warn(`No tax rule found for country: ${countryCode}, using default (US)`);
      // Fallback to US (0% withholding)
      const [defaultRule] = await db
        .select()
        .from(countryTaxRules)
        .where(eq(countryTaxRules.countryCode, 'US'))
        .limit(1);

      return defaultRule || null;
    }

    return {
      id: rule.id,
      countryCode: rule.countryCode,
      countryName: rule.countryName,
      currency: rule.currency || 'USD',
      withholdingRate: parseFloat(rule.withholdingRate),
      platformTaxRate: parseFloat(rule.platformTaxRate || '0'),
      taxIncludedInPrice: rule.taxIncludedInPrice || false,
      notes: rule.notes || undefined,
    };
  } catch (error) {
    console.error('Error fetching tax rule:', error);
    return null;
  }
}

/**
 * Calculate payment split with tax withholding
 *
 * @param grossAmount - Total payment amount from patient
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param currency - ISO 4217 currency code
 * @returns Payment split breakdown
 *
 * @example
 * // Thailand: 1,000 THB payment
 * const split = await calculatePayoutSplit(1000, 'TH', 'THB');
 * // Result:
 * // - Platform fee: 200 THB (20%)
 * // - Psychologist gross: 800 THB (80%)
 * // - Withholding tax: 24 THB (3% of 800)
 * // - Psychologist net: 776 THB
 * // - Platform net: 224 THB (200 + 24)
 */
export async function calculatePayoutSplit(
  grossAmount: number,
  countryCode: string,
  currency: string = 'USD'
): Promise<PaymentSplit> {
  // Get tax rule for country
  const taxRule = await getTaxRule(countryCode);

  if (!taxRule) {
    throw new Error(`Unable to calculate payout: No tax rule for country ${countryCode}`);
  }

  // Round to 2 decimal places for currency precision
  const round = (num: number): number => Math.round(num * 100) / 100;

  // Step 1: Gross amount (what patient paid)
  const step1_gross = round(grossAmount);

  // Step 2: Platform fee (20%)
  const platformFee = round(grossAmount * PLATFORM_FEE_RATE);

  // Step 3: Psychologist's gross share (80%)
  const psychologistGross = round(grossAmount * (1 - PLATFORM_FEE_RATE));

  // Step 4: Withholding tax (country-specific rate applied to psychologist's share)
  const withholdingAmount = round(psychologistGross * taxRule.withholdingRate);

  // Step 5: Psychologist's net payout (after tax deduction)
  const psychologistNet = round(psychologistGross - withholdingAmount);

  // Step 6: Platform's net revenue (fee + withheld tax)
  const platformNet = round(platformFee + withholdingAmount);

  // Verification: Ensure totals match
  const totalDistributed = psychologistNet + platformNet;
  if (Math.abs(totalDistributed - grossAmount) > 0.02) {
    console.warn(
      `Payout calculation mismatch: ${totalDistributed} !== ${grossAmount} (diff: ${Math.abs(totalDistributed - grossAmount)})`
    );
  }

  return {
    grossAmount: step1_gross,
    currency: currency || taxRule.currency,
    countryCode: taxRule.countryCode,

    platformFeeRate: PLATFORM_FEE_RATE,
    platformFee,

    psychologistGross,

    withholdingRate: taxRule.withholdingRate,
    withholdingAmount,

    psychologistNet,
    platformNet,

    breakdown: {
      step1_gross,
      step2_platformFee: platformFee,
      step3_psychologistGross: psychologistGross,
      step4_withholdingTax: withholdingAmount,
      step5_psychologistNet: psychologistNet,
      step6_platformNet: platformNet,
    },
  };
}

/**
 * Calculate payout for multiple sessions (batch)
 */
export async function calculateBatchPayouts(
  sessions: Array<{ amount: number; countryCode: string; currency: string }>
): Promise<PaymentSplit[]> {
  const results: PaymentSplit[] = [];

  for (const session of sessions) {
    const split = await calculatePayoutSplit(
      session.amount,
      session.countryCode,
      session.currency
    );
    results.push(split);
  }

  return results;
}

/**
 * Get payout summary statistics
 */
export function getPayoutSummary(splits: PaymentSplit[]): {
  totalGross: number;
  totalPsychologistNet: number;
  totalPlatformNet: number;
  totalWithholdingTax: number;
  averageWithholdingRate: number;
  currency: string;
} {
  const totalGross = splits.reduce((sum, s) => sum + s.grossAmount, 0);
  const totalPsychologistNet = splits.reduce((sum, s) => sum + s.psychologistNet, 0);
  const totalPlatformNet = splits.reduce((sum, s) => sum + s.platformNet, 0);
  const totalWithholdingTax = splits.reduce((sum, s) => sum + s.withholdingAmount, 0);
  const averageWithholdingRate = splits.reduce((sum, s) => sum + s.withholdingRate, 0) / splits.length;

  // Assume all same currency (should validate in production)
  const currency = splits[0]?.currency || 'USD';

  return {
    totalGross: Math.round(totalGross * 100) / 100,
    totalPsychologistNet: Math.round(totalPsychologistNet * 100) / 100,
    totalPlatformNet: Math.round(totalPlatformNet * 100) / 100,
    totalWithholdingTax: Math.round(totalWithholdingTax * 100) / 100,
    averageWithholdingRate: Math.round(averageWithholdingRate * 10000) / 10000,
    currency,
  };
}

/**
 * Format payout breakdown for display/logging
 */
export function formatPayoutBreakdown(split: PaymentSplit): string {
  const { currency, breakdown } = split;

  return `
Payout Breakdown (${split.countryCode} - ${currency}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Patient Payment:       ${breakdown.step1_gross.toFixed(2)} ${currency}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Platform Fee (30%):   -${breakdown.step2_platformFee.toFixed(2)} ${currency}
  Psychologist Share:    ${breakdown.step3_psychologistGross.toFixed(2)} ${currency}
  Withholding Tax:      -${breakdown.step4_withholdingTax.toFixed(2)} ${currency} (${(split.withholdingRate * 100).toFixed(2)}%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Psychologist Net:      ${breakdown.step5_psychologistNet.toFixed(2)} ${currency} ✅
  Platform Net:          ${breakdown.step6_platformNet.toFixed(2)} ${currency}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
}
