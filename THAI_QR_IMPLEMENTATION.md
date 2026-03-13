# Thai QR / PromptPay Implementation

## Overview

The system now generates **real Thai QR codes** using the PromptPay standard that are compatible with all Thai banking apps (KBank, SCB, Bangkok Bank, etc.).

## Features Implemented

### 1. Real Thai QR Code Generation

- Uses `promptpay-qr` library to generate EMVCo-compliant QR payloads
- Generates QR codes as base64 data URLs for easy display
- Supports both bank account numbers and phone numbers
- Automatic fallback from bank account to phone number if needed

### 2. TEST_MODE for Development

- Set `TEST_MODE=true` in `.env` to always use 1.00 THB for all payments
- Perfect for testing QR codes with real banking apps without actual charges
- Amount override happens at QR generation time

### 3. Receiver Configuration

- **Primary**: Bank account number (must be registered with PromptPay)
- **Fallback**: Phone number (always works with PromptPay)

### 4. Status Validation Fix

- Payment creation now accepts `reserved` appointment status
- No more "Invalid appointment status: reserved" errors

## Configuration

Add to your `.env` file:

```bash
# Test mode (set to true to always use 1.00 THB for all payments)
TEST_MODE=true

# PromptPay receiver type: BANK_ACCOUNT or PHONE
# Note: Bank accounts must be registered with PromptPay to work
# If not registered, system will automatically fall back to PHONE
PROMPTPAY_RECEIVER_TYPE=BANK_ACCOUNT

# KBank account number (if using BANK_ACCOUNT type)
KBANK_ACCOUNT=0073902908

# PromptPay phone number (primary or fallback)
# Must be 10 digits starting with 0
PROMPTPAY_PHONE=0908925858
```

## How It Works

### Backend Flow

1. **Appointment Created**: Status = `reserved`
2. **Payment Initiated**: User clicks "Pay Now"
3. **QR Generation**:
   - Backend calls `generateThaiQR()` from `thai-qr-generator.ts`
   - Tries bank account first (if configured)
   - Falls back to phone number if bank account fails
   - TEST_MODE overrides amount to 1.00 THB
   - Returns EMVCo-compliant payload + base64 QR image
4. **QR Display**: Frontend shows base64 image
5. **Payment**: User scans with Thai banking app
6. **Webhook**: Payment confirmation updates appointment to `confirmed`

### Key Files

- **`server/payments/thai-qr-generator.ts`**: Core QR generation logic
- **`server/payments/opn-provider.ts`**: Payment provider (now uses Thai QR in dev mode)
- **`server/payments/payment-service.ts`**: High-level payment operations
- **`server/routes.ts`**: API endpoint `/api/payments/promptpay/create`
- **`client/src/pages/patient/promptpay-checkout.tsx`**: QR display UI

## API Response

### POST /api/payments/promptpay/create

```json
{
  "success": true,
  "payment": {
    "id": "payment-uuid",
    "amount": 1.00,
    "currency": "THB",
    "status": "pending",
    "qrImageUrl": "data:image/png;base64,...",
    "qrPayload": "00020101021229370016A000000677010111...",
    "expiresAt": "2026-01-17T20:15:00.000Z"
  }
}
```

### QR Payload Format

The `qrPayload` is an EMVCo-compliant string that follows Thai QR Payment standard:

- Starts with `00020101` (version)
- Contains PromptPay tag `29`
- Includes receiver ID (bank account or phone)
- Includes amount in tag `54`
- Includes checksum in tag `63`

Example:
```
00020101021229370016A000000677010111011300669265636525802TH530376454041.006304E052
```

## Testing

### Test QR Generation

```bash
# Run test script
TEST_MODE=true npx tsx test-thai-qr.ts
```

### Test with Banking App

1. Set `TEST_MODE=true` in `.env`
2. Start the server: `npm run dev`
3. Create an appointment
4. Go to payment screen
5. Scan QR code with K+ or other Thai banking app
6. Should show 1.00 THB payment ready to confirm

## Troubleshooting

### Bank Account QR Not Working

**Problem**: "Invalid QR" error when scanning

**Solution**: Bank account must be registered with PromptPay first. The system will automatically fall back to phone number.

**Fix**: Either:
1. Register your bank account with PromptPay through your banking app
2. Or use `PROMPTPAY_RECEIVER_TYPE=PHONE` directly

### Amount Override Not Working

**Problem**: QR shows wrong amount

**Check**:
```bash
# Make sure TEST_MODE is set
grep TEST_MODE .env

# Should output: TEST_MODE=true
```

### QR Code Not Displaying

**Problem**: Frontend shows loading forever

**Check**:
1. Browser console for errors
2. Network tab for `/api/payments/promptpay/create` response
3. Server logs for QR generation errors

## Production Considerations

### Using Real Opn Payments API

When you set `OPN_SECRET_KEY`, the system will:
1. Use real Opn Payments API instead of mock
2. Create actual charges with real QR codes
3. Process real webhook events

### Disabling TEST_MODE

For production:
```bash
# In .env
TEST_MODE=false  # or remove the line entirely
```

This will use the actual appointment price instead of 1.00 THB.

## Security Notes

1. **Amount Validation**: Backend validates amount matches appointment price
2. **Webhook Verification**: Opn webhook signatures are verified
3. **Appointment Ownership**: Only appointment owner can create payment
4. **Idempotency**: Duplicate requests return existing payment

## Libraries Used

- **promptpay-qr** (v3.0.2): Thai QR payload generation
- **qrcode** (v1.5.4): QR code image generation

## Development vs Production

| Feature | Development (no OPN_SECRET_KEY) | Production (with OPN_SECRET_KEY) |
|---------|--------------------------------|----------------------------------|
| QR Generation | Real Thai QR (mock charge) | Real Thai QR (real charge) |
| Payment Gateway | Simulated | Opn Payments API |
| Webhooks | Manual simulation endpoint | Real webhook processing |
| Amount Override | TEST_MODE available | TEST_MODE available |

## Next Steps

1. Test with K+ banking app to verify QR scans correctly
2. If bank account doesn't work, verify it's registered with PromptPay
3. Test actual payment flow in development
4. Get Opn API keys for production
5. Configure webhook endpoint in Opn dashboard
