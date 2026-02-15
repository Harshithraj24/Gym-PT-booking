# FIT2FLY - Gym Slot Booking

A gym slot booking application for trainer Murali. Built with React + Vite and Supabase.

## Features

- **Client Booking View** (`/`): Clients can view available slots and book their sessions
- **Trainer Admin View** (`/admin`): Trainer can view, filter, and manage all bookings
- 4 daily time slots: Early Morning, Morning, Evening, Late Evening
- Maximum 3 bookings per slot
- Dark theme with black/red aesthetic

## Tech Stack

- React 19 + Vite
- Supabase (Database + Auth)
- React Router
- Oswald + Barlow fonts

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

### 2. Create the Database Table

Run this SQL in the Supabase SQL Editor:

```sql
-- Create the bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster queries
CREATE INDEX idx_bookings_day_slot ON bookings(day, slot_id);

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (book a slot)
CREATE POLICY "Anyone can create bookings"
  ON bookings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Anyone can read (to see availability counts)
CREATE POLICY "Anyone can read bookings"
  ON bookings
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Only authenticated users can delete (trainer)
-- For simplicity, we allow anon delete too.
-- In production, add proper auth.
CREATE POLICY "Anyone can delete bookings"
  ON bookings
  FOR DELETE
  TO anon
  USING (true);
```

### 3. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Deployment on Vercel

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

### Option 2: Deploy via GitHub

1. Push your code to GitHub (see commands below)
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

### Environment Variables on Vercel

In Vercel Dashboard:
1. Go to your project Settings
2. Navigate to Environment Variables
3. Add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

## Git Commands

```bash
# Initialize git repository (already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: FIT2FLY booking app"

# Add GitHub remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/fit2fly-booking.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Time Slots

| Slot | Time |
|------|------|
| Early Morning | 5:30 AM - 7:00 AM |
| Morning | 7:00 AM - 8:30 AM |
| Evening | 5:00 PM - 6:30 PM |
| Late Evening | 7:00 PM - 8:30 PM |

## Routes

- `/` - Client booking view
- `/admin` - Trainer admin dashboard

## License

Private - FIT2FLY by Murali
