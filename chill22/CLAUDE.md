# ProMax IPTV — Claude Code Context

## What this project is
Full-stack IPTV reseller management platform for promax-iptv.com.
Built with Next.js 14 (App Router), Supabase, Resend, and d4kpanel API.

## Stack
- **Framework:** Next.js 14 App Router, deployed on Vercel
- **Database & Auth:** Supabase (project: zozkfpthujzbpeyxkgek)
- **Email:** Resend (domain: promax-iptv.com)
- **IPTV Panel:** d4kpanel / drm-cloud API (http://api.drm-cloud.com/api/dev_api.php)
- **Proxy:** QuotaGuard static IPs (54.72.12.1, 54.72.77.249) for d4kpanel IP whitelist

## Supabase Tables
- `clients` — id (= auth user id), full_name, email, created_at
- `subscriptions` — id, client_id, username, password, m3u_url, package_id, status, end_date, created_at
- `orders` — id, client_id, plan_label, amount, status (paid/pending), notes, created_at
- `host_config` — id=1, base_host_url, portal_url

## Key env vars
- NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
- XTREAM_API_BASE_URL / XTREAM_RESELLER_API_KEY
- RESEND_API_KEY / RESEND_FROM_EMAIL
- NEXT_PUBLIC_ADMIN_EMAIL (admin access check)
- QUOTAGUARD_URL (proxy for d4kpanel)

## Routes
- `/` → redirects to /login
- `/login` → shared login for admin + clients (admin goes to /admin, clients go to /dashboard)
- `/dashboard` → client portal (subscription details, payment history)
- `/admin` → overview stats
- `/admin/ai` → AI assistant chat
- `/admin/clients` → client management
- `/admin/orders` → orders management
- `/admin/pnl` → profit & loss calculator
- `/admin/settings` → host config

## Key package IDs
- 16 = "24K_PREMIUM_1 Year" (default)

## Admin check
Admin is identified by email matching NEXT_PUBLIC_ADMIN_EMAIL env var.

## Deploy
Drag unzipped project folder onto vercel.com/new (bypasses GitHub issues).
