# 🧠 Khunjit — Online Psychology Platform

A telemedicine platform for psychology and mental health services. Patients can book sessions and attend video consultations with licensed psychologists through a secure WebRTC-powered interface.

## Features

- **WebRTC Video Calls** — peer-to-peer encrypted video sessions
- **Doctor Panel** — manage schedule, patients, session notes
- **Patient Panel** — book appointments, join sessions, view history
- **Appointment System** — calendar-based scheduling with availability slots
- **Secure Auth** — role-based access (doctor / patient / admin)
- **Session Notes** — doctors can add private notes after each session

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Video:** WebRTC + Socket.io (signaling server)
- **Database:** PostgreSQL
- **Auth:** NextAuth.js (role-based)
- **Styling:** Tailwind CSS

## Architecture

```
Patient → Books Appointment → Joins Video Room (WebRTC) → Doctor
                                      ↓
                              Session Notes (DB)
```

## Roles

| Role | Access |
|------|--------|
| Patient | Book, join sessions, view history |
| Doctor | Manage schedule, notes, patient records |
| Admin | Full platform management |

## Setup

```bash
git clone https://github.com/devslotcy/khunjit.com
cd khunjit.com
npm install
cp .env.example .env.local
npm run dev
```

---

Built by [Mucahit Tiglioglu](https://github.com/devslotcy)
