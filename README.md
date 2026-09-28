# INE Price Tracker

A React and Express application that scrapes product cards from the INE demo
store and lets you download the extracted catalog rows as CSV. Scraping uses
Playwright.

## Requirements

- Node.js and npm
- A PostgreSQL database; Supabase Postgres is supported
- Playwright Chromium for browser-based store access

## Database setup

Create a PostgreSQL database and run [`database/schema.sql`](database/schema.sql)
against it. The schema is used by the separate tracked-product price history
job; catalog-card extraction does not write to the database.

## Local development

Install and configure the backend in one terminal:

```sh
cd backend
npm install
npx playwright install chromium
```

Create `backend/.env` with the database connection string. The other settings
are optional:

```dotenv
SUPABASE_DB_URL=postgresql://user:password@host:5432/database
PORT=5000
STORE_BASE_URL=https://demo.inelabteamdev.com
SCRAPE_TIMEOUT=30000
SCRAPE_RETRIES=3
HEADLESS=true
```

Start the API:

```sh
npm run dev
```

The API listens on `http://localhost:5000` by default. In another terminal,
configure and start the frontend:

```sh
cd frontend
npm install
```

Create `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:5000
```

Then run:

```sh
npm run dev
```

Vite prints the frontend URL when it starts.

## Backend commands

Run these from `backend/`:

| Command | Purpose |
|---|---|
| `npm run dev` | Start the API with Node watch mode |
| `npm start` | Start the API normally |
| `npm run scrape` | Run one scrape job immediately, then exit |
| `npm run headed` | Run the hard-coded demo product scrape in a visible browser |

## Catalog scraper

The main page has a **Scrape catalog** button. It reads product cards across
the store's catalog pages and displays product name, brand, SKU, numeric product
ID, and item URL. The ID is extracted from the SKU (for example,
`SK-2381-QU` becomes `/item/2381`). Use **Get price** on a row to load that
product's live price and stock. **Track** adds it to the scheduled set.
**Download CSV** exports all visible rows, including any current or latest
tracked price and stock.

The UI calls `POST /api/scrape/catalog` to collect card data and
`POST /api/scrape/product` to load a single current quote. Catalog card data
does not require a database. Tracking and scheduled price history do.

## Tracked-product scheduling

There is no scheduler loop running inside this application. The tracked
price-history job can be run once with `npm run scrape`. For automatic runs,
configure an external scheduler such as cron-job.org to send a `POST` request
every two hours to:

```text
https://<backend-host>/api/scrape/trigger
```

This endpoint scrapes active products already tracked in PostgreSQL, retries
failed attempts, and stores successful price/stock history and per-attempt logs.
The endpoint currently has no authentication; protect it before making it
publicly reachable. The cron schedule itself must be configured in the external
service; it is not created by this repository.

## API routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | API health check |
| `GET` | `/api/products` | List tracked products |
| `POST` | `/api/products` | Add a product to tracking |
| `GET` | `/api/products/:id` | Get a tracked product |
| `GET` | `/api/products/:id/history` | Get price history |
| `GET` | `/api/products/:id/logs` | Get scrape logs |
| `GET` | `/api/export` | Download scrape history as CSV |
| `POST` | `/api/scrape/catalog` | Scrape the first five catalog cards for the UI |
| `POST` | `/api/scrape/product` | Retry and return one product's current price and stock |
| `POST` | `/api/scrape/trigger` | Run the tracked-product price scrape job |

## Deployment configuration

Set `SUPABASE_DB_URL` and any desired backend settings in the backend hosting
environment. Install the Playwright Chromium browser as part of deployment.
Set `VITE_API_URL` to the deployed backend URL when building the frontend.

`VITE_API_URL` is compiled into the frontend build, so it must be set before
building the frontend for deployment.
