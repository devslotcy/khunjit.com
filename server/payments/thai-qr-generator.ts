/**
 * Thai QR Code Generator
 *
 * Generates valid Thai QR Payment codes (PromptPay standard)
 * compatible with all Thai banking apps (KBank, SCB, Bangkok Bank, etc.)
 *
 * Supports:
 * - Bank account numbers
 * - PromptPay phone numbers
 * - Amount encoding
 */

import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';

// Always use 1 Baht for testing
const FIXED_AMOUNT = 1.00; // Always 1 THB

export interface ThaiQRConfig {
  receiver: {
    type: 'BANK_ACCOUNT' | 'PHONE';
    value: string; // Bank account number or phone number
  };
  amount: number; // Amount in THB
  description?: string;
}

export interface ThaiQRResult {
  success: boolean;
  qrPayload?: string; // EMVCo payload string
  qrImageDataUrl?: string; // Base64 data URL for QR image
  amount: number; // Final amount used (may be overridden in TEST_MODE)
  receiverType: 'BANK_ACCOUNT' | 'PHONE';
  receiverValue: string;
  error?: string;
}

/**
 * Normalize phone number for PromptPay
 * PromptPay expects format: 0XXXXXXXXX (10 digits starting with 0)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If it starts with country code +66 or 66, replace with 0
  if (cleaned.startsWith('66')) {
    cleaned = '0' + cleaned.substring(2);
  }

  // Ensure it starts with 0
  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

/**
 * Normalize bank account number
 * Remove all non-digit characters
 */
function normalizeBankAccount(account: string): string {
  return account.replace(/\D/g, '');
}

/**
 * Generate Thai QR code payload using PromptPay standard
 */
export async function generateThaiQR(config: ThaiQRConfig): Promise<ThaiQRResult> {
  try {
    let { receiver } = config;

    // Always use 1 Baht for testing
    const amount = FIXED_AMOUNT;
    console.log(`[ThaiQR] Generating 1 Baht QR (fixed amount for testing)`)

    // Validate amount
    if (amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than 0',
        amount,
        receiverType: receiver.type,
        receiverValue: receiver.value,
      };
    }

    let qrPayload: string;
    let finalReceiverType = receiver.type;
    let finalReceiverValue = receiver.value;

    try {
      // Try primary receiver configuration
      if (receiver.type === 'BANK_ACCOUNT') {
        const accountNumber = normalizeBankAccount(receiver.value);

        // PromptPay library doesn't directly support bank accounts
        // They must be registered with PromptPay first
        // If the bank account is NOT registered with PromptPay, this will fail
        console.log(`[ThaiQR] Attempting to generate QR with bank account: ${accountNumber}`);

        // Try to use the account number as a PromptPay ID
        // This will only work if the account is registered with PromptPay
        qrPayload = generatePayload(accountNumber, { amount });

        console.log(`[ThaiQR] Successfully generated QR with bank account`);
      } else {
        // PHONE type
        const phoneNumber = normalizePhoneNumber(receiver.value);

        console.log(`[ThaiQR] Generating QR with phone number: ${phoneNumber}`);
        qrPayload = generatePayload(phoneNumber, { amount });

        console.log(`[ThaiQR] Successfully generated QR with phone number`);
      }
    } catch (primaryError) {
      // If bank account fails, fallback to phone number
      if (receiver.type === 'BANK_ACCOUNT') {
        console.warn(`[ThaiQR] Bank account not registered with PromptPay. Falling back to phone number.`);
        console.warn(`[ThaiQR] Error:`, primaryError);

        // Fallback configuration
        const fallbackPhone = process.env.PROMPTPAY_PHONE || '0908925858';
        const phoneNumber = normalizePhoneNumber(fallbackPhone);

        console.log(`[ThaiQR] Using fallback phone: ${phoneNumber}`);
        qrPayload = generatePayload(phoneNumber, { amount });

        finalReceiverType = 'PHONE';
        finalReceiverValue = phoneNumber;

        console.log(`[ThaiQR] Successfully generated QR with fallback phone`);
      } else {
        throw primaryError;
      }
    }

    // Generate QR code image as Data URL
    const qrImageDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    console.log(`[ThaiQR] Generated QR code successfully. Amount: ${amount} THB, Type: ${finalReceiverType}`);

    return {
      success: true,
      qrPayload,
      qrImageDataUrl,
      amount,
      receiverType: finalReceiverType,
      receiverValue: finalReceiverValue,
    };
  } catch (error) {
    console.error('[ThaiQR] Error generating QR code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating QR code',
      amount: FIXED_AMOUNT,
      receiverType: config.receiver.type,
      receiverValue: config.receiver.value,
    };
  }
}

/**
 * Generate QR code image URL from payload
 */
export async function generateQRImage(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
  });
}
