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
