# KhunJit - Mental Health Platform

A comprehensive telemedicine platform connecting patients with licensed psychologists for online therapy sessions.

## Features

- **Patient Portal**: Browse psychologists, book appointments, video sessions
- **Psychologist Dashboard**: Manage availability, view earnings, conduct sessions
- **Admin Panel**: Verify practitioners, manage payments, view analytics
- **Video Calling**: Secure WebRTC-based video consultations
- **Payment Processing**: Integrated bank transfer and online payment support
- **Mobile Apps**: Native iOS and Android apps with React Native

## Tech Stack

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens with secure storage
- **Real-time**: WebSocket signaling for video calls

### Frontend (Web)
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **UI**: Tailwind CSS + shadcn/ui components
- **Build**: Vite

### Mobile
- **Framework**: React Native with Expo
- **Navigation**: React Navigation
- **State**: Zustand + TanStack Query
- **UI**: Custom components with Ionicons

## Project Structure

```
KhunJit/
├── server/           # Backend API
│   ├── routes.ts     # API endpoints
│   ├── db.ts         # Database connection
│   ├── storage.ts    # Data access layer
│   └── email/        # Email templates
├── client/           # Web frontend
│   └── src/
│       ├── pages/    # Route components
│       └── components/
├── mobile/           # React Native app
│   └── src/
│       ├── screens/  # Mobile screens
│       ├── hooks/    # API hooks
│       └── store/    # State management
├── shared/           # Shared types
│   └── schema.ts     # Database schema
└── scripts/          # Automation scripts
    └── qa-validation.sh
```

## Documentation

### Development Guides
- [Design Guidelines](design_guidelines.md) - UI/UX standards and component patterns
- [Availability System](AVAILABILITY_SYSTEM.md) - Psychologist scheduling implementation
- [Bank Transfer Flow](BANK_TRANSFER_IMPLEMENTATION.md) - Payment processing guide
- [Verification Workflow](VERIFICATION_WORKFLOW.md) - Admin approval process

### Testing & QA
- **[QA Release Report](RELEASE_QA_REPORT.md)** - Comprehensive test results for profile edit feature
- **[QA Summary](QA_SUMMARY.md)** - Executive summary and approval status
- **[QA Validation Script](scripts/qa-validation.sh)** - Automated endpoint testing
- **[Proof Verification](PROOF_VERIFICATION.md)** - Dashboard endpoint verification with concrete evidence

### Implementation Docs
- [Psychologist Dashboard Alignment](PSYCHOLOGIST_DASHBOARD_ALIGNMENT.md) - Mobile-web data sync implementation
- [500 Error Fix](FIX_500_ERROR.md) - Troubleshooting guide

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Expo CLI (for mobile)

### Backend Setup
```bash
npm install
cp .env.example .env
# Configure database and secrets in .env
npm run db:push
npm run dev
```

### Web Frontend
```bash
cd client
npm install
npm run dev
```

### Mobile App
```bash
cd mobile
npm install
npm start
```

## Running Tests

### Automated QA Tests
```bash
# Without authentication (unauthenticated endpoint tests)
./scripts/qa-validation.sh

# With authentication (full test suite)
AUTH_TOKEN=<your-jwt-token> ./scripts/qa-validation.sh
```

The QA script validates:
- ✅ Endpoint existence and authentication
- ✅ Input validation (birth dates, bio length)
- ✅ Profile update operations
- ✅ Psychologist stats endpoint (if authenticated as psychologist)
- ✅ Upcoming appointments endpoint
- ✅ Code validation checks (date handling, validation logic)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Login
- `GET /api/user` - Get current user

### Patient Endpoints
- `GET /api/psychologists` - List verified psychologists
- `GET /api/psychologist/:id` - Psychologist details
- `POST /api/appointments` - Book appointment
- `GET /api/appointments` - User appointments
- `GET /api/appointments/upcoming` - Upcoming appointments (sorted by startAt)
- `PATCH /api/profile` - Update profile

### Psychologist Endpoints
- `GET /api/psychologist/stats` - Dashboard stats (todaySessions, weeklyEarnings, totalPatients, pendingAppointments)
- `GET /api/psychologist/availability` - Get availability schedule
- `POST /api/psychologist/availability` - Update availability
- `GET /api/psychologist/profile` - Get psychologist profile

### Admin Endpoints
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/psychologists/pending` - Pending verifications
- `POST /api/admin/psychologist/:id/verify` - Approve psychologist
- `GET /api/admin/bank-transfers` - Payment review queue

## Key Features Implementation

### Psychologist Dashboard (Web + Mobile Aligned)
The mobile and web dashboards now share the same backend endpoints and calculations:

**Stats Endpoint**: `GET /api/psychologist/stats`
- `todaySessions`: Count of confirmed appointments today
- `weeklyEarnings`: Sum of `providerPayout` from payments table this week
- `totalPatients`: Unique patient count across all appointments
- `pendingAppointments`: Count of appointments awaiting approval

**Upcoming Sessions**: `GET /api/appointments/upcoming`
- Filters by `startAt >= today` (not scheduledAt)
- Status filter: confirmed, ready, payment_pending, payment_review, pending_approval
- Sorted by startAt ascending
- Limited to 5 results
- Enriched with patient/psychologist details

**Video Call Join Window**:
- Enabled 10 minutes before session start
- Available until 15 minutes after start
- Status must be: confirmed, ready, or in_session

### Profile Management
- Fields: phone, birthDate, gender, city, profession, bio, timezone
- Validation:
  - Birth date: 1900-01-01 to today
  - Bio: max 500 characters
  - Phone: min 10 characters
- Web and mobile share same `PATCH /api/profile` endpoint
- Real-time synchronization across platforms

### Date Handling
- Backend stores all dates in UTC
- Frontend displays in local timezone
- Turkish locale formatting (date-fns)
- Safe fallbacks for invalid dates ("Tarih bilgisi yok")

## Security

- JWT-based authentication
- Role-based access control (patient, psychologist, admin)
- Profile ownership verification
- Input validation on all endpoints
- SQL injection prevention (Drizzle ORM)
- Audit logging for admin actions

## Contributing

When making changes:
1. Update relevant documentation
2. Run QA validation script
3. Test on both web and mobile platforms
4. Ensure backward compatibility

## License

Proprietary - All rights reserved

---

**Status**: ✅ Production Ready
**Last Updated**: 2026-01-16
