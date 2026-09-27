# Product Price Tracker

## Stack
- Frontend: React + Vite → deploy to Vercel
- Backend: Node.js + Express → deploy to Render
- Database: Supabase (Postgres)
- Scraping: axios + cheerio (lightweight HTTP), Playwright available for headed-mode recording only
- Scheduling: external cron (cron-job.org) hitting `POST /api/scrape/run` every 2 hours

## 1. Before writing code
Open https://demo.inelabteamdev.com in devtools and inspect the actual HTML:
whether product/price data is in the initial response or loaded via JS, the
real class names for price/stock, how "options" (variants) are marked up, and
the product-ID pattern in the URL. Update the selectors in
`backend/src/scraper.js` (marked with `NOTE`) to match — the ones shipped here
are placeholders.

## 2. Database
1. Create a Supabase project.
2. Run `backend/schema.sql` in the Supabase SQL editor.
3. Copy your project URL and service role key.

## 3. Backend setup
```
cd backend
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, CRON_SECRET
npm install
npm run dev
```
Runs on http://localhost:3001.

## 4. Frontend setup
```
cd frontend
cp .env.example .env   # set VITE_API_BASE to your backend URL
npm install
npm run dev
```

## 5. Scheduling
Deploy backend to Render. In cron-job.org, create a job that sends:
```
POST https://your-backend.onrender.com/api/scrape/run
Header: x-cron-secret: <same value as CRON_SECRET in .env>
```
Schedule: every 2 hours. This avoids relying on an always-on process, since
Render's free tier sleeps.

## 6. Headed-mode recording
```
cd backend
npm install playwright
npx playwright install chromium
npm run headed -- https://demo.inelabteamdev.com/product/<some-id>
```
This opens a visible browser window and logs how it handles a slow/failing
load and retries — record your screen while running this for the deliverable.

## 7. Deploy
- Backend → Render (Node service, `npm start`, set the same env vars).
- Frontend → Vercel (set `VITE_API_BASE` to the Render URL).
- Add at least 2–3 tracked products via the UI once both are live, and let
  the cron run unattended for a while before submitting so the history/log
  reflect real runs.

## Environment variables
| Variable | Where | Purpose |
|---|---|---|
| SUPABASE_URL | backend | Supabase project URL |
| SUPABASE_SERVICE_KEY | backend | Supabase service role key |
| CRON_SECRET | backend | Shared secret to authorize `/api/scrape/run` |
| STORE_BASE_URL | backend | Mock store base URL |
| VITE_API_BASE | frontend | Backend API base URL |

## Design note (fill in before submitting)
Document: how you made scraping reliable (retries, backoff, async-wait,
validation against garbage data), trade-offs made, and — since AI tools were
used to help write this — what the AI got wrong on the first pass and how you
fixed it.
