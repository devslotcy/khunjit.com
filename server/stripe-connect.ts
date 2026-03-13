/**
 * Stripe Connect Service
 *
 * Handles Stripe Connect Express account onboarding and management for psychologists.
 * This enables the platform to collect payments from patients via credit card
 * and automatically distribute commissions to psychologists via Stripe payouts.
 */

import Stripe from 'stripe';
import { db } from './db';
import { psychologistProfiles } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-12-15.clover' as any, // Use latest stable API version
  });
  const isLiveMode = stripeSecretKey.startsWith('sk_live_');
  console.log(`[Stripe Connect] Initialized in ${isLiveMode ? 'LIVE' : 'TEST'} mode`);
} else {
  console.warn('[Stripe Connect] No STRIPE_SECRET_KEY found - Stripe Connect disabled');
}

// Types
export interface StripeAccountStatus {
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  currentlyDue: string[];
  status: 'NOT_CONNECTED' | 'INCOMPLETE' | 'ACTIVE';
}

/**
 * Check if Stripe Connect is enabled (API key configured)
 */
export function isStripeConnectEnabled(): boolean {
  return stripe !== null;
}

/**
 * Get or create a Stripe Connect Express account for a psychologist
 */
export async function getOrCreateStripeAccount(
  psychologistId: string,
  email: string,
  country: string = 'US' // Default to US, should be passed from psychologist's country
): Promise<{ success: boolean; accountId?: string; error?: string }> {
  if (!stripe) {
    return { success: false, error: 'Stripe Connect not configured' };
  }

  try {
    // Check if psychologist already has a Stripe account
    const [psychologist] = await db
      .select()
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.id, psychologistId))
      .limit(1);

    if (!psychologist) {
      return { success: false, error: 'Psychologist not found' };
    }

    // Return existing account if present
    if (psychologist.stripeAccountId) {
      return { success: true, accountId: psychologist.stripeAccountId };
    }

    // Create new Connect Express account
    console.log(`[Stripe Connect] Creating Express account for psychologist ${psychologistId}`);

    const account = await stripe.accounts.create({
      type: 'express',
      country: country,
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
    });

    // Save account ID to database
    await db
      .update(psychologistProfiles)
      .set({
        stripeAccountId: account.id,
        stripeOnboardingStatus: 'INCOMPLETE',
        lastStripeSyncAt: new Date(),
      })
      .where(eq(psychologistProfiles.id, psychologistId));

    console.log(`[Stripe Connect] Created account ${account.id} for psychologist ${psychologistId}`);

    return { success: true, accountId: account.id };
  } catch (error) {
    console.error('[Stripe Connect] Error creating account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Stripe account',
    };
  }
}

/**
 * Generate Account Link for onboarding or updating account information
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!stripe) {
    return { success: false, error: 'Stripe Connect not configured' };
  }

  try {
    console.log(`[Stripe Connect] Creating account link for ${accountId}`);

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return { success: true, url: accountLink.url };
  } catch (error) {
    console.error('[Stripe Connect] Error creating account link:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account link',
    };
  }
}

/**
 * Get account status from Stripe and update local database
 */
export async function syncAccountStatus(
  psychologistId: string
): Promise<{ success: boolean; status?: StripeAccountStatus; error?: string }> {
  if (!stripe) {
    return { success: false, error: 'Stripe Connect not configured' };
  }

  try {
    // Get psychologist's Stripe account ID
    const [psychologist] = await db
      .select()
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.id, psychologistId))
      .limit(1);

    if (!psychologist || !psychologist.stripeAccountId) {
      return {
        success: true,
        status: {
          stripeAccountId: null,
          chargesEnabled: false,
          payoutsEnabled: false,
          currentlyDue: [],
          status: 'NOT_CONNECTED',
        },
      };
    }

    // Fetch account from Stripe
    console.log(`[Stripe Connect] Fetching account status for ${psychologist.stripeAccountId}`);

    const account = await stripe.accounts.retrieve(psychologist.stripeAccountId);

    // Extract status information
    const chargesEnabled = account.charges_enabled || false;
    const payoutsEnabled = account.payouts_enabled || false;
    const currentlyDue = account.requirements?.currently_due || [];

    // Determine overall status
    let status: 'NOT_CONNECTED' | 'INCOMPLETE' | 'ACTIVE' = 'INCOMPLETE';
    if (chargesEnabled && payoutsEnabled && currentlyDue.length === 0) {
      status = 'ACTIVE';
    }

    // Update database
    await db
      .update(psychologistProfiles)
      .set({
        chargesEnabled,
        payoutsEnabled,
        requirementsDue: currentlyDue,
        stripeOnboardingStatus: status,
        lastStripeSyncAt: new Date(),
      })
      .where(eq(psychologistProfiles.id, psychologistId));

    console.log(`[Stripe Connect] Account ${psychologist.stripeAccountId} status: ${status}`);

    return {
      success: true,
      status: {
        stripeAccountId: psychologist.stripeAccountId,
        chargesEnabled,
        payoutsEnabled,
        currentlyDue,
        status,
      },
    };
  } catch (error) {
    console.error('[Stripe Connect] Error syncing account status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync account status',
    };
  }
}

/**
 * Get account status from Stripe by account ID (used in webhooks)
 */
export async function syncAccountStatusByStripeId(
  stripeAccountId: string
): Promise<{ success: boolean; error?: string }> {
  if (!stripe) {
    return { success: false, error: 'Stripe Connect not configured' };
  }

  try {
    // Find psychologist by Stripe account ID
    const [psychologist] = await db
      .select()
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.stripeAccountId, stripeAccountId))
      .limit(1);

    if (!psychologist) {
      console.warn(`[Stripe Connect] No psychologist found for Stripe account ${stripeAccountId}`);
      return { success: false, error: 'Psychologist not found' };
    }

    // Fetch account from Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId);

    // Extract status information
    const chargesEnabled = account.charges_enabled || false;
    const payoutsEnabled = account.payouts_enabled || false;
    const currentlyDue = account.requirements?.currently_due || [];

    // Determine overall status
    let status: 'NOT_CONNECTED' | 'INCOMPLETE' | 'ACTIVE' = 'INCOMPLETE';
    if (chargesEnabled && payoutsEnabled && currentlyDue.length === 0) {
      status = 'ACTIVE';
    }

    // Update database
    await db
      .update(psychologistProfiles)
      .set({
        chargesEnabled,
        payoutsEnabled,
        requirementsDue: currentlyDue,
        stripeOnboardingStatus: status,
        lastStripeSyncAt: new Date(),
      })
      .where(eq(psychologistProfiles.id, psychologist.id));

    console.log(`[Stripe Connect] Synced account ${stripeAccountId} status: ${status}`);

    return { success: true };
  } catch (error) {
    console.error('[Stripe Connect] Error syncing account by Stripe ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync account',
    };
  }
}

/**
 * Create a login link to Stripe Express Dashboard
 */
export async function createLoginLink(
  accountId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!stripe) {
    return { success: false, error: 'Stripe Connect not configured' };
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return { success: true, url: loginLink.url };
  } catch (error) {
    console.error('[Stripe Connect] Error creating login link:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create login link',
    };
  }
}

/**
 * Create a payment intent with destination charges (platform takes fee, psychologist receives payment)
 * This will be used later when implementing the actual payment flow
 */
export async function createPaymentIntentWithDestination(
  amount: number, // Amount in smallest currency unit (e.g., cents)
  currency: string,
  destinationAccountId: string,
  applicationFeeAmount: number, // Platform fee in smallest currency unit
  metadata?: Record<string, string>
): Promise<{ success: boolean; paymentIntent?: Stripe.PaymentIntent; error?: string }> {
  if (!stripe) {
    return { success: false, error: 'Stripe Connect not configured' };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: destinationAccountId,
      },
      metadata: metadata || {},
    });

    return { success: true, paymentIntent };
  } catch (error) {
    console.error('[Stripe Connect] Error creating payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    };
  }
}

/**
 * Create a transfer to a connected account after successful payment
 * This is used for separate charges and transfers model
 */
export async function createTransfer(
  amount: number, // Amount in smallest currency unit (cents)
  currency: string,
  destinationAccountId: string,
  sourcePaymentIntentId: string,
  metadata?: Record<string, string>
): Promise<{ success: boolean; transfer?: Stripe.Transfer; error?: string }> {
  if (!stripe) {
    return { success: false, error: 'Stripe Connect not configured' };
  }

  try {
    console.log(`[Stripe Connect] Creating transfer of ${amount} ${currency} to ${destinationAccountId}`);

    const transfer = await stripe.transfers.create({
      amount,
      currency,
      destination: destinationAccountId,
      source_transaction: sourcePaymentIntentId, // Link to the original payment
      metadata: metadata || {},
    });

    console.log(`[Stripe Connect] Transfer created: ${transfer.id}`);

    return { success: true, transfer };
  } catch (error) {
    console.error('[Stripe Connect] Error creating transfer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create transfer',
    };
  }
}

/**
 * Get psychologist's Stripe account ID
 */
export async function getPsychologistStripeAccount(
  psychologistId: string
): Promise<{ success: boolean; accountId?: string; isActive?: boolean; error?: string }> {
  try {
    const [psychologist] = await db
      .select()
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.id, psychologistId))
      .limit(1);

    if (!psychologist) {
      return { success: false, error: 'Psychologist not found' };
    }

    if (!psychologist.stripeAccountId) {
      return { success: true, accountId: undefined, isActive: false };
    }

    const isActive = psychologist.chargesEnabled && psychologist.payoutsEnabled;

    return {
      success: true,
      accountId: psychologist.stripeAccountId,
      isActive,
    };
  } catch (error) {
    console.error('[Stripe Connect] Error getting psychologist account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get psychologist account',
    };
  }
}

export { stripe };
