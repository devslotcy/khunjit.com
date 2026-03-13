import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { createHash } from 'crypto';

const APP_NAME = 'Mendly';

// Encrypt secret before storing in database (optional - for extra security)
export function encryptSecret(secret: string): string {
  const key = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.SESSION_SECRET || 'default-key';
  return createHash('sha256').update(secret + key).digest('hex');
}

// Generate a new TOTP secret for a user
export function generateSecret(): string {
  const secret = speakeasy.generateSecret({
    name: APP_NAME,
    length: 32,
  });
  return secret.base32;
}

// Generate QR code data URL for Google Authenticator
export async function generateQRCode(userEmail: string, secret: string): Promise<string> {
  const otpauth = speakeasy.otpauthURL({
    secret,
    label: userEmail,
    issuer: APP_NAME,
    encoding: 'base32',
  });
  return await QRCode.toDataURL(otpauth);
}

// Verify a TOTP token
export function verifyToken(token: string, secret: string): boolean {
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 steps before/after for clock drift (±60 seconds)
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return false;
  }
}

// Generate backup codes (for account recovery)
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

// Hash backup codes before storing
export function hashBackupCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
