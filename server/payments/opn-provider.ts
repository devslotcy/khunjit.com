/**
 * Opn Payments (formerly Omise) Provider for Thailand PromptPay
 *
 * This module handles:
 * - Creating PromptPay QR charges
 * - Verifying webhook signatures
 * - Processing payment confirmations
 *
 * Documentation: https://docs.opn.ooo/promptpay/thailand
 */

import crypto from 'crypto';

// Environment configuration
const OPN_SECRET_KEY = process.env.OPN_SECRET_KEY || '';
const OPN_PUBLIC_KEY = process.env.OPN_PUBLIC_KEY || '';
const OPN_WEBHOOK_SECRET = process.env.OPN_WEBHOOK_SECRET || '';
const OPN_API_URL = 'https://api.omise.co';

// Types
export interface CreateChargeParams {
  amount: number; // Amount in satangs (1 THB = 100 satangs)
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date; // QR expiration time
  returnUri?: string;
}

export interface OpnCharge {
  object: 'charge';
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'successful' | 'failed' | 'expired' | 'reversed';
  source: {
    object: 'source';
    id: string;
    type: 'promptpay';
    scannable_code?: {
      object: 'barcode';
      type: 'qr';
      image: {
        object: 'document';
        download_uri: string;
      };
    };
  };
  metadata?: Record<string, any>;
  description?: string;
  created_at: string;
  expires_at?: string;
  paid_at?: string;
  failure_code?: string;
  failure_message?: string;
}

export interface OpnSource {
  object: 'source';
  id: string;
  type: 'promptpay';
  amount: number;
  currency: string;
  scannable_code?: {
    object: 'barcode';
    type: 'qr';
    image: {
      object: 'document';
      download_uri: string;
    };
  };
}

export interface WebhookEvent {
  object: 'event';
  id: string;
  key: string; // e.g., 'charge.complete'
  data: OpnCharge;
  created_at: string;
}

export interface CreateChargeResult {
  success: boolean;
  chargeId?: string;
  qrImageUrl?: string;
  qrPayload?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Make authenticated request to Opn API
 */
async function opnRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, any>
): Promise<T> {
  const url = `${OPN_API_URL}${endpoint}`;

  // Basic auth with secret key
  const auth = Buffer.from(`${OPN_SECRET_KEY}:`).toString('base64');

  const headers: Record<string, string> = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method === 'POST') {
    // Convert object to URL-encoded form data
    const formData = new URLSearchParams();
    flattenObject(body, formData);
    options.body = formData.toString();
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Opn API error: ${response.status}`);
  }

  return data as T;
}

/**
 * Flatten nested object for URL-encoded form data
 */
function flattenObject(obj: Record<string, any>, formData: URLSearchParams, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, formData, fullKey);
    } else if (value !== undefined && value !== null) {
      formData.append(fullKey, String(value));
    }
  }
}

/**
 * Create a PromptPay source (generates QR code)
 */
export async function createPromptPaySource(
  amount: number, // In THB (will be converted to satangs)
  currency: string = 'THB'
): Promise<OpnSource> {
  const amountInSatangs = Math.round(amount * 100);

  return opnRequest<OpnSource>('/sources', 'POST', {
    type: 'promptpay',
    amount: amountInSatangs,
    currency,
  });
}

/**
 * Create a PromptPay charge with QR code
 */
export async function createPromptPayCharge(params: CreateChargeParams): Promise<CreateChargeResult> {
  try {
    if (!OPN_SECRET_KEY) {
      // Development mode - return mock data with REAL Thai QR
      console.log('[Opn] Running in development mode - generating real Thai QR code');
      return await createMockCharge(params);
    }

    const amountInSatangs = Math.round(params.amount * 100);

    // First create a source
    const source = await createPromptPaySource(params.amount, params.currency);

    // Then create a charge with the source
    const chargeParams: Record<string, any> = {
      amount: amountInSatangs,
      currency: params.currency || 'THB',
      source: source.id,
    };

    if (params.description) {
      chargeParams.description = params.description;
    }

    if (params.metadata) {
      chargeParams.metadata = params.metadata;
    }

    if (params.returnUri) {
      chargeParams.return_uri = params.returnUri;
    }

    // Opn supports expires_at for QR code expiration
    if (params.expiresAt) {
      chargeParams.expires_at = params.expiresAt.toISOString();
    }

    const charge = await opnRequest<OpnCharge>('/charges', 'POST', chargeParams);

    return {
      success: true,
      chargeId: charge.id,
      qrImageUrl: charge.source?.scannable_code?.image?.download_uri,
      expiresAt: charge.expires_at ? new Date(charge.expires_at) : undefined,
    };
  } catch (error) {
    console.error('[Opn] Error creating charge:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating charge',
    };
  }
}

/**
 * Get charge status
 */
export async function getCharge(chargeId: string): Promise<OpnCharge | null> {
  try {
    if (!OPN_SECRET_KEY) {
      // Development mode
      return null;
    }
    return await opnRequest<OpnCharge>(`/charges/${chargeId}`);
  } catch (error) {
    console.error('[Opn] Error fetching charge:', error);
    return null;
  }
}

/**
 * Verify webhook signature from Opn
 *
 * Opn uses HMAC-SHA256 to sign webhooks
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!OPN_WEBHOOK_SECRET) {
    console.warn('[Opn] Webhook secret not configured - skipping signature verification');
    return true; // Skip verification in development
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', OPN_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Opn] Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Parse webhook event from Opn
 */
export function parseWebhookEvent(payload: string): WebhookEvent | null {
  try {
    return JSON.parse(payload) as WebhookEvent;
  } catch (error) {
    console.error('[Opn] Error parsing webhook payload:', error);
    return null;
  }
}

/**
 * Map Opn charge status to our payment status
 */
export function mapChargeStatus(opnStatus: OpnCharge['status']): string {
  switch (opnStatus) {
    case 'successful':
      return 'paid';
    case 'pending':
      return 'pending';
    case 'failed':
      return 'failed';
    case 'expired':
      return 'expired';
    case 'reversed':
      return 'refunded';
    default:
      return 'unknown';
  }
}

/**
 * Check if the provider is properly configured
 */
export function isConfigured(): boolean {
  return Boolean(OPN_SECRET_KEY && OPN_PUBLIC_KEY);
}

/**
 * Get provider name
 */
export function getProviderName(): string {
  return 'opn';
}

/**
 * Create mock charge for development/testing
 * Now generates REAL Thai QR codes using PromptPay standard
 */
async function createMockCharge(params: CreateChargeParams): Promise<CreateChargeResult> {
  const mockChargeId = `chrg_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const expiresAt = params.expiresAt || new Date(Date.now() + 15 * 60 * 1000); // 15 minutes default

  // Import Thai QR generator
  const { generateThaiQR } = await import('./thai-qr-generator');

  // Configuration from environment or defaults
  const receiverType = (process.env.PROMPTPAY_RECEIVER_TYPE as 'BANK_ACCOUNT' | 'PHONE') || 'BANK_ACCOUNT';
  const receiverValue = receiverType === 'BANK_ACCOUNT'
    ? (process.env.KBANK_ACCOUNT || '0073902908')
    : (process.env.PROMPTPAY_PHONE || '0908925858');

  console.log(`[Opn Mock] Generating Thai QR: Type=${receiverType}, Value=${receiverValue}, Amount=${params.amount} THB`);

  // Generate real Thai QR code
  const qrResult = await generateThaiQR({
    receiver: {
      type: receiverType,
      value: receiverValue,
    },
    amount: params.amount,
    description: params.description,
  });

  if (!qrResult.success) {
    console.error('[Opn Mock] Failed to generate Thai QR:', qrResult.error);
    throw new Error(qrResult.error || 'Failed to generate QR code');
  }

  console.log(`[Opn Mock] Thai QR generated successfully. Actual receiver: ${qrResult.receiverType} = ${qrResult.receiverValue}`);

  return {
    success: true,
    chargeId: mockChargeId,
    qrImageUrl: qrResult.qrImageDataUrl, // Base64 data URL
    qrPayload: qrResult.qrPayload, // EMVCo payload string
    expiresAt,
  };
}

/**
 * Simulate payment completion for testing
 * Only works in development mode
 */
export async function simulatePaymentComplete(chargeId: string): Promise<boolean> {
  if (OPN_SECRET_KEY) {
    console.warn('[Opn] Cannot simulate payment in production mode');
    return false;
  }

  console.log(`[Opn] Simulating payment completion for charge: ${chargeId}`);
  return true;
}
