# PromaxIP — Client Portal

## What this does
- Admin panel (`/admin`) — add a client → auto-creates account on your Xtream/d4kpanel via API → saves to database → emails credentials automatically
- Client dashboard (`/dashboard`) — client logs in, sees their username/password/M3U URL and current portal link
- Host control — update the portal URL once in the admin panel, every client dashboard reflects it instantly

## Setup Steps

### 1. Environment Variables (on Vercel)
Go to your Vercel project → Settings → Environment Variables, and add every variable from `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings → API (keep secret!)
- `XTREAM_API_BASE_URL` — `http://api.drm-cloud.com/api/dev_api.php`
- `XTREAM_RESELLER_API_KEY` — your reseller API key from d4kpanel
- `RESEND_API_KEY` — from resend.com after signup
- `RESEND_FROM_EMAIL` — an email on a domain you verify in Resend
- `ADMIN_EMAIL` and `NEXT_PUBLIC_ADMIN_EMAIL` — your admin login email (same value, set both)

### 2. Create your admin user
In Supabase Dashboard → Authentication → Users → Add User, create a user with your admin email and a password. This is how you'll log in to `/admin`.

### 3. Deploy
Push this code to GitHub, then import the repo into Vercel. It will auto-deploy.

### 4. Connect your domain
In Vercel project → Settings → Domains → add your domain → follow the DNS instructions shown (point your domain's DNS records to Vercel).

### 5. Test
- Go to `yourdomain.com/login` → log in with your admin account → go to `/admin`
- Add a test client → check that the email arrives
- Log out → log in as that test client at `/login` → check `/dashboard` shows their info

## Notes
- Manual activation flow: you (the admin) trigger account creation after confirming payment yourself. No payment gateway is connected yet.
- All client passwords for their **portal login** are randomly generated; clients use "forgot password" if needed (to be added).
- The IPTV username/password (for watching channels) come directly from the Xtream API response and are shown in their dashboard + email.
