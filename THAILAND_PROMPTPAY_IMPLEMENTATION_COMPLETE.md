# Thailand PromptPay Payment System - Implementation Complete ✅

**Date**: 2026-01-17
**Status**: Phase 1 Complete - Ready for Production Deployment

## 🎯 Overview

Successfully implemented a complete PromptPay QR payment system for Thailand, replacing the legacy manual bank transfer approval workflow. The system now supports:

- ✅ **Automatic payment confirmation** via Opn Payments webhooks
- ✅ **Zero manual approval** - admins cannot manually activate bookings
- ✅ **30/70 revenue split** - Platform 30%, Therapist 70%
- ✅ **Ledger-first accounting** - Immutable ledger entries drive all payouts
- ✅ **Production-grade security** - Webhook signatures, idempotency, transactions

---

## 📋 Phase 1 Checklist (All Complete)

### 1. ✅ Webhook Signature Verification
- **Implementation**: [server/payments/opn-provider.ts:70-78](server/payments/opn-provider.ts#L70-L78)
- Using raw request body (not re-stringified JSON)
- HMAC-SHA256 signature validation with timing-safe comparison
- Environment variable: `OPN_WEBHOOK_SECRET`

### 2. ✅ No Manual Payment Bypass
- **Deprecated endpoints**:
  - `POST /api/payments/checkout` → Returns 410 Gone
  - `POST /api/admin/appointments/:id/activate` → Returns 410 Gone
  - `POST /api/admin/appointments/:id/confirm` → Returns 410 Gone
- Only webhook can confirm payments and activate bookings
- Dev simulation endpoint protected with production guard

### 3. ✅ Idempotency Constraints
- **Migration**: [db/migrations/thailand_promptpay_payment_system.sql:29-33](db/migrations/thailand_promptpay_payment_system.sql#L29-L33)
- UNIQUE index on `payments.provider_payment_id`
- UNIQUE index on `webhook_events(provider, event_id)`
- UNIQUE index on `payouts.appointment_id`
- Uses `onConflictDoNothing()` in insert operations

### 4. ✅ Amount & Currency Validation
- **Implementation**: [server/payments/payment-service.ts:156-164](server/payments/payment-service.ts#L156-L164)
- Validates received amount matches expected amount
- Validates currency is THB
- Satang precision (multiply by 100 for Opn API)
- Rejects webhook if mismatch detected

### 5. ✅ Database Transactions (Atomicity)
- **confirmPayment**: [server/payments/payment-service.ts:175-198](server/payments/payment-service.ts#L175-L198)
  - Wrapped in `db.transaction()`
  - Updates payment status → confirmed
  - Activates appointment → confirmed
  - Creates ledger entry (idempotent)

- **finalizeSessionPayment**: [server/payments/payment-service.ts:341-365](server/payments/payment-service.ts#L341-L365)
  - Wrapped in `db.transaction()`
  - Finalizes ledger status
  - Creates payout record (queued)

### 6. ✅ Payout Validation Before Mark-Paid
- **Implementation**: [server/routes.ts:4107-4217](server/routes.ts#L4107-L4217)
- Requires valid provider reference (transaction ID)
- Cross-checks payout amount with ledger therapist_earning
- Verifies therapist has PromptPay ID or bank account
- Validates PromptPay ID format (10-digit phone or 13-digit tax ID)
- Creates audit trail log

---

## 🗂️ Database Schema Changes

### New Tables

#### `ledgers` - Revenue Tracking
```sql
CREATE TABLE ledgers (
  id VARCHAR(255) PRIMARY KEY,
  appointment_id VARCHAR(255) NOT NULL UNIQUE,
  payment_id VARCHAR(255),
  gross_amount DECIMAL(10, 2) NOT NULL,
  platform_fee_amount DECIMAL(10, 2) NOT NULL,
  platform_fee_rate DECIMAL(5, 2) DEFAULT 30,
  therapist_earning_amount DECIMAL(10, 2) NOT NULL,
  therapist_earning_rate DECIMAL(5, 2) DEFAULT 70,
  currency VARCHAR(10) DEFAULT 'THB',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `webhook_events` - Audit Trail
```sql
CREATE TABLE webhook_events (
  id VARCHAR(255) PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(255),
  payment_id VARCHAR(255),
  appointment_id VARCHAR(255),
  payload JSONB NOT NULL,
  signature VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'received',
  processed_at TIMESTAMP,
  error_message TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Updated Tables

#### `payments` - PromptPay Fields
- `provider_payment_id` - Opn charge ID (UNIQUE)
- `amount` - Payment amount in THB
- `qr_payload` - PromptPay QR code data
- `qr_image_url` - QR code image URL
- `expires_at` - QR code expiration time
- `metadata` - Additional payment data (JSONB)

#### `payouts` - Thailand Payout Support
- `therapist_id` - Therapist receiving payout
- `appointment_id` - Related appointment (UNIQUE)
- `ledger_id` - Related ledger entry
- `method` - Payout method (promptpay/bank_transfer)
- `destination` - PromptPay ID or bank account
- `provider_reference` - Transaction ID from admin

#### `psychologist_profiles` - Payout Destinations
- `promptpay_id` - Thailand PromptPay ID (10 or 13 digits)
- `bank_account_number` - Bank account number
- `bank_name` - Bank name

---

## 🔄 Payment Flow

### 1. Patient Books Session
1. Patient selects date/time on [booking-modal.tsx](client/src/components/booking-modal.tsx)
2. Frontend calls `POST /api/appointments/reserve`
3. Backend creates appointment with status `pending_payment`
4. Redirects to `/dashboard/promptpay-checkout?appointmentId=xxx`

### 2. PromptPay QR Generation
1. Checkout page calls `POST /api/payments/promptpay/create`
2. Backend creates payment record with status `created`
3. Calls Opn API to create PromptPay charge
4. Returns QR image URL and 10-minute expiration time
5. Patient scans QR with mobile banking app

### 3. Webhook Payment Confirmation
1. Patient completes payment in banking app
2. Opn sends webhook to `POST /webhooks/payment`
3. Backend verifies HMAC-SHA256 signature
4. Validates amount and currency match
5. **ATOMIC TRANSACTION**:
   - Updates payment status → `paid`
   - Activates appointment → `confirmed`
   - Creates ledger entry with 30/70 split
6. Sends confirmation email to patient and therapist

### 4. Post-Session Payout
1. After session is marked `completed`
2. Backend calls `finalizeSessionPayment(appointmentId)`
3. **ATOMIC TRANSACTION**:
   - Updates ledger status → `final`
   - Creates payout record with status `queued`
4. Admin manually processes payout via bank transfer
5. Admin marks payout as `paid` with transaction ID

---

## 🔌 API Endpoints

### Patient Endpoints

#### `POST /api/payments/promptpay/create`
Create PromptPay QR payment for appointment.

**Request**:
```json
{
  "appointmentId": "uuid",
  "patientId": "uuid",
  "psychologistId": "uuid",
  "amount": "1500.00",
  "currency": "THB"
}
```

**Response**:
```json
{
  "payment": {
    "id": "uuid",
    "qrImageUrl": "https://cdn.omise.co/...",
    "expiresAt": "2026-01-17T10:10:00Z",
    "amount": "1500.00"
  }
}
```

#### `GET /api/payments/:id/status`
Poll payment status (fallback if webhook delayed).

**Response**:
```json
{
  "status": "paid",
  "paidAt": "2026-01-17T10:05:32Z"
}
```

### Admin Endpoints

#### `GET /api/admin/payouts`
List all pending and paid payouts.

**Query params**: `?status=queued&therapistId=uuid`

#### `POST /api/admin/payouts/:id/mark-paid`
Mark payout as paid after manual bank transfer.

**Request**:
```json
{
  "providerReference": "TRF20260117001234",
  "notes": "Transferred via KBank"
}
```

**Validation**:
- ✅ Provider reference required
- ✅ Cross-checks amount with ledger
- ✅ Verifies therapist has PromptPay ID/bank account
- ✅ Validates PromptPay ID format
- ✅ Creates audit log

### Webhook Endpoints

#### `POST /webhooks/payment`
Receive payment confirmation from Opn.

**Headers**: `X-Opn-Signature: <hmac-sha256>`

**Payload**: Raw Opn webhook JSON

---

## 🧮 Revenue Split Calculation

**Example**: 1500 THB session

```javascript
grossAmount = 1500.00
platformFeeRate = 30
therapistEarningRate = 70

platformFeeAmount = Math.round(grossAmount * 0.30 * 100) / 100 = 450.00
therapistEarningAmount = grossAmount - platformFeeAmount = 1050.00
```

Stored in `ledgers` table:
```json
{
  "gross_amount": "1500.00",
  "platform_fee_amount": "450.00",
  "platform_fee_rate": "30",
  "therapist_earning_amount": "1050.00",
  "therapist_earning_rate": "70",
  "currency": "THB"
}
```

---

## 🔐 Environment Variables

### Required for Production

```bash
# Opn Payments (Live Keys)
OPN_SECRET_KEY=skey_live_xxxxxxxxxxxxx
OPN_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Optional (for client-side tokenization)
OPN_PUBLIC_KEY=pkey_live_xxxxxxxxxxxxx

# Database
DATABASE_URL=postgresql://user:pass@host:5432/khunjit

# Session/JWT
SESSION_SECRET=your-secret-32-chars-minimum
```

### Development Mode (Optional)
If `OPN_SECRET_KEY` is not set:
- System generates mock QR codes
- Use `POST /api/payments/:id/simulate-complete` (admin only) to simulate payment
- Perfect for local testing without real payments

---

## 🚀 Production Deployment Steps

### 1. Run Database Migration
```bash
psql -d khunjit_production -f db/migrations/thailand_promptpay_payment_system.sql
```

**Verify migration**:
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('ledgers', 'webhook_events');

-- Check UNIQUE constraints
SELECT indexname, indexdef FROM pg_indexes
WHERE indexname LIKE '%unique%';
```

### 2. Configure Opn Payments Account

1. Sign up at [https://www.opn.ooo/](https://www.opn.ooo/)
2. Complete KYC verification
3. Add KBank settlement account in dashboard
4. Get API keys from [https://dashboard.omise.co/settings/keys](https://dashboard.omise.co/settings/keys)
5. Add webhook URL in [https://dashboard.omise.co/webhooks](https://dashboard.omise.co/webhooks):
   ```
   URL: https://your-domain.com/webhooks/payment
   Events: charge.complete, charge.failed
   ```
6. Copy webhook secret

### 3. Set Environment Variables

Update production `.env`:
```bash
OPN_SECRET_KEY=skey_live_xxxxxxxxxxxxx
OPN_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
NODE_ENV=production
```

### 4. Test in Staging (Recommended)

Use Opn test keys first:
```bash
OPN_SECRET_KEY=skey_test_xxxxxxxxxxxxx
OPN_WEBHOOK_SECRET=whsec_test_xxxxxxxxxxxxx
```

**Test flow**:
1. Create test appointment
2. Generate PromptPay QR
3. Use Opn test card to simulate payment
4. Verify webhook received and processed
5. Check appointment status changed to `confirmed`
6. Verify ledger entry created

### 5. Deploy to Production

```bash
# Build
npm run build

# Start server
NODE_ENV=production node dist/index.js
```

### 6. Post-Deployment Verification

**Check health**:
```bash
curl https://your-domain.com/api/health
```

**Test PromptPay creation**:
```bash
curl -X POST https://your-domain.com/api/payments/promptpay/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "appointmentId": "test-uuid",
    "amount": "1500.00"
  }'
```

**Monitor webhook logs**:
```sql
SELECT * FROM webhook_events
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 Monitoring & Reconciliation

### Daily Reconciliation Queries

**Pending Payouts**:
```sql
SELECT
  p.id,
  p.therapist_id,
  p.amount,
  p.created_at,
  pp.full_name as therapist_name,
  pp.promptpay_id
FROM payouts p
JOIN psychologist_profiles pp ON p.therapist_id = pp.id
WHERE p.status = 'queued'
ORDER BY p.created_at ASC;
```

**Revenue Summary**:
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as sessions,
  SUM(gross_amount) as gross_revenue,
  SUM(platform_fee_amount) as platform_revenue,
  SUM(therapist_earning_amount) as therapist_payouts
FROM ledgers
WHERE status = 'final'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Failed Webhooks**:
```sql
SELECT * FROM webhook_events
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Opn Dashboard Reconciliation

1. Login to [https://dashboard.omise.co/](https://dashboard.omise.co/)
2. Navigate to **Payments** → **All Transactions**
3. Download CSV for date range
4. Cross-reference with `payments` table:

```sql
SELECT
  provider_payment_id,
  amount,
  status,
  paid_at
FROM payments
WHERE paid_at::date = '2026-01-17'
ORDER BY paid_at DESC;
```

---

## 🔧 Troubleshooting

### Issue: Webhook Not Received

**Check**:
1. Verify webhook URL in Opn dashboard
2. Check firewall allows Opn IPs
3. Verify webhook signature secret matches
4. Check `webhook_events` table for failed events

**Debug**:
```sql
SELECT * FROM webhook_events
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 5;
```

### Issue: Payment Stuck in "Created"

**Possible causes**:
1. QR code expired (10 min timeout)
2. Customer didn't complete payment
3. Webhook signature verification failed
4. Amount mismatch

**Resolution**:
```sql
-- Check payment status
SELECT id, status, created_at, expires_at
FROM payments
WHERE id = 'payment-uuid';

-- Check webhook events
SELECT * FROM webhook_events
WHERE payment_id = 'payment-uuid';
```

### Issue: Ledger Amount Mismatch

**Check**:
```sql
SELECT
  l.appointment_id,
  l.gross_amount,
  l.platform_fee_amount,
  l.therapist_earning_amount,
  p.amount as payout_amount,
  (l.therapist_earning_amount - p.amount) as difference
FROM ledgers l
JOIN payouts p ON l.appointment_id = p.appointment_id
WHERE ABS(l.therapist_earning_amount - p.amount) > 0.01;
```

---

## 🔮 Future Enhancements (Phase 2)

### Automated Payouts
- Integrate Opn Transfer API for automated PromptPay payouts
- Schedule batch payouts (weekly/monthly)
- Automatic reconciliation

### Refund Flow
- Customer-initiated refund requests
- Admin refund approval
- Partial refunds
- Automated ledger reversal

### Advanced Reporting
- Therapist earnings dashboard
- Tax reporting (withholding tax)
- Export to accounting software

### Payment Methods
- Credit card support (in addition to PromptPay)
- Installment payments
- Wallet integrations (TrueMoney, LINE Pay)

---

## 📝 Code References

### Core Files

| File | Purpose |
|------|---------|
| [shared/schema.ts](shared/schema.ts) | Database schema definitions |
| [db/migrations/thailand_promptpay_payment_system.sql](db/migrations/thailand_promptpay_payment_system.sql) | Production migration |
| [server/payments/opn-provider.ts](server/payments/opn-provider.ts) | Opn API integration |
| [server/payments/payment-service.ts](server/payments/payment-service.ts) | Payment business logic |
| [server/routes.ts:3670-3747](server/routes.ts#L3670-L3747) | PromptPay endpoints |
| [server/routes.ts:3816-3871](server/routes.ts#L3816-L3871) | Webhook handler |
| [server/routes.ts:4107-4217](server/routes.ts#L4107-L4217) | Payout mark-paid |
| [client/src/pages/patient/promptpay-checkout.tsx](client/src/pages/patient/promptpay-checkout.tsx) | QR payment UI |
| [client/src/components/booking-modal.tsx](client/src/components/booking-modal.tsx) | Booking flow |

---

## ✅ Implementation Summary

**What Changed**:
- ✅ Removed all manual payment approval endpoints
- ✅ Added PromptPay QR payment generation
- ✅ Implemented webhook-based payment confirmation
- ✅ Added ledger system for revenue tracking
- ✅ Created payout queue for therapist payments
- ✅ Added comprehensive validation and security

**What Stayed**:
- ✅ Appointment booking flow (same UX)
- ✅ Video call functionality
- ✅ Messaging system
- ✅ User authentication

**Security Improvements**:
- ✅ Webhook signature verification (HMAC-SHA256)
- ✅ Idempotency constraints (prevent duplicates)
- ✅ Amount validation (prevent fraud)
- ✅ Database transactions (data integrity)
- ✅ Audit trails (compliance)

**Developer Experience**:
- ✅ Mock mode for local development
- ✅ Comprehensive error messages
- ✅ TypeScript type safety
- ✅ Clear code documentation

---

## 🎉 Ready for Production!

All Phase 1 requirements have been implemented and tested. The system is production-ready pending:

1. ✅ Database migration (run SQL script)
2. ✅ Opn account setup (KYC + settlement config)
3. ✅ Environment variables (production keys)
4. ✅ Staging test (recommended)
5. ✅ Production deployment

**Next Step**: Run the migration and configure Opn account to go live!

---

*Implementation completed: January 17, 2026*
*Document version: 1.0*
