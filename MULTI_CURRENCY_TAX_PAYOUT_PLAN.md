# 🌍 Multi-Currency, Tax & Payout System - Implementation Plan

## 📊 Executive Summary

Complete implementation plan for a global payment system supporting 11 countries with:
- ✅ Multi-currency support (11 currencies)
- ✅ Country-based tax calculations
- ✅ Stripe Connect payouts with 30% platform fee
- ✅ Automatic withholding tax deduction per country
- ✅ Complete audit trail and compliance

---

## 🗺️ Country-Currency-Tax Mapping

| Country | Language | Currency | Code | Tax Type | Rate | Platform Fee |
|---------|----------|----------|------|----------|------|--------------|
| 🇬🇧 UK/USA | en | US Dollar | USD | None (International) | 0% | 30% |
| 🇹🇭 Thailand | th | Thai Baht | THB | Withholding Tax | 3% | 30% |
| 🇻🇳 Vietnam | vi | Vietnamese Dong | VND | Personal Income Tax | 10% | 30% |
| 🇵🇭 Philippines | fil | Philippine Peso | PHP | Withholding Tax | 5-10% | 30% |
| 🇮🇩 Indonesia | id | Indonesian Rupiah | IDR | PPh 21 | 5% | 30% |
| 🇯🇵 Japan | ja | Japanese Yen | JPY | Income Tax | 10.21% | 30% |
| 🇰🇷 South Korea | ko | Korean Won | KRW | Income Tax | 3.3% | 30% |
| 🇩🇪 Germany | de | Euro | EUR | Freelancer Tax | 0% (self-reported) | 30% |
| 🇫🇷 France | fr | Euro | EUR | Freelancer Tax | 0% (self-reported) | 30% |
| 🇮🇹 Italy | it | Euro | EUR | Freelancer Tax | 0% (self-reported) | 30% |
| 🇹🇷 Turkey | tr | Turkish Lira | TRY | Withholding Tax | 20% | 30% |

---

## 🏗️ System Architecture

### Phase 1: Currency Infrastructure ✅ (Already Exists Partially)

**Database Schema:**
```typescript
// psychologistProfiles table
- currency: varchar (default from language mapping)
- pricePerSession: decimal (in psychologist's currency)
- stripeAccountId: varchar (Stripe Connect account)
- stripeAccountCountry: varchar (for tax rules)

// payments table
- amount: decimal
- currency: varchar
- countryCode: varchar (links to tax rules)

// countryTaxRules table ✅ (Already exists!)
- countryCode: varchar
- withholdingRate: decimal
- currency: varchar (NEW)
```

### Phase 2: Currency Helper Library

**File: `client/src/lib/currency.ts`**

```typescript
export const CURRENCY_MAP = {
  en: { code: 'USD', symbol: '$', locale: 'en-US', decimals: 2 },
  th: { code: 'THB', symbol: '฿', locale: 'th-TH', decimals: 2 },
  vi: { code: 'VND', symbol: '₫', locale: 'vi-VN', decimals: 0 },
  fil: { code: 'PHP', symbol: '₱', locale: 'en-PH', decimals: 2 },
  id: { code: 'IDR', symbol: 'Rp', locale: 'id-ID', decimals: 0 },
  ja: { code: 'JPY', symbol: '¥', locale: 'ja-JP', decimals: 0 },
  ko: { code: 'KRW', symbol: '₩', locale: 'ko-KR', decimals: 0 },
  de: { code: 'EUR', symbol: '€', locale: 'de-DE', decimals: 2 },
  fr: { code: 'EUR', symbol: '€', locale: 'fr-FR', decimals: 2 },
  it: { code: 'EUR', symbol: '€', locale: 'it-IT', decimals: 2 },
  tr: { code: 'TRY', symbol: '₺', locale: 'tr-TR', decimals: 2 },
} as const;

export function formatPrice(
  amount: number,
  currencyCode: string,
  locale?: string
): string {
  const currencyInfo = Object.values(CURRENCY_MAP)
    .find(c => c.code === currencyCode);

  return new Intl.NumberFormat(locale || currencyInfo?.locale || 'en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currencyInfo?.decimals || 2,
    maximumFractionDigits: currencyInfo?.decimals || 2,
  }).format(amount);
}

export function getCurrencyByLanguage(langCode: string): CurrencyInfo {
  return CURRENCY_MAP[langCode as keyof typeof CURRENCY_MAP] || CURRENCY_MAP.en;
}
```

---

## 💰 Payment Flow with Tax Calculation

### Scenario Example (Thailand):

**Patient books session with Thai psychologist:**
1. Session price: **1,000 THB**
2. Patient pays: **1,000 THB** (via Stripe Checkout)
3. Platform receives: **1,000 THB**

**Automatic Split Calculation:**
```javascript
// Server-side calculation (server/payments/payout-calculator.ts)

// 1. Platform Fee (30%)
platformFee = 1000 × 0.30 = 300 THB

// 2. Psychologist Gross (70%)
psychologistGross = 1000 × 0.70 = 700 THB

// 3. Withholding Tax (3% for Thailand)
withholdingTax = 700 × 0.03 = 21 THB

// 4. Psychologist Net Payout
psychologistNet = 700 - 21 = 679 THB

// 5. Platform keeps
platformNet = platformFee + withholdingTax = 300 + 21 = 321 THB
```

**Result:**
- ✅ Patient paid: 1,000 THB
- ✅ Platform receives: 321 THB (30% + tax)
- ✅ Psychologist receives: 679 THB (70% - tax)
- ✅ All recorded in `payout_ledger` table

---

## 🔄 Stripe Connect Payout Flow

### Step-by-Step Implementation

**1. Psychologist Onboarding:**
```typescript
// When psychologist registers or connects Stripe
async function connectStripeAccount(psychologistId: string) {
  const psychologist = await getPsychologist(psychologistId);
  const currency = getCurrencyByLanguage(psychologist.languageCode);

  // Create Stripe Connect Express Account
  const account = await stripe.accounts.create({
    type: 'express',
    country: psychologist.country, // e.g., 'TH' for Thailand
    email: psychologist.email,
    capabilities: {
      transfers: { requested: true },
    },
    default_currency: currency.code.toLowerCase(), // 'thb'
  });

  // Save to database
  await updatePsychologist(psychologistId, {
    stripeAccountId: account.id,
    currency: currency.code,
  });
}
```

**2. Payment Collection:**
```typescript
// When patient completes checkout
async function handleCheckoutComplete(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const payment = await getPayment(session.metadata.paymentId);

  // Calculate split with tax
  const split = await calculatePayoutSplit(
    payment.amount,
    payment.psychologistId,
    payment.countryCode
  );

  // Record in payout_ledger
  await createPayoutLedger({
    appointmentId: payment.appointmentId,
    paymentId: payment.id,
    psychologistId: payment.psychologistId,
    countryCode: payment.countryCode,
    amountGross: payment.amount,
    platformFeeRate: 0.30,
    platformFee: split.platformFee,
    psychologistGross: split.psychologistGross,
    withholdingRate: split.withholdingRate,
    withholdingAmount: split.withholdingAmount,
    psychologistNet: split.psychologistNet,
    platformNet: split.platformNet,
    currency: payment.currency,
    status: 'pending_payout',
  });
}
```

**3. Automatic Transfer to Psychologist:**
```typescript
// Trigger after session is completed
async function payoutToPsychologist(appointmentId: string) {
  const ledger = await getPayoutLedger(appointmentId);
  const psychologist = await getPsychologist(ledger.psychologistId);

  if (!psychologist.stripeAccountId) {
    throw new Error('Psychologist has not connected Stripe account');
  }

  // Convert to smallest currency unit (cents, satang, etc.)
  const amount = Math.round(ledger.psychologistNet * 100);

  // Create Stripe Transfer
  const transfer = await stripe.transfers.create({
    amount: amount,
    currency: ledger.currency.toLowerCase(),
    destination: psychologist.stripeAccountId,
    transfer_group: `appointment_${appointmentId}`,
    metadata: {
      appointmentId: appointmentId,
      paymentId: ledger.paymentId,
      psychologistId: ledger.psychologistId,
      grossAmount: ledger.psychologistGross,
      withholdingTax: ledger.withholdingAmount,
      netAmount: ledger.psychologistNet,
    },
  });

  // Update ledger
  await updatePayoutLedger(ledger.id, {
    status: 'paid',
    stripeTransferId: transfer.id,
    paidAt: new Date(),
  });

  console.log(`✅ Paid ${ledger.psychologistNet} ${ledger.currency} to psychologist ${psychologist.id}`);
}
```

---

## 🗂️ Implementation Checklist

### Phase 1: Database & Schema ⏳
- [ ] Add `currency` field to `psychologistProfiles` table
- [ ] Add `currency` field to `countryTaxRules` table
- [ ] Create migration for currency columns
- [ ] Seed `countryTaxRules` with all 11 countries

### Phase 2: Currency Library 📚
- [ ] Create `client/src/lib/currency.ts`
- [ ] Create `server/lib/currency.ts` (shared constants)
- [ ] Add currency helpers to utils
- [ ] Create `formatPrice()` function with i18n support

### Phase 3: Tax Calculation Engine 🧮
- [ ] Create `server/payments/payout-calculator.ts`
- [ ] Implement `calculatePayoutSplit()` function
- [ ] Add country-based tax lookup
- [ ] Add comprehensive tests for all 11 countries

### Phase 4: Stripe Connect Enhancement 💳
- [ ] Update `getOrCreateStripeAccount()` to use country currency
- [ ] Add currency to account creation
- [ ] Implement transfer creation logic
- [ ] Add transfer status webhooks

### Phase 5: Payout Automation 🤖
- [ ] Create `payoutToPsychologist()` function
- [ ] Add trigger after session completion
- [ ] Implement retry logic for failed transfers
- [ ] Add email notifications for payouts

### Phase 6: Admin Dashboard 📊
- [ ] Create payout management page
- [ ] Show pending payouts
- [ ] Show completed payouts with breakdown
- [ ] Add manual payout trigger (for edge cases)
- [ ] Export payout reports (CSV/Excel)

### Phase 7: Frontend Updates 🎨
- [ ] Update all price displays to use `formatPrice()`
- [ ] Show currency based on psychologist's language
- [ ] Add currency indicator on psychologist cards
- [ ] Update checkout to show currency
- [ ] Add earnings breakdown in psychologist dashboard

### Phase 8: Testing & QA 🧪
- [ ] Test payment flow for each currency
- [ ] Verify tax calculations for each country
- [ ] Test Stripe transfers in test mode
- [ ] Load testing for concurrent payouts
- [ ] Edge case testing (refunds, failures, etc.)

### Phase 9: Documentation 📝
- [ ] Tax compliance documentation per country
- [ ] Payout schedule documentation
- [ ] Troubleshooting guide
- [ ] API documentation for payout endpoints

### Phase 10: Deployment 🚀
- [ ] Deploy database migrations
- [ ] Seed production tax rules
- [ ] Enable Stripe Connect in production
- [ ] Monitor first real payouts
- [ ] Set up alerts for failed transfers

---

## 📐 Tax Rules Database Seed

```sql
INSERT INTO country_tax_rules (country_code, country_name, currency, withholding_rate, notes) VALUES
('US', 'United States', 'USD', 0.0000, 'International - No withholding'),
('TH', 'Thailand', 'THB', 0.0300, 'Thailand withholding tax 3%'),
('VN', 'Vietnam', 'VND', 0.1000, 'Vietnam personal income tax 10%'),
('PH', 'Philippines', 'PHP', 0.0800, 'Philippines withholding tax 8%'),
('ID', 'Indonesia', 'IDR', 0.0500, 'Indonesia PPh 21 tax 5%'),
('JP', 'Japan', 'JPY', 0.1021, 'Japan income tax 10.21%'),
('KR', 'South Korea', 'KRW', 0.0330, 'Korea income tax 3.3%'),
('DE', 'Germany', 'EUR', 0.0000, 'EU - Self-reported'),
('FR', 'France', 'EUR', 0.0000, 'EU - Self-reported'),
('IT', 'Italy', 'EUR', 0.0000, 'EU - Self-reported'),
('TR', 'Turkey', 'TRY', 0.2000, 'Turkey withholding tax 20%');
```

---

## 🎯 Success Metrics

- ✅ All 11 currencies supported
- ✅ Automatic tax calculation per country
- ✅ 30% platform fee consistently applied
- ✅ Automatic payouts within 2 days of session completion
- ✅ 99.9% payout success rate
- ✅ Complete audit trail for compliance
- ✅ Real-time earnings visibility for psychologists
- ✅ Tax report generation for year-end filing

---

## 🚨 Risk Mitigation

1. **Currency Conversion:** Keep all transactions in native currency (no conversion)
2. **Tax Changes:** Make tax rules configurable with effective dates
3. **Failed Payouts:** Implement retry mechanism with exponential backoff
4. **Stripe Limits:** Monitor API rate limits and implement queueing
5. **Compliance:** Consult with local tax advisors per country
6. **Audit Trail:** Log every calculation step for transparency

---

## 📞 Next Steps

Would you like me to:
1. ✅ **Start with Phase 1** - Create currency library and helpers
2. ✅ **Start with Phase 2** - Implement tax calculation engine
3. ✅ **Start with Phase 3** - Build Stripe payout automation
4. ✅ **All of the above** - Complete end-to-end implementation

Let me know which phase to prioritize and I'll begin implementation immediately! 🚀
