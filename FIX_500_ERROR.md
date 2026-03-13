# Fix for 500 Error on "Randevu Al ve Ödemeye Geç"

## Problem
When clicking the "Randevu Al ve Ödemeye Geç" button, a 500 Internal Server Error occurs.

## Root Cause
The backend API endpoint `/api/appointments/reserve` calls a PostgreSQL function `reserve_appointment_slot()` that doesn't exist in the database. This function is required for atomic appointment reservation to prevent double-booking.

## Solution

### Step 1: Run the Database Migration
Execute the following command to create the missing PostgreSQL function:

```bash
npm run db:migrate
```

This will create the `reserve_appointment_slot()` function that handles atomic appointment reservation with conflict detection.

### Step 2: Verify the Fix
1. Start the development server: `npm run dev`
2. Log in as a patient
3. Browse psychologists and select one
4. Choose a date and time slot
5. Click "Randevu Al ve Ödemeye Geç"
6. You should be redirected to the bank transfer checkout page

## What the Migration Does

The migration creates a PostgreSQL function that:
- Checks for overlapping appointments atomically
- Prevents double-booking by detecting slot conflicts
- Creates the appointment with status 'reserved'
- Returns the appointment ID

## Complete Bank Transfer Flow

After this fix, the complete flow will work as follows:

### 1. Patient Makes Reservation
- Patient selects psychologist, date, and time
- Clicks "Randevu Al ve Ödemeye Geç"
- System creates reservation with status: `reserved`
- Patient is redirected to: `/dashboard/bank-transfer-checkout?appointmentId=xxx`

### 2. Checkout Page
Patient sees:
- **Order Summary Card**: Psychologist name, date/time, duration, price
- **Bank Transfer Info Card**:
  - Bank name: İş Bankası (display only)
  - Account holder: MindWell Teknoloji A.Ş.
  - IBAN: TR33 0006 4000 0011 2345 6789 01 (with copy button)
  - Reference code: MW-XXXXXXXX (with copy button)
  - Transfer amount

Patient actions:
1. Performs bank transfer using their banking app
2. Clicks "Transferi Gerçekleştirdim" button

### 3. Backend Processing
When "Transferi Gerçekleştirdim" is clicked:
- POST request to `/api/appointments/bank-transfer/submit`
- Creates bank transfer record with status: `pending_review`
- Updates appointment status to: `payment_review`
- Creates audit log

### 4. Psychologist Panel
- Psychologist sees appointment with "Ödeme İncelemede" status
- Cannot start session until payment is approved

### 5. Admin Review (Admin Panel → Havale Ödemeleri)
Admin sees list of pending transfers with:
- Patient name
- Psychologist name
- Reference code
- Date/time
- Amount
- Bank details
- Submission date

Admin actions:
- **Approve**:
  - Appointment status changes to `confirmed`
  - Payment record is created
  - Patient and psychologist can proceed with session

- **Reject**:
  - Appointment status changes to `rejected`
  - Can add rejection reason
  - Patient is notified

### 6. Session Ready
Once admin approves:
- Appointment becomes `confirmed`
- At session time, "Katıl" button becomes active
- Video session can start

## Status Workflow

```
User selects slot
    ↓
reserved (10 min temporary hold)
    ↓
User clicks "Randevu Al ve Ödemeye Geç"
    ↓
Redirects to checkout page
    ↓
User clicks "Transferi Gerçekleştirdim"
    ↓
payment_review (visible to all, but locked)
    ↓
Admin reviews in /admin/bank-transfers
    ↓
    ├─ Approve → confirmed (session can start)
    └─ Reject → rejected (appointment cancelled)
```

## Files Involved

### Created:
- `db/migrations/create_reserve_appointment_function.sql` - PostgreSQL function
- `db/run-migration.ts` - Migration runner script
- `FIX_500_ERROR.md` - This documentation

### Already Exist (No Changes Needed):
- `client/src/pages/patient/bank-transfer-checkout.tsx` - Checkout UI
- `client/src/pages/admin/bank-transfers.tsx` - Admin review panel
- `client/src/components/booking-modal.tsx` - Booking flow
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database layer
- `shared/schema.ts` - Database schema

## Testing Checklist

After running the migration, verify:
- [ ] Patient can select date/time without errors
- [ ] Clicking "Randevu Al ve Ödemeye Geç" redirects to checkout
- [ ] Checkout page displays correctly
- [ ] IBAN copy button works
- [ ] Reference code copy button works
- [ ] "Transferi Gerçekleştirdim" creates transfer record
- [ ] Appointment appears in psychologist panel as "Ödeme İncelemede"
- [ ] Admin can see transfer in "Havale Ödemeleri"
- [ ] Admin can approve transfer
- [ ] After approval, appointment status becomes "confirmed"
- [ ] Admin can reject transfer with reason

## Troubleshooting

### If migration fails:
```bash
# Check if you're connected to the database
psql $DATABASE_URL -c "SELECT 1"

# Run migration manually
psql $DATABASE_URL < db/migrations/create_reserve_appointment_function.sql
```

### If you still get 500 errors:
1. Check server logs: Look for error messages in console
2. Verify database connection: Check `.env` file has correct `DATABASE_URL`
3. Check if psychologist is verified: Only approved psychologists can receive bookings

### Database Schema Requirements:
The migration requires these tables to exist:
- `appointments` (should already exist from schema)
- `psychologist_profiles` (should already exist from schema)

## Next Steps (Optional Enhancements)

Future improvements to consider:
- Email notifications to patients on approval/rejection
- SMS notifications for real-time updates
- Automatic payment matching via bank API
- PDF receipt generation
- Admin configurable bank account settings
- Payment history and reporting
- Refund workflow for cancelled appointments
