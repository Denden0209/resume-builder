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
