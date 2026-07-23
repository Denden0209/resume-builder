# Advanced Resume Online Builder

Upload a resume → AI builds a futuristic live portfolio site → share the link.

## Stack
- **Next.js 14** (App Router) on Vercel
- **Claude API** (`claude-sonnet-4-6`) parses resumes into structured JSON
- **Upstash Redis** stores published pages (`page:{slug}` → data)

## Deploy (10 minutes)

### 1. Push to GitHub
```bash
cd resume-builder
git init
git add .
git commit -m "Launch resume builder MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/resume-builder.git
git push -u origin main
```

### 2. Get an Anthropic API key
- Go to https://platform.claude.com → sign up → API Keys → Create Key
- Add a small amount of credit (each resume parse costs a few cents)

### 3. Import to Vercel
- vercel.com → Add New → Project → import `resume-builder`
- Framework preset: **Next.js** (auto-detected) → Deploy
  (First deploy will error on missing env vars — that's expected, keep going.)

### 4. Add Redis storage
- In your Vercel project → **Storage** tab → **Create Database** → choose
  **Upstash for Redis** (Marketplace) → free plan → Connect to project
- This auto-adds `KV_REST_API_URL` / `KV_REST_API_TOKEN` env vars

### 5. Add the API key
- Project → **Settings → Environment Variables**
- Add `ANTHROPIC_API_KEY` = your key (all environments)

### 6. Redeploy
- **Deployments** tab → ⋯ on the latest → **Redeploy**

Done. Upload a resume on your live URL and publish a page at `/u/your-name`.

## Config
- Site name/tagline: `lib/site.js`
- Parsing model/prompt/schema: `lib/prompt.js` (override model with `PARSE_MODEL` env var)
- Template design: `components/Portfolio.jsx` + `app/globals.css`

## Notes
- Published pages return an `editKey` — POST to `/api/publish` with
  `{ data, slug, editKey }` to update an existing page (UI for this comes in Phase 2).
- No auth yet (Phase 2: Google login + dashboard). No payments yet (Phase 3: Stripe).
- Consider adding rate limiting on `/api/parse` before promoting publicly
  (Vercel Firewall or Upstash Ratelimit) so strangers can't drain your API credit.

## Phase 2 setup — Accounts, Dashboard, Analytics, QR

The app runs fine WITHOUT this (anonymous publishing) — accounts light up when configured.

### 1. Create a Supabase project (free)
- https://supabase.com → New project → any name/region → wait ~1 min
- Project Settings → API → copy the **Project URL** and **anon public key**

### 2. Set up Google OAuth
- https://console.cloud.google.com → create/select a project
- APIs & Services → OAuth consent screen → External → fill app name + your email → Save
- APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application
  - Authorized redirect URI: `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
    (exact value shown in Supabase → Authentication → Providers → Google)
- Copy the Client ID and Client Secret
- In Supabase → Authentication → Providers → Google → enable, paste ID + Secret → Save
- In Supabase → Authentication → URL Configuration:
  - Site URL: `https://your-app.vercel.app`
  - Redirect URLs: add `https://your-app.vercel.app/auth/callback`

### 3. Add env vars in Vercel
- `NEXT_PUBLIC_SUPABASE_URL` = your Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon public key
- Redeploy

### What users get
- **Sign in with Google** (optional — anonymous publishing still works)
- **/dashboard** — every page they published while signed in: views (total + 7-day),
  copy link, QR code download, edit, delete
- Publishing while signed in auto-claims the page to their account
- **QR codes** on the success screen and dashboard (scan with any phone camera)

### Phase 3 candidates
- Stripe + Pro tier (remove badge, custom slug, rich analytics)
- Apple Wallet pass for the QR (requires an Apple Developer account + pass signing)
- Rate limiting on /api/parse (Upstash Ratelimit) — do this before wide promotion

## Security layer

- **Rate limits** (Upstash Ratelimit, sliding window):
  - /api/parse — anonymous: 3/hour per IP; signed-in: 10/hour per account
  - /api/publish — 10/hour per IP
  Limits run BEFORE any AI call; rejected requests cost $0.
- **Input hardening**: magic-byte validation (real PDF/DOCX only), 4MB size cap,
  PDF page cap (10 pages) to block token-bomb files, 200KB publish payload cap.
- **Link sanitization**: only http(s) URLs render as links on published pages;
  emails validated before mailto.
- **Admin auth**: /admin now also accepts a Google sign-in matching OWNER_EMAIL
  (set it in Vercel env vars) — safer than the key-in-URL method.
- **Do these outside the code**:
  1. Anthropic Console → Settings → Limits → set a monthly spend cap + alerts
  2. Vercel → Firewall tab → review bot protection; Attack Challenge Mode exists if needed
  3. Never prefix ANTHROPIC_API_KEY with NEXT_PUBLIC_; never add the Supabase service_role key
- **Later (pre-promotion)**: Cloudflare Turnstile on anonymous uploads.

## Tier infrastructure (Phase 3, step 1)

- Tiers: Free (1 page, 2 parses/mo) and Pro (5 pages, 20 parses/mo) — limits in lib/plans.js
- Regional pricing bands with geo-detection (x-vercel-ip-country): A $8/$19 · B $4/$10 · PH ₱149/₱349
- /pricing — geo-priced page; upgrade CTAs capture founders-list interest (requires sign-in)
- Quota enforcement: parse (monthly per account) + publish (page count) return 402 with upgrade message
- Anonymous parsing tightened to 2 per 24h per IP so accounts are always the better deal
- Manual grants: /admin has a grant form (paste the user's Account ID from their dashboard) —
  for founding members paying via GCash/direct transfer before Stripe exists
- Plan storage: plan:{userId} in Redis {tier, expiresAt}; usage counters usage:{userId}:parses:{YYYY-MM}
- Next: Stripe Checkout + webhook writes plan:{userId}; the enforcement layer is already live

## Stripe setup (Phase 3)

1. stripe.com → create account → toggle **Test mode** while setting up
2. Products → Add product:
   - "Pro Monthly" — recurring $8/month → copy its price ID (price_...)
   - "Pro 90-Day Pass" — one-time $19 → copy its price ID
   - Optional regional prices: duplicates at $4/$10 (band B) and ₱149/₱349 or $2.50/$6 (band C)
3. Vercel env vars:
   - STRIPE_SECRET_KEY (Developers → API keys → Secret key)
   - STRIPE_WEBHOOK_SECRET (next step)
   - STRIPE_PRICE_MONTHLY, STRIPE_PRICE_PASS (+ optional _B/_C variants)
4. Webhook: Developers → Webhooks → Add endpoint
   - URL: https://your-app.vercel.app/api/stripe-webhook
   - Events: checkout.session.completed, customer.subscription.deleted
   - Copy the Signing secret → STRIPE_WEBHOOK_SECRET
5. Redeploy. The pricing page automatically switches from founders-list mode to live checkout.
6. Test with card 4242 4242 4242 4242 in Test mode, then flip to Live keys.

Pro features shipped: AI Bullet Rewriter, build-from-scratch (no resume needed),
PDF + Word resume export (CV-style template), 5 pages, 20 parses/mo.

## New in this build

- **PH pricing fixed** — Philippines shows ₱300/mo, ₱600 pass (billed USD-equivalent, Option B).
  Test any country's pricing with /pricing?cc=PH (or ?cc=US, ?cc=MY, etc.)
- **Publish as new page** — when editing/tailoring, choose "Update this page" (same link)
  or "Publish as new page" (separate link — for job-tailored versions; respects page limit)
- **JSON editor hidden** — only visible to OWNER_EMAIL; regular users get clean field editing
- **Rename link** (Pro) — vanity URLs from the dashboard; collision-safe, warns old link breaks
- **Admin subscribers** — /admin now lists active paying users, plan type, and expiry
- **New subscription email** — enable in Stripe → Settings → Business → Notifications →
  toggle "Successful payments" to your email (no code; most reliable). This emails you on every sale.

## New-subscription email (60-second setup, no code)
Stripe Dashboard → Settings → Notifications (or Business settings → Emails) →
enable email on successful payments → sent to your Stripe account email.
For a different inbox, add it under Team/notifications.

## Legal pages
- /privacy and /terms — edit company details in ONE place: lib/legal.js
  (company name, product name, domain, support email, jurisdiction, effective date)
- Linked from the footer on every page (components/SiteFooter.jsx)
- Written to match actual practice: uploaded resumes are NOT retained; only published
  pages are stored; Google auth via Supabase; payments via Stripe.
- Have a lawyer review before scaling — these are a solid honest baseline, not legal advice.

## Cloudflare Turnstile (bot protection) — setup
The app runs fine without it; protection activates once these env vars exist.

1. dash.cloudflare.com → **Turnstile** (left sidebar) → **Add widget**
2. Widget name: Personal Site · Domain: personalsite.io (add www too if used)
3. Widget mode: **Managed** (invisible for most humans)
4. Create → copy the **Site Key** and **Secret Key**
5. Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = site key
   - `TURNSTILE_SECRET_KEY` = secret key
6. Redeploy

Behavior: anonymous uploads must pass the challenge before any AI call is made
(rejected = $0 cost). Signed-in users skip it. Verification fails closed.
