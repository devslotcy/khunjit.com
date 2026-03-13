# Bank Transfer Payment System Implementation

## Overview
Implemented a complete bank transfer (havale/EFT) payment system with manual admin approval workflow for MindWell platform.

## Implementation Summary

### 1. Database Schema Updates
**File:** [shared/schema.ts](shared/schema.ts)

- Added new appointment status: `payment_review` - for appointments where patient has submitted bank transfer notification
- Created `bankTransfers` table with fields:
  - `appointmentId`, `patientId`, `psychologistId`
  - `referenceCode` - unique code for tracking (format: MW-XXXXXXXX)
  - Bank details: `bankName`, `accountHolder`, `iban`, `amount`, `currency`
  - Status tracking: `status` (pending_review, approved, rejected)
  - Review info: `reviewedBy`, `reviewedAt`, `rejectionReason`, `adminNotes`

### 2. Frontend Components

#### Bank Transfer Checkout Page
**File:** [client/src/pages/patient/bank-transfer-checkout.tsx](client/src/pages/patient/bank-transfer-checkout.tsx)

Features:
- Order summary card showing appointment details
- Bank transfer information card with:
  - Bank name (display only)
  - Account holder name
  - IBAN with copy-to-clipboard functionality
  - Reference code (MW-XXXXXXXX) with copy button
- Amount display
- "Transferi Gerçekleştirdim" submission button
- Clear instructions and process explanation

#### Admin Bank Transfers Management Page
**File:** [client/src/pages/admin/bank-transfers.tsx](client/src/pages/admin/bank-transfers.tsx)

Features:
- List of all pending bank transfers
- Each transfer shows:
  - Patient and psychologist names
  - Reference code
  - Appointment date/time
  - Transfer amount
  - Bank details (with IBAN copy button)
  - Submission date
- Actions:
  - "Ödemeyi Onayla" (Approve Payment) button
  - "Reddet" (Reject) button
- Approval/rejection dialog with:
  - Rejection reason field (required for rejection)
  - Admin notes field (optional)
- Status badges for tracking

#### Updated Components
**Files:**
- [client/src/components/booking-modal.tsx](client/src/components/booking-modal.tsx)
  - Changed button text to "Randevu Al ve Ödemeye Geç"
  - Redirects to bank transfer checkout after reservation

- [client/src/components/appointment-card.tsx](client/src/components/appointment-card.tsx)
  - Added "Ödeme İncelemede" status label
  - Added border color styling for payment_review status

### 3. Backend API Endpoints
**File:** [server/routes.ts](server/routes.ts)

#### Patient Endpoints
- `POST /api/appointments/bank-transfer/submit`
  - Creates bank transfer record
  - Updates appointment status to `payment_review`
  - Generates reference code
  - Creates audit log

#### Admin Endpoints
- `GET /api/admin/bank-transfers/pending`
  - Returns all bank transfers with status "pending_review"
  - Enriched with appointment and patient/psychologist info

- `POST /api/admin/bank-transfers/:id/review`
  - Approve: Updates transfer status, changes appointment to "confirmed", creates payment record
  - Reject: Updates transfer status, cancels appointment with rejection reason
  - Creates audit logs for both actions

### 4. Storage Layer Updates
**File:** [server/storage.ts](server/storage.ts)

Added methods:
- `getBankTransferByAppointment(appointmentId)` - Fetch transfer by appointment
- `createBankTransfer(transfer)` - Create new bank transfer record
- `updateBankTransfer(id, data)` - Update transfer status/details
- `getAllPendingBankTransfers()` - Get all transfers pending review

### 5. Navigation Updates
**File:** [client/src/components/layouts/dashboard-layout.tsx](client/src/components/layouts/dashboard-layout.tsx)

- Added "Havale Ödemeleri" menu item to admin navigation with Building2 icon

**File:** [client/src/App.tsx](client/src/App.tsx)

- Added route: `/dashboard/bank-transfer-checkout`
- Added route: `/admin/bank-transfers`

## User Flow

### Patient Flow
1. Patient selects psychologist and chooses date/time
2. Clicks "Randevu Al ve Ödemeye Geç"
3. Redirected to bank transfer checkout page showing:
   - Appointment summary
   - Bank account details (İş Bankası, IBAN: TR33 0006 4000 0011 2345 6789 01)
   - Reference code (MW-XXXXXXXX)
4. Patient performs bank transfer using their banking app
5. Patient clicks "Transferi Gerçekleştirdim"
6. Appointment status changes to "payment_review"
7. Patient sees appointment as "Ödeme İncelemede" in their appointments

### Psychologist Flow
1. Psychologist sees appointment in their dashboard with "Ödeme İncelemede" status
2. Cannot start session until admin approves payment

### Admin Flow
1. Admin navigates to "Havale Ödemeleri" in menu
2. Sees list of pending bank transfers
3. Reviews each transfer:
   - Checks bank account to verify payment received
   - Matches reference code
4. Admin approves or rejects:
   - **Approve:** Appointment becomes "confirmed", patient and psychologist can proceed
   - **Reject:** Appointment cancelled, patient notified with reason

## Status Workflow

```
Booking → reserved
  ↓
Patient clicks "Randevu Al ve Ödemeye Geç"
  ↓
Redirected to checkout page
  ↓
Patient submits "Transferi Gerçekleştirdim"
  ↓
payment_review (visible to patient & psychologist, but session locked)
  ↓
Admin reviews in /admin/bank-transfers
  ↓
  ├─ Approve → confirmed (session can start)
  └─ Reject → rejected (appointment cancelled)
```

## Bank Information (Configurable)
Current settings (can be moved to database for dynamic configuration):
- Bank Name: İş Bankası
- Account Holder: MindWell Teknoloji A.Ş.
- IBAN: TR33 0006 4000 0011 2345 6789 01

## Security Features
- Reference codes are unique per appointment
- Only the patient who made the appointment can submit transfer notification
- Admin authentication required for approval/rejection
- Audit logs created for all bank transfer actions
- Transfer status prevents duplicate submissions

## Features Implemented
✅ Bank transfer checkout page with order summary
✅ IBAN copy-to-clipboard functionality
✅ Reference code generation and display
✅ Admin approval/rejection interface
✅ Status tracking throughout workflow
✅ Appointment status updates (payment_review)
✅ Payment record creation on approval
✅ Rejection reason and admin notes
✅ Audit logging for compliance
✅ Psychologist panel displays payment_review appointments
✅ Navigation menu updated with admin link

## Next Steps (Future Enhancements)
- Email notifications to patients when payment is approved/rejected
- SMS notifications for real-time updates
- Automatic payment matching using bank API integration
- Payment receipt generation
- Configurable bank account settings in admin panel
- Payment history and reports
- Refund workflow for rejected/cancelled appointments

## Files Created
1. `client/src/pages/patient/bank-transfer-checkout.tsx` - Checkout page
2. `client/src/pages/admin/bank-transfers.tsx` - Admin review page
3. `BANK_TRANSFER_IMPLEMENTATION.md` - This documentation

## Files Modified
1. `shared/schema.ts` - Database schema
2. `server/storage.ts` - Storage layer
3. `server/routes.ts` - API endpoints
4. `client/src/App.tsx` - Routing
5. `client/src/components/booking-modal.tsx` - Booking flow
6. `client/src/components/appointment-card.tsx` - Status display
7. `client/src/components/layouts/dashboard-layout.tsx` - Navigation

## Testing Checklist
- [ ] Patient can complete booking and reach checkout page
- [ ] IBAN copy button works correctly
- [ ] Reference code copy button works correctly
- [ ] Submit button creates bank transfer record
- [ ] Appointment status changes to payment_review
- [ ] Admin can see pending transfers
- [ ] Admin can approve payment (appointment becomes confirmed)
- [ ] Admin can reject payment (appointment becomes rejected/cancelled)
- [ ] Psychologist sees payment_review appointments
- [ ] Payment record is created on approval
- [ ] Audit logs are created for all actions
