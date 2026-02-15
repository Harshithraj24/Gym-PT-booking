# FIT2FLY - Gym Slot Booking

A modern gym slot booking application for personal trainer Murali. Built with React + Vite, Supabase, and Vercel.

**Live Demo:** [get-fit-with-murali.vercel.app](https://get-fit-with-murali.vercel.app)

## Features

- **Client Booking View** (`/`): Browse available slots and book sessions
- **Trainer Admin Dashboard** (`/admin`): Manage bookings and block slots
- **Email Confirmations**: Automated booking confirmations via Resend
- **Self-Cancellation**: Clients can cancel via email link
- **Slot Blocking**: Admin can block days/slots for holidays or breaks
- **Dark Theme**: Black/red aesthetic with Oswald + Barlow fonts

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    (React + Vite SPA)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Client    │  │   Admin     │  │   Cancel Booking        │  │
│  │   Booking   │  │   Dashboard │  │   Page                  │  │
│  │   View      │  │             │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │                                       │
│                   ┌──────▼──────┐                                │
│                   │  Supabase   │                                │
│                   │  Client     │                                │
│                   └──────┬──────┘                                │
└──────────────────────────┼───────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   SUPABASE    │  │    VERCEL     │  │    RESEND     │
│   PostgreSQL  │  │   Serverless  │  │    Email      │
│               │  │   Functions   │  │    API        │
│  • bookings   │  │               │  │               │
│  • blocked_   │  │  /api/send-   │  │  Confirmation │
│    slots      │  │  confirmation │  │  emails with  │
│  • admin_     │  │               │  │  cancel links │
│    users      │  │               │  │               │
└───────────────┘  └───────────────┘  └───────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, React Router |
| Styling | CSS3 (custom dark theme) |
| Database | Supabase (PostgreSQL) |
| Email | Resend API |
| Hosting | Vercel (static + serverless) |
| Fonts | Google Fonts (Oswald, Barlow) |

## Project Structure

```
fit2fly-booking/
├── api/
│   └── send-confirmation.js   # Vercel serverless function for emails
├── src/
│   ├── components/
│   │   ├── AdminLogin.jsx     # Password protection for admin
│   │   ├── CancelBooking.jsx  # Client self-cancellation page
│   │   ├── ClientBooking.jsx  # Main booking interface
│   │   └── TrainerAdmin.jsx   # Admin dashboard
│   ├── lib/
│   │   └── supabase.js        # Supabase client + all DB functions
│   ├── App.jsx                # Router + layout
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles (dark theme)
├── .env.example               # Environment template
├── vercel.json                # Vercel routing config
└── package.json
```

## Database Schema

### bookings
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| booking_date | DATE | Date of the booking |
| day | TEXT | Day name (e.g., "Monday") |
| slot_id | TEXT | Slot identifier |
| client_name | TEXT | Client's name |
| client_phone | TEXT | Client's phone number |
| client_email | TEXT | Client's email (optional) |
| cancel_token | UUID | Unique token for self-cancellation |
| booked_at | TIMESTAMP | When booking was created |

### blocked_slots
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| blocked_date | DATE | Date to block |
| slot_id | TEXT | Specific slot (NULL = entire day) |
| reason | TEXT | Reason for blocking |
| created_at | TIMESTAMP | When block was created |

## Time Slots

| Slot ID | Name | Time |
|---------|------|------|
| early_morning | Early Morning | 5:30 AM - 7:00 AM |
| morning | Morning | 7:00 AM - 8:30 AM |
| evening | Evening | 5:00 PM - 6:30 PM |
| late_evening | Late Evening | 7:00 PM - 8:30 PM |

**Capacity:** Maximum 3 bookings per slot per day

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | ClientBooking | Public booking interface |
| `/admin` | TrainerAdmin | Password-protected admin dashboard |
| `/cancel/:token` | CancelBooking | Self-cancellation page |

## Implementation Details

### Booking Flow
1. Client selects a date (next 14 days shown)
2. Available slots displayed with remaining capacity
3. Client fills name, phone, email (optional)
4. Booking saved to Supabase
5. Confirmation email sent via Resend API (with cancel link)

### Slot Blocking Flow
1. Admin logs in with password
2. Goes to "Block Slots" tab
3. Selects date, optionally specific slot, adds reason
4. Blocked slots appear as unavailable to clients

### Self-Cancellation Flow
1. Client receives email with unique cancel link
2. Clicks link → arrives at `/cancel/:token`
3. Confirms cancellation
4. Booking deleted from database
5. Slot becomes available again

### Security
- **Admin Access:** Password-protected (stored in env var)
- **Row Level Security:** Enabled on all Supabase tables
- **API Keys:** RESEND_API_KEY stored server-side only
- **CORS:** Configured for API endpoints

## Setup

### 1. Supabase Setup

Create a project at [supabase.com](https://supabase.com), then run this SQL:

```sql
-- Bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_date DATE,
  day TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  cancel_token UUID DEFAULT gen_random_uuid(),
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocked slots table
CREATE TABLE blocked_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date DATE NOT NULL,
  slot_id TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_blocked_slots_date ON blocked_slots(blocked_date);

-- Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can create bookings" ON bookings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can read bookings" ON bookings FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can delete bookings" ON bookings FOR DELETE TO anon USING (true);
CREATE POLICY "Anyone can read blocked_slots" ON blocked_slots FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert blocked_slots" ON blocked_slots FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can delete blocked_slots" ON blocked_slots FOR DELETE TO anon USING (true);
```

### 2. Environment Variables

```env
# .env (local development)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_PASSWORD=your-admin-password

# Vercel (add via CLI or dashboard)
RESEND_API_KEY=re_xxxx
```

### 3. Local Development

```bash
npm install
npm run dev
```

### 4. Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

Add environment variables via Vercel CLI:
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_ADMIN_PASSWORD production
vercel env add RESEND_API_KEY production
```

## Email Setup (Resend)

1. Create account at [resend.com](https://resend.com)
2. Get API key
3. Add `RESEND_API_KEY` to Vercel
4. **Important:** Verify a domain to send to client emails (free tier only sends to account email)

## Screenshots

### Client Booking View
- Date selector (14 days)
- Slot cards with availability
- Booking modal with form

### Admin Dashboard
- Bookings tab with filters
- Block Slots tab for managing availability
- Manage Slots tab for adding/editing/removing time slots
- Stats overview

## Future Features / Roadmap

Potential features to implement in future sessions:

### High Priority
| Feature | Description | Complexity |
|---------|-------------|------------|
| **Booking Reminders** | Auto-send email/SMS 24h and 1h before session | Medium |
| **Waitlist** | When slot is full, clients join waitlist and get notified if spot opens | Medium |
| **No-show Tracking** | Mark clients who didn't show up, track repeat offenders | Easy |
| **Client History** | View booking history per client (repeat visitors, cancellations) | Easy |

### Nice to Have
| Feature | Description | Complexity |
|---------|-------------|------------|
| **Recurring Bookings** | Client books same slot weekly (auto-creates future bookings) | Medium |
| **Google Calendar Sync** | Export bookings to trainer's calendar (.ics export or API) | Medium |
| **WhatsApp Notifications** | Send confirmations via WhatsApp Business API | Medium |
| **Session Packages** | Sell 10-session packs, track remaining sessions per client | Medium |
| **Payment Integration** | Razorpay/Stripe for online payments | Hard |

### Future Expansion
| Feature | Description | Complexity |
|---------|-------------|------------|
| **Client Accounts** | Clients log in to view/manage their own bookings | Hard |
| **Analytics Dashboard** | Busiest days, popular slots, revenue trends, charts | Medium |
| **Multi-trainer Support** | Support for multiple trainers with separate schedules | Hard |
| **PWA / Mobile App** | Make the app installable on phones | Easy |
| **Holiday Calendar** | Auto-block national holidays | Easy |

## License

Private - FIT2FLY by Murali
