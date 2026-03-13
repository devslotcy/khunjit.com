# Stripe Checkout Implementation Guide

## Overview

This document describes the Stripe Checkout integration that replaces the previous QR code payment system. The new system supports:
- Credit/debit card payments via Stripe Checkout
- Country-based tax/withholding calculation for psychologist payouts
- Automated payment confirmation via webhooks
- Payout ledger for financial tracking

## Architecture

### Payment Flow

```
1. Patient books appointment → status: reserved
2. Patient clicks "Pay" → POST /api/payments/checkout
3. Server creates Stripe Checkout Session
4. Patient redirected to Stripe Checkout page
5. Patient completes payment on Stripe
6. Stripe sends checkout.session.completed webhook
7. Server marks payment as PAID, appointment as CONFIRMED
8. Server creates payout_ledger entry with tax breakdown
9. Patient redirected to success page
```

### Database Schema Changes

New tables added:
- `country_tax_rules`: Country-based withholding tax rates
- `payout_ledger`: Detailed revenue split with tax breakdown

Modified tables:
- `psychologist_profiles`: Added `country_code` field
- `payments`: Added `stripe_checkout_session_id`, `stripe_payment_intent_id` fields

## Configuration

### Required Environment Variables

```bash
# Stripe API Keys (REQUIRED)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx  # or sk_test_ for testing
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Platform URL (REQUIRED - must be HTTPS in production)
PLATFORM_URL=https://khunjit.com
```

### Stripe Webhook Setup

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL: `https://khunjit.com/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `account.updated`
   - `capability.updated`
   - `account.application.deauthorized`
5. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Plesk Configuration

The webhook endpoint is already configured. Ensure your Plesk "Additional Apache directives" proxies to Node:

```apache
ProxyPass /webhooks/stripe http://localhost:5055/webhooks/stripe
ProxyPassReverse /webhooks/stripe http://localhost:5055/webhooks/stripe
```

## Database Migration

Run the migration to add new tables and fields:

```bash
# From project root
psql $DATABASE_URL < migrations/009_stripe_checkout_integration.sql
```

Or if using drizzle:
```bash
npm run db:push
```

## API Endpoints

### Patient Endpoints

#### Create Checkout Session
```
POST /api/payments/checkout
Body: { appointmentId: string }
Returns: { checkoutUrl: string, sessionId: string, breakdown: {...} }
```

### Admin Endpoints

#### Get Country Tax Rules
```
GET /api/admin/tax-rules
Returns: Array of tax rules
```

#### Create/Update Tax Rule
```
POST /api/admin/tax-rules
Body: { countryCode, countryName, withholdingRate, notes }
```

#### Delete Tax Rule
```
DELETE /api/admin/tax-rules/:countryCode
```

#### Get Payout Ledger
```
GET /api/admin/payout-ledger
Query: { status, limit, offset }
Returns: { entries: [...], totals: {...} }
```

### Psychologist Endpoints

#### Update Country Code
```
PATCH /api/psychologist/profile/country
Body: { countryCode: "US" }
```

### Public Endpoints

#### Get Countries List
```
GET /api/countries
Returns: [{ code, name, withholdingRate }]
```

## Test Plan

### 1. Webhook Endpoint Health Check

```bash
# Should return 404 (GET not allowed)
curl -I https://khunjit.com/webhooks/stripe

# Should return pong message
curl -X POST https://khunjit.com/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"ping":true}'
```

Expected: `{"ok":true,"message":"Pong! Webhook endpoint is working."}`

### 2. Health Check

```bash
curl https://khunjit.com/api/health
```

Expected: Server health response

### 3. Test Booking Flow

1. Login as patient
2. Navigate to Find Psychologist
3. Select a psychologist and pick date/time
4. Click "Book Appointment"
5. On payment page, click "Pay $XX.XX"
6. Should redirect to Stripe Checkout
7. Use test card: `4242 4242 4242 4242`
8. Complete payment
9. Should redirect to success page
10. Appointment should show as "Confirmed"

### 4. Test Webhook Processing

After payment, verify in database:
```sql
-- Check payment status
SELECT id, status, stripe_checkout_session_id, paid_at
FROM payments
WHERE appointment_id = 'xxx';

-- Check payout ledger
SELECT * FROM payout_ledger WHERE appointment_id = 'xxx';

-- Check appointment status
SELECT id, status FROM appointments WHERE id = 'xxx';
```

### 5. Test Country Tax Rules

```bash
# Get all tax rules
curl -H "Cookie: ..." https://khunjit.com/api/admin/tax-rules

# Add new rule
curl -X POST https://khunjit.com/api/admin/tax-rules \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{"countryCode":"GB","countryName":"United Kingdom","withholdingRate":"0"}'
```

## Tax Calculation Example

For a $50 session with a Turkish psychologist (15% withholding):

```
Session Price:        $50.00
Platform Fee (30%):   $15.00
Psychologist Gross:   $35.00
Withholding (15%):    $5.25
Psychologist Net:     $29.75
Platform Net:         $15.00
```

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint is accessible:
   ```bash
   curl -X POST https://khunjit.com/webhooks/stripe -d '{"ping":true}'
   ```

2. Check Stripe Dashboard for webhook delivery logs

3. Verify `STRIPE_WEBHOOK_SECRET` matches the webhook signing secret

### Payment Stuck in Pending

1. Check webhook_events table for errors:
   ```sql
   SELECT * FROM webhook_events
   WHERE status = 'failed'
   ORDER BY created_at DESC;
   ```

2. Manually trigger webhook processing if needed

### Stripe Connect Not Working

1. Ensure psychologist has completed onboarding
2. Check `charges_enabled` and `payouts_enabled` flags
3. Verify country code is set on psychologist profile

## Future Improvements (TODO)

1. **Automatic Payouts**: Implement Stripe Connect transfers to automatically pay psychologists
2. **Multi-currency**: Support multiple currencies based on patient location
3. **Invoice Generation**: Generate PDF invoices for payments
4. **Refund Automation**: Implement automated refund processing via Stripe

## Files Modified

### Backend
- `shared/schema.ts` - Added new tables and fields
- `server/routes.ts` - Added checkout and admin endpoints
- `server/index.ts` - Updated webhook handler
- `server/payments/stripe-checkout.ts` - New checkout service
- `server/payments/index.ts` - Updated exports

### Frontend
- `client/src/pages/patient/payment.tsx` - Replaced QR with Stripe Checkout
- `client/src/pages/patient/booking-success.tsx` - Updated success page

### Database
- `migrations/009_stripe_checkout_integration.sql` - Migration script

### Config
- `.env.example` - Updated with new variables
