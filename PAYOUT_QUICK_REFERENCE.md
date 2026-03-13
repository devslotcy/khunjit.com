# Payout System - Quick Reference Guide 🚀

**For**: Developers, Admins, Support Team
**Status**: Production Ready
**Date**: 2026-01-24

---

## 🎯 What This System Does

**Automatically pays psychologists** after each completed session:
- Patient pays → Platform gets 30% → Psychologist gets 70% (minus tax)
- Tax is withheld based on psychologist's country
- Money transferred instantly to psychologist's Stripe account
- Complete audit trail maintained

---

## 💰 Payment Split Formula

```
Patient Payment: 100%
├─ Platform Fee: 30%
└─ Psychologist Share: 70%
   ├─ Withholding Tax: X% (varies by country)
   └─ Psychologist Net: 70% - Tax ✅ (transferred to Stripe)

Platform Total = Platform Fee + Withholding Tax
```

---

## 🌍 Tax Rates by Country

| Country | Tax | Example: 1000 units → Psychologist gets |
|---------|-----|----------------------------------------|
| 🇺🇸 US, 🇩🇪 DE, 🇫🇷 FR, 🇮🇹 IT | 0% | 700 |
| 🇹🇭 Thailand | 3% | 679 |
| 🇰🇷 South Korea | 3.3% | 677 |
| 🇮🇩 Indonesia | 5% | 665 |
| 🇵🇭 Philippines | 8% | 644 |
| 🇻🇳 Vietnam | 10% | 630 |
| 🇯🇵 Japan | 10.21% | 629 |
| 🇹🇷 Turkey | 20% | 560 |

---

## 🔄 Automatic Flow

1. **Patient pays** via Stripe
2. **Webhook fires** → `payment_intent.succeeded`
3. **System calculates** split (30% + tax)
4. **Stripe Transfer** created to psychologist
5. **Ledger updated** with transfer ID
6. **Psychologist receives** money in their Stripe account

⏱️ **Timeline**: Usually within seconds of payment

---

## 📊 Key Files

### Backend
```
server/payments/
├── payout-calculator.ts    # Tax calculation logic
├── payout-ledger.ts        # Database recording
├── payout-service.ts       # Stripe transfer automation
└── stripe-checkout.ts      # Webhook handlers
```

### Database
```sql
payout_ledger              -- All payout records
country_tax_rules          -- Tax rates per country
psychologist_profiles      -- Stripe account links
```

---

## 🔧 API Endpoints

### For Admins
```bash
# View all payouts
GET /api/admin/payout-ledger?status=pending&limit=50

# Retry failed payout
POST /api/admin/payout-ledger/:appointmentId/retry

# View tax rules
GET /api/admin/tax-rules
```

### For Psychologists
```bash
# Get earnings summary
GET /api/psychologist/payout-stats

# Get pending payouts
GET /api/psychologist/pending-payouts

# Update country (affects tax rate)
PATCH /api/psychologist/profile/country
```

---

## 🚨 Common Issues & Solutions

### Issue: "Payout failed - no Stripe account"
**Solution**: Psychologist needs to connect Stripe account
1. Go to Settings → Payments
2. Click "Connect Stripe Account"
3. Complete Stripe onboarding
4. Admin can retry payout

### Issue: "Transfer failed - insufficient balance"
**Solution**: Platform Stripe account needs funds
1. Check Stripe dashboard balance
2. Ensure platform account has funds
3. Retry payout

### Issue: "Calculation mismatch error"
**Solution**: This should never happen (safety check)
1. Check logs for exact error
2. Verify tax rate in database
3. Contact developer

### Issue: "Duplicate payout prevented"
**Solution**: This is normal (idempotency)
- System detected existing payout
- No action needed
- Check ledger to confirm payout completed

---

## 🔍 Monitoring

### Daily Checks
```bash
# Check pending payouts
SELECT COUNT(*) FROM payout_ledger WHERE payout_status = 'pending';

# Check failed payouts
SELECT COUNT(*) FROM payout_ledger WHERE payout_status = 'failed';

# Today's total payouts
SELECT SUM(psychologist_net::decimal) FROM payout_ledger
WHERE transferred_at::date = CURRENT_DATE;
```

### Health Check
```bash
# All payouts should have status: 'pending' or 'paid'
# 'failed' status requires investigation

# Test calculator
npx tsx server/payments/payout-calculator.test.ts
```

---

## 🛠️ Manual Payout (Emergency)

If automatic payout fails:

```typescript
// 1. Get appointment details
const appointment = await db.select().from(appointments)
  .where(eq(appointments.id, appointmentId));

// 2. Import payout service
import { retryPayout } from './server/payments/payout-service';

// 3. Retry payout
const result = await retryPayout(appointmentId);

// 4. Check result
if (result.success) {
  console.log('✅ Payout successful:', result.transferId);
} else {
  console.error('❌ Failed:', result.error);
}
```

Or via API:
```bash
curl -X POST https://khunjit.com/api/admin/payout-ledger/{appointmentId}/retry \
  -H "Authorization: Bearer {admin-token}"
```

---

## 📈 Example Calculations

### Thailand: 1,500 THB Session
```
Patient pays:        1,500.00 THB
Platform fee (30%):    450.00 THB
Psychologist gross:  1,050.00 THB
Tax withheld (3%):      31.50 THB
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Psychologist NET:    1,018.50 THB ✅ (to Stripe)
Platform TOTAL:        481.50 THB (450 + 31.50)
```

### Turkey: 2,000 TRY Session (highest tax)
```
Patient pays:        2,000.00 TRY
Platform fee (30%):    600.00 TRY
Psychologist gross:  1,400.00 TRY
Tax withheld (20%):    280.00 TRY
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Psychologist NET:    1,120.00 TRY ✅ (to Stripe)
Platform TOTAL:        880.00 TRY (600 + 280)
```

### US: $100 Session (no tax)
```
Patient pays:         100.00 USD
Platform fee (30%):    30.00 USD
Psychologist gross:    70.00 USD
Tax withheld (0%):      0.00 USD
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Psychologist NET:      70.00 USD ✅ (to Stripe)
Platform TOTAL:        30.00 USD
```

---

## 🔐 Security Notes

### What We Store
- ✅ Payment amounts and calculations
- ✅ Stripe transfer IDs
- ✅ Tax breakdown details
- ✅ Timestamps for audit

### What We DON'T Store
- ❌ Credit card numbers
- ❌ Psychologist's bank account details
- ❌ Patient's payment methods

All sensitive data handled by Stripe.

---

## 📞 Troubleshooting Contacts

### For Technical Issues
- Check logs: `tail -f server.log | grep Payout`
- Run tests: `npx tsx server/payments/payout-calculator.test.ts`
- Check Stripe dashboard for transfer details

### For Financial Questions
- Admin panel: View payout ledger
- Stripe dashboard: View transfer history
- Database: Query `payout_ledger` table

### For User Support
**Psychologist asks**: "Where's my money?"
1. Check payout status in admin panel
2. Verify Stripe account is connected
3. Check for error messages in ledger
4. Retry payout if failed

**Patient asks**: "Did psychologist get paid?"
1. Check appointment status is 'confirmed'
2. Verify payment status is 'paid'
3. Check payout ledger for transfer ID
4. Confirm with psychologist if needed

---

## 🎯 Success Indicators

### System is Working Well When:
- ✅ All payouts have status 'paid' within 1 minute of payment
- ✅ No entries with status 'failed'
- ✅ Psychologists report receiving payments
- ✅ Platform fee collected matches ledger
- ✅ Tests continue to pass

### Warning Signs:
- ⚠️ Multiple 'failed' status entries
- ⚠️ Payouts stuck in 'pending' for > 5 minutes
- ⚠️ Calculation errors in logs
- ⚠️ Psychologists reporting missing payments
- ⚠️ Stripe balance not matching ledger

---

## 🔄 Regular Maintenance

### Weekly
- Review failed payouts (should be 0)
- Retry any stuck payouts
- Check Stripe balance

### Monthly
- Export payout ledger for accounting
- Review tax withholding totals
- Reconcile with Stripe transfers
- Update tax rules if laws change

### Quarterly
- Review psychologist feedback
- Check for optimization opportunities
- Update documentation if needed

---

## 📚 Additional Resources

- **Full Documentation**: `STRIPE_PAYOUT_AUTOMATION_COMPLETE.md`
- **Implementation Plan**: `MULTI_CURRENCY_TAX_PAYOUT_PLAN.md`
- **Verification Checklist**: `PAYOUT_SYSTEM_VERIFICATION.md`
- **Stripe Docs**: https://stripe.com/docs/connect/transfers
- **Tax Rules**: See `migrations/010_seed_country_tax_rules.sql`

---

## 🆘 Emergency Procedures

### If All Payouts Fail
1. Check Stripe API status: https://status.stripe.com
2. Verify environment variables (STRIPE_SECRET_KEY)
3. Check database connection
4. Review recent code changes
5. Contact Stripe support if needed

### If Wrong Amount Paid
1. **DO NOT PANIC** - we have complete audit trail
2. Check ledger entry for calculation
3. Verify tax rule in database
4. Check Stripe transfer amount
5. If error confirmed, issue refund/adjustment via Stripe

### If Double Payment Occurs
1. Should be prevented by idempotency check
2. Check logs for duplicate webhook
3. Review payout_ledger for duplicate entries
4. Contact Stripe to reverse transfer if confirmed

---

**Last Updated**: 2026-01-24
**System Version**: 1.0
**Status**: ✅ Production Ready

---

**Quick Reference Card** (Print This!)
```
┌─────────────────────────────────────────┐
│   MENDLY PAYOUT QUICK REFERENCE         │
├─────────────────────────────────────────┤
│ Formula: 30% Platform + Tax             │
│ Psychologist Gets: 70% - Tax            │
├─────────────────────────────────────────┤
│ Thailand: 3% tax → 67.9%                │
│ Turkey:  20% tax → 56%                  │
│ US/EU:    0% tax → 70%                  │
├─────────────────────────────────────────┤
│ Auto: ✅ Instant transfer to Stripe     │
│ Logs: server.log | grep Payout          │
│ Test: npx tsx payout-calculator.test.ts │
├─────────────────────────────────────────┤
│ Retry Failed:                           │
│ POST /api/admin/payout-ledger/:id/retry │
└─────────────────────────────────────────┘
```
