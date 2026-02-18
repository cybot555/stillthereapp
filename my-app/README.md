# Still There

Still There is a QR-based attendance tracking system built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Features

- Google OAuth login with Supabase Auth
- Protected instructor dashboard
- Create a session and generate live QR code
- Public scan page for student attendance submission
- Real-time attendance updates in dashboard
- Active/inactive QR state with end-session control
- Session history page
- Optional image uploads (session cover + attendance proof)

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, Storage, Realtime)
- QR generation: `qrcode`

## Project Structure

```text
app/
  (auth)/login/page.tsx
  auth/callback/route.ts
  dashboard/page.tsx
  history/page.tsx
  scan/[token]/page.tsx
components/
  auth/google-signin-button.tsx
  dashboard/*
  layout/top-navbar.tsx
  scan/attendance-scan-form.tsx
  ui/*
lib/
  actions/*
  supabase/*
  types/*
  data.ts
supabase/
  schema.sql
middleware.ts
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env.local
```

3. Fill `.env.local` with your Supabase credentials:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (usually `http://localhost:3000`)

4. In Supabase Dashboard:

- Create a project
- Enable Google provider in `Authentication > Providers`
- Set redirect URL to:
  - `http://localhost:3000/auth/callback`
- Run SQL from `supabase/schema.sql`
- Ensure buckets exist:
  - `session-covers`
  - `attendance-proofs`

5. Run development server:

```bash
npm run dev
```

Open `http://localhost:3000/login`.

## Notes

- `/dashboard` and `/history` are protected in `middleware.ts`.
- Only session owners can manage their sessions.
- `/scan/[token]` is public for students.
- Realtime listens for inserts on `public.attendance`.

## Production Checklist

- Update `NEXT_PUBLIC_SITE_URL` to your deployed domain
- Add production callback URL in Supabase Google OAuth settings
- Keep service role key server-side only
