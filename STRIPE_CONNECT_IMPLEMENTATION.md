# Stripe Connect Implementation Guide

## Overview

This document describes the complete Stripe Connect integration for the Mendly psychologist marketplace platform. The system enables:

1. **Patient Payments**: Patients pay via credit card through Stripe
2. **Automatic Commission Distribution**: Platform automatically takes a commission (e.g., 30%)
3. **Psychologist Payouts**: Remaining amount (70%) is automatically transferred to psychologists via Stripe Connect

## Architecture

### Payment Flow

```
Patient → Stripe Payment Intent → Platform Account
                                       ↓
                          (Destination Charge with Application Fee)
                                       ↓
                    Platform Commission (30%) | Psychologist Payout (70%)
                           ↓                              ↓
                    Platform Balance              Psychologist's Stripe Account
```

### Key Components

1. **Stripe Connect Express Accounts**: Each psychologist gets their own Stripe Express account
2. **Destination Charges**: Payment goes to platform, then automatically splits to psychologist
3. **Account Onboarding**: Psychologists complete KYC via Stripe-hosted forms
4. **Webhook Sync**: Keep local database in sync with Stripe account status

## Database Schema

### New Fields in `psychologist_profiles` Table

```sql
stripe_account_id          VARCHAR(255)     -- Stripe Connect account ID
stripe_onboarding_status   VARCHAR(50)      -- NOT_CONNECTED | INCOMPLETE | ACTIVE
charges_enabled            BOOLEAN          -- Can accept charges
payouts_enabled            BOOLEAN          -- Can receive payouts
requirements_due           JSONB            -- Currently due requirements
last_stripe_sync_at        TIMESTAMP        -- Last sync with Stripe
```

## API Endpoints

### 1. Start Onboarding
**POST** `/api/stripe/connect/start`

Creates a Stripe Express account (if needed) and returns an onboarding link.

**Authentication**: Required (psychologist role)

**Request**: No body required

**Response**:
```json
{
  "url": "https://connect.stripe.com/setup/s/...",
  "accountId": "acct_xxxxxxxxxxxxx"
}
```

**Error Responses**:
- `503`: Stripe Connect not configured
- `404`: Psychologist profile not found
- `500`: Failed to create account or link

**Usage**: Called when psychologist clicks "Connect with Stripe" button

---

### 2. Refresh Onboarding Link
**POST** `/api/stripe/connect/refresh`

Generates a new onboarding link for incomplete accounts.

**Authentication**: Required (psychologist role)

**Request**: No body required

**Response**:
```json
{
  "url": "https://connect.stripe.com/setup/s/..."
}
```

**Error Responses**:
- `400`: No Stripe account found (must use /start first)
- `500`: Failed to create link

**Usage**: Called when:
- User returns from expired onboarding link
- User clicks "Complete Setup" for incomplete account

---

### 3. Get Account Status
**GET** `/api/stripe/connect/status`

Retrieves current account status from Stripe and syncs local database.

**Authentication**: Required (psychologist role)

**Request**: No parameters

**Response**:
```json
{
  "enabled": true,
  "stripeAccountId": "acct_xxxxxxxxxxxxx",
  "chargesEnabled": true,
  "payoutsEnabled": true,
  "currentlyDue": [],
  "status": "ACTIVE"
}
```

**Status Values**:
- `NOT_CONNECTED`: No Stripe account exists
- `INCOMPLETE`: Account exists but onboarding not complete or requirements due
- `ACTIVE`: Fully onboarded and operational

**Usage**: Called when:
- Component loads
- User returns from Stripe onboarding
- Polling for status updates

---

### 4. Get Dashboard Link
**GET** `/api/stripe/connect/dashboard`

Creates a login link to Stripe Express Dashboard.

**Authentication**: Required (psychologist role)

**Request**: No parameters

**Response**:
```json
{
  "url": "https://connect.stripe.com/express/acct_xxxxxxxxxxxxx"
}
```

**Error Responses**:
- `400`: No Stripe account found
- `500`: Failed to create login link

**Usage**: Called when psychologist clicks "Manage on Stripe" button

---

## Webhook Handler

### Endpoint
**POST** `/webhooks/stripe`

**Authentication**: Signature verification (STRIPE_WEBHOOK_SECRET)

### Events Handled

#### 1. `account.updated`
Triggered when a Connect account is updated (e.g., verification status changes).

**Action**: Syncs account status to local database

#### 2. `capability.updated`
Triggered when account capabilities change (charges_enabled, payouts_enabled).

**Action**: Updates local capabilities flags

#### 3. `account.application.deauthorized`
Triggered when a psychologist disconnects their Stripe account.

**Action**: Removes stripe_account_id and resets status to NOT_CONNECTED

### Webhook Setup

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://khunjit.com/webhooks/stripe`
3. Select events:
   - `account.updated`
   - `capability.updated`
   - `account.application.deauthorized`
4. Copy webhook signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`

## Frontend Components

### StripeConnectCard Component

**Location**: [`client/src/components/stripe-connect-card.tsx`](client/src/components/stripe-connect-card.tsx)

**Features**:
- Shows current connection status with badge
- Displays appropriate message based on state
- Action buttons for each state
- Handles return from Stripe onboarding
- Debug information in development mode

**States**:

#### NOT_CONNECTED
- Badge: Gray "Not Connected"
- Description: "To receive your earnings, connect your Stripe payout account..."
- Button: "Connect with Stripe"

#### INCOMPLETE
- Badge: Yellow "Action Required"
- Description: "Your Stripe account needs more information..."
- Button: "Complete Setup"

#### ACTIVE
- Badge: Green "Active"
- Description: "Your Stripe account is active. Earnings will be paid out..."
- Button: "Manage on Stripe"

### Integration

Added to psychologist profile page at [`client/src/pages/profile.tsx:638`](client/src/pages/profile.tsx#L638):

```tsx
{profile?.role === "psychologist" && <StripeConnectCard />}
```

## Translations

### English (`client/src/i18n/en.json`)
```json
{
  "profile": {
    "stripeConnect": {
      "title": "Payment Account",
      "description": "Connect your Stripe account to receive payouts",
      "notConnected": {
        "status": "Not Connected",
        "description": "To receive your earnings, connect your Stripe payout account. You will enter details securely on Stripe.",
        "button": "Connect with Stripe"
      },
      "incomplete": {
        "status": "Action Required",
        "description": "Your Stripe account needs more information. Please complete the required steps to enable payouts.",
        "button": "Complete Setup"
      },
      "active": {
        "status": "Active",
        "description": "Your Stripe account is active. Earnings will be paid out to this account.",
        "button": "Manage on Stripe"
      },
      "errors": {
        "notConfigured": "Stripe Connect is not configured. Please contact support.",
        "connectionFailed": "Failed to connect to Stripe. Please try again.",
        "statusFailed": "Failed to get account status. Please try again."
      }
    }
  }
}
```

### Turkish (`client/src/i18n/tr.json`)
Complete Turkish translations provided (see file).

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Stripe Connect Configuration
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
PLATFORM_URL=http://localhost:5055
```

### Stripe Dashboard Setup

1. **Enable Connect**
   - Go to [Stripe Connect Settings](https://dashboard.stripe.com/connect/accounts/overview)
   - Enable Express accounts

2. **Get API Keys**
   - Go to [API Keys](https://dashboard.stripe.com/apikeys)
   - Copy Secret Key (starts with `sk_test_` or `sk_live_`)

3. **Set up Webhook**
   - See [Webhook Handler](#webhook-handler) section above

4. **Branding (Optional)**
   - Go to [Branding Settings](https://dashboard.stripe.com/settings/branding)
   - Upload logo and set brand colors

## Payment Implementation (Future)

The current implementation focuses on onboarding and account management. To implement actual payments:

### 1. Create Payment Intent with Destination Charge

Use the `createPaymentIntentWithDestination` function in [`server/stripe-connect.ts`](server/stripe-connect.ts):

```typescript
import * as stripeConnect from './stripe-connect';

// When patient books appointment
const amount = 1000; // $10.00 (in cents)
const platformFee = 300; // $3.00 platform commission (30%)

const result = await stripeConnect.createPaymentIntentWithDestination(
  amount,
  'usd',
  psychologistStripeAccountId,
  platformFee,
  {
    appointmentId: appointment.id,
    patientId: patient.id,
  }
);

if (result.success && result.paymentIntent) {
  // Send client_secret to frontend for payment confirmation
  return {
    clientSecret: result.paymentIntent.client_secret,
  };
}
```

### 2. Frontend Payment Form

Use Stripe Elements to collect payment:

```tsx
import { Elements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_...');

function CheckoutForm({ clientSecret }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentElement />
      <button>Pay Now</button>
    </Elements>
  );
}
```

### 3. Handle Payment Success

Listen for `payment_intent.succeeded` webhook:

```typescript
case 'payment_intent.succeeded':
  const paymentIntent = event.data.object;
  // Update appointment status to confirmed
  // Create ledger entry for commission split
  // Notify psychologist
  break;
```

## Testing

### Test Mode

1. Use test API keys (starts with `sk_test_`)
2. Use [Stripe test card numbers](https://stripe.com/docs/testing#cards)
3. Test onboarding: Stripe provides test documents

### Common Test Scenarios

#### 1. Successful Onboarding
- Create account
- Complete onboarding with test data
- Verify status becomes ACTIVE

#### 2. Incomplete Account
- Create account
- Skip some onboarding steps
- Verify status shows INCOMPLETE with requirements

#### 3. Webhook Processing
- Use [Stripe CLI](https://stripe.com/docs/stripe-cli) to trigger test webhooks:
```bash
stripe trigger account.updated
```

#### 4. Account Deauthorization
- Disconnect account from Stripe Dashboard
- Verify local database resets

## Security Considerations

1. **Never expose Secret Key**: Only use server-side
2. **Verify webhook signatures**: Always validate `stripe-signature` header
3. **Use HTTPS**: Stripe requires HTTPS for production webhooks
4. **Validate user permissions**: Ensure psychologists can only access their own accounts
5. **Rate limiting**: Consider adding rate limits to prevent abuse

## Error Handling

### Common Errors

#### "Stripe Connect not configured"
- Cause: `STRIPE_SECRET_KEY` not set
- Solution: Add key to `.env`

#### "Webhook signature verification failed"
- Cause: Invalid `STRIPE_WEBHOOK_SECRET`
- Solution: Copy correct secret from Stripe Dashboard

#### "Account not found"
- Cause: Trying to refresh before creating account
- Solution: Use `/api/stripe/connect/start` first

## Monitoring

### Key Metrics to Track

1. **Onboarding completion rate**: % of psychologists who complete setup
2. **Account status distribution**: NOT_CONNECTED vs INCOMPLETE vs ACTIVE
3. **Webhook processing time**: Track latency
4. **Failed webhooks**: Monitor and retry

### Logging

The implementation includes detailed logging:

```
[Stripe Connect] Creating Express account for psychologist xxx
[Stripe Connect] Account xxx status: ACTIVE
[Stripe Webhook] Received event: account.updated (evt_xxx)
[Stripe Webhook] Processing account update: acct_xxx
```

## Support & Troubleshooting

### Psychologist Can't Complete Onboarding

1. Check if account is in `INCOMPLETE` state
2. Review `requirements_due` field for missing information
3. Generate new onboarding link via `/refresh` endpoint
4. Check Stripe Dashboard for verification issues

### Webhooks Not Working

1. Verify webhook endpoint is publicly accessible
2. Check `STRIPE_WEBHOOK_SECRET` is correct
3. Review webhook logs in Stripe Dashboard
4. Ensure rawBody is available in Express

### Payouts Not Working

1. Verify `payouts_enabled` is `true`
2. Check if requirements are due
3. Review Stripe account balance
4. Confirm bank account is verified

## Future Enhancements

1. **Multi-currency support**: Handle different currencies per psychologist's location
2. **Custom payout schedules**: Allow psychologists to choose payout frequency
3. **Earnings dashboard**: Show detailed breakdown of earnings and fees
4. **Refund handling**: Implement automatic refund processing
5. **Subscription support**: For ongoing therapy packages
6. **Invoice generation**: Automatic invoice creation for tax purposes

## Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Express Accounts Guide](https://stripe.com/docs/connect/express-accounts)
- [Destination Charges](https://stripe.com/docs/connect/destination-charges)
- [Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Testing Connect](https://stripe.com/docs/connect/testing)

## Summary

This implementation provides a complete foundation for:
- ✅ Psychologist onboarding to Stripe Connect
- ✅ Account status management and sync
- ✅ Webhook processing for real-time updates
- ✅ Multi-language UI (EN/TR)
- ✅ Secure authentication and authorization
- ✅ Production-ready error handling

The next step is to implement the actual payment flow using destination charges to enable end-to-end credit card payments with automatic commission distribution.
