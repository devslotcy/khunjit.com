/**
 * Payment and Payout Types
 *
 * Comprehensive type definitions for multi-currency payment processing,
 * tax calculations, and psychologist payouts.
 */

/**
 * Payment split breakdown showing how payment is distributed
 */
export interface PaymentSplit {
  // Original payment amount
  grossAmount: number;
  currency: string;
  countryCode: string;

  // Platform fee (30%)
  platformFeeRate: number;
  platformFee: number;

  // Psychologist's share before tax (70%)
  psychologistGross: number;

  // Tax withholding
  withholdingRate: number;
  withholdingAmount: number;

  // Final amounts
  psychologistNet: number; // What psychologist receives
  platformNet: number;     // What platform keeps (fee + tax)

  // Breakdown for transparency
  breakdown: {
    step1_gross: number;
    step2_platformFee: number;
    step3_psychologistGross: number;
    step4_withholdingTax: number;
    step5_psychologistNet: number;
    step6_platformNet: number;
  };
}

/**
 * Tax rule for a specific country
 */
export interface TaxRule {
  id: string;
  countryCode: string;
  countryName: string;
  currency: string;
  withholdingRate: number; // Decimal (e.g., 0.03 = 3%)
  platformTaxRate: number;
  taxIncludedInPrice: boolean;
  notes?: string;
}

/**
 * Payout ledger entry
 */
export interface PayoutLedgerEntry {
  id: string;
  appointmentId: string;
  paymentId: string;
  psychologistId: string;
  countryCode: string;

  amountGross: number;
  platformFeeRate: number;
  platformFee: number;

  psychologistGross: number;
  withholdingRate: number;
  withholdingAmount: number;
  psychologistNet: number;

  platformNet: number;
  currency: string;

  status: 'pending_payout' | 'paid' | 'failed';
  stripeTransferId?: string;
  paidAt?: Date;

  taxBreakdownJson?: Record<string, any>;
  createdAt: Date;
}

/**
 * Currency information
 */
export interface CurrencyInfo {
  code: string;
  symbol: string;
  decimals: number;
  locale: string;
}
