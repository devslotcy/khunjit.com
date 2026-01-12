# Design Guidelines: Online Psychology Platform

## Design Approach

**Selected System:** Material Design with Healthcare Adaptations
**Justification:** Healthcare platforms require trust, accessibility, and clarity. Material Design provides robust component patterns for complex workflows (booking, payments, video sessions) while maintaining professional credibility essential for mental health services.

**Core Principles:**
- Trust through transparency: Clear status indicators, explicit payment breakdowns, visible professional credentials
- Calm, focused interface: Minimal distractions during sensitive interactions
- Accessibility-first: WCAG AA compliance minimum, clear focus states, sufficient contrast
- Progressive disclosure: Show complexity only when needed

---

## Typography

**Font Stack:**
- Primary: Inter (Google Fonts) - body text, UI elements
- Accent: Manrope (Google Fonts) - headings, psychologist bios

**Hierarchy:**
- H1: 2.5rem/3rem (40px/48px), semibold - Dashboard titles
- H2: 2rem (32px), semibold - Section headers
- H3: 1.5rem (24px), medium - Card titles, psychologist names
- H4: 1.25rem (20px), medium - Subsections
- Body: 1rem (16px), regular - All content
- Small: 0.875rem (14px) - Labels, metadata, timestamps
- Tiny: 0.75rem (12px) - Helper text, badges

**Line Heights:** 1.5 for body, 1.2 for headings

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 1, 2, 4, 6, 8, 12, 16
- Micro spacing (within cards): p-4, gap-2
- Standard spacing (between elements): p-6, gap-4, mb-8
- Section spacing: py-12, py-16
- Page margins: px-4 (mobile), px-6 (tablet), px-8 (desktop)

**Grid System:**
- Max container width: max-w-7xl (1280px)
- Dashboard layout: Sidebar (280px) + Main content (flex-1)
- Card grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

**Responsive Breakpoints:**
- Mobile: base (< 640px)
- Tablet: md: 768px
- Desktop: lg: 1024px
- Wide: xl: 1280px

---

## Component Library

### Navigation
**Sidebar (Dashboard):**
- Fixed left sidebar (280px width)
- Logo at top (h-16)
- Navigation items with icons (Heroicons)
- User profile card at bottom
- Active state: Subtle background fill
- Collapsible on mobile (hamburger icon)

**Top Bar:**
- Height: h-16
- Logo + breadcrumbs (left)
- Notifications + user avatar (right)
- Search bar (psychologist discovery only)

### Cards
**Psychologist Card:**
- Aspect ratio container for profile photo (1:1, rounded-lg)
- Name (H3), credentials, specialties (tags)
- Price display (prominent but not aggressive)
- Rating stars + review count
- "View Profile" button

**Appointment Card:**
- Timeline indicator (left border: reserved=amber, confirmed=green, completed=gray)
- Date/time (bold), psychologist name
- Status badge (top-right)
- Action buttons (Join/Cancel) based on state
- Payment status indicator if pending

**Stats Card (Admin/Psychologist):**
- Large number (3rem, semibold)
- Label beneath (0.875rem)
- Subtle icon (top-right)
- Optional trend indicator

### Forms
**Input Fields:**
- Label above input (0.875rem, medium, mb-1)
- Input height: h-12
- Border radius: rounded-lg
- Padding: px-4
- Focus ring (2px offset)
- Error state: Red border + helper text below
- Icons inside inputs (right side for dropdowns, left for search)

**Buttons:**
- Primary: Height h-12, px-6, rounded-lg, semibold text
- Secondary: Same size, outlined style
- Ghost: Text only with hover background
- Disabled: Reduced opacity (0.5)
- Icons paired with text where helpful (Heroicons)

### Specialty Components

**Slot Picker (Booking):**
- Calendar week view (7 days horizontal scroll)
- Time slots as clickable pills (h-10, rounded-md)
- Selected state: Filled background
- Disabled/booked: Opacity 0.3, cursor-not-allowed
- Current time indicator

**Video Session Interface:**
- Full viewport on entry
- Video feeds: Remote (large), Local (corner PiP, draggable)
- Bottom control bar: Mute, Camera, End Call, Chat toggle
- Controls appear on hover, auto-hide after 3s
- Minimal chrome during session for focus

**Payment Breakdown:**
- Table-like structure with label-value pairs
- Right-aligned numbers
- Divider before totals
- Bold total amount
- VAT breakdown clearly visible
- Platform fee shown transparently

**Message Thread:**
- Sender's messages: Right-aligned, filled background
- Received messages: Left-aligned, outlined
- Max width: max-w-md
- Timestamp below (0.75rem, muted)
- Avatar for psychologist messages
- Report button (subtle, icon-only) on hover

**Status Badges:**
- Rounded-full, px-3, py-1, text-xs, font-medium
- Reserved: Amber
- Confirmed: Green
- Completed: Gray
- Cancelled: Red
- Pending: Blue

### Data Display

**Table (Admin):**
- Striped rows (subtle zebra)
- Sticky header (when scrolling)
- Row height: h-14
- Actions column (right): Icon buttons
- Sortable columns: Arrow indicator
- Pagination at bottom

**Timeline (Session History):**
- Vertical line connecting events
- Circle markers for each session
- Date + session details
- Hover to show session notes (psychologist only)

---

## Images

**Profile Photos:**
- Psychologist cards: 96×96px, rounded-lg, object-cover
- User avatars: 40×40px, rounded-full
- Detailed profile page: 200×200px, rounded-xl

**Hero Section (Landing/Marketing Pages Only):**
- Large background image: Calm, professional therapy setting
- Image treatment: Subtle gradient overlay for text readability
- Hero text over image with blurred background containers for CTAs

**Trust Indicators:**
- Professional certification badges (SVG icons)
- University/institution logos (if applicable)

**Empty States:**
- Illustration placeholders for "No appointments yet", "No messages"
- Simple, line-art style illustrations (unDraw library recommended)

---

## Page-Specific Layouts

**Patient Dashboard:**
- Hero section: "Welcome back [Name]" + Quick actions (Find Psychologist, Upcoming Sessions)
- Grid: Upcoming appointments (left 2/3) + Quick stats (right 1/3)
- Recent messages preview (full width below)

**Psychologist Dashboard:**
- Stats row: Today's sessions, This week's earnings, Total patients (3-column grid)
- Calendar view: Week schedule with booked slots
- Availability quick-edit toggle

**Admin Dashboard:**
- Metrics overview: 4-column grid (Users, Sessions Today, Revenue, Pending Verifications)
- Recent activity feed
- Quick action cards

**Psychologist Discovery (Patient):**
- Filter sidebar (left, 280px): Specialties, Languages, Price, Availability
- Results grid: 3 columns on desktop, responsive
- Sort dropdown (top-right)

**Booking Flow:**
1. Psychologist details + availability calendar (side-by-side)
2. Selected slot confirmation + payment breakdown
3. Payment form (centered, max-w-md)
4. Success screen with session details

**Video Session Page:**
- Minimal UI: Full-screen video, controls overlay
- No sidebar during active session
- Emergency exit button (always visible top-left)

---

## Critical UX Patterns

**Payment Flow:**
- Always show complete breakdown before final payment
- Clear "Payment Required" states with call-to-action
- Lock UI elements that require payment with disabled state + tooltip

**Appointment States:**
- Visual progression: Reserved → Pending Payment → Confirmed → Ready to Join → In Session → Completed
- Clear CTAs at each stage ("Pay Now", "Join Session", etc.)
- Countdown timer for reserved slots

**Verification Indicators:**
- Verified psychologists: Checkmark badge next to name
- Unverified: "Pending verification" label (subtle, not alarming)

**Error States:**
- Inline validation (real-time)
- Toast notifications for system errors (top-right)
- Retry mechanisms clearly presented