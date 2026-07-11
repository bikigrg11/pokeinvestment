# PokeInvest

A web application that treats Pokémon TCG cards as financial instruments — think Bloomberg Terminal or TradingView, but for Pokémon cards. Track market data, analyze investment metrics, manage portfolios, and screen for opportunities.

**[▶ Live demo](https://pokeinvestment.vercel.app)** · Next.js 15 · tRPC · Prisma / Neon

> Heads-up: price *history* is synthetic (Geometric Brownian Motion per rarity tier) for demonstration — card metadata and current pricing come from real sources (pokemontcg.io / TCGPlayer). See [Data Limitations](#data-limitations--what-works-vs-what-needs-more-data) below.

## What It Does

PokeInvest ingests Pokémon card metadata and pricing and surfaces it through an information-dense, data-first dashboard. Core features:

- **Dashboard** (`/`) — Market summary metrics, the Pokémon 250 Index chart, series performance, and leaderboards (highest price, most liquid, vintage/modern grading upside).
- **Market** (`/market`) — Full Pokémon 250 Index with performance metrics and category breakdowns.
- **Card Database** (`/cards`) — Full-text search with set/rarity/signal filters, sortable table with mini sparklines, and card detail pages.
- **Card Detail** (`/cards/[id]`) — Card art and metadata, live TCGPlayer pricing with a stale-price warning, price history chart with range selector, an investment-metrics grid, price breakdown (raw / PSA 9 / PSA 10 / low / mid / high), signal badges, and buy links.
- **Sets** (`/sets`) — All sets with logos and release dates; click to expand and view cards in a set.
- **Sealed Products** (`/sealed`) — Sealed product tracker (booster boxes, ETBs, etc.) with ROI.
- **Portfolio** (`/portfolio`) — Auth-gated holdings tracker with add/edit/remove, live P&L per card, allocation, and a portfolio-vs-index chart.
- **Screener** (`/analytics`) — Filter cards by investment criteria (grading upside, ROI, price, signals) with instant client-side filtering.
- **Grading** (`/grading`) — Top 100 grading candidates split by era (vintage pre-2003 / modern 2003+).
- **Creator Hub** (`/hub`) — Community section (backed by the YouTube Data API).

### Investment Metrics & Signals

Pure calculation functions cover ROI, CAGR, volatility, liquidity score, grading upside, and a Pokémon 250 Index (equal-weight basket of the top 250 cards by market cap). Cards are tagged with signals such as Undervalued, Momentum, Grading Candidate, High Liquidity, Collector Favorite, Breakout, Steady Gainer, and Blue Chip. All monetary values are stored as integer cents and formatted only at the display layer.

> Note: Pricing history is currently **synthetic** — generated via Geometric Brownian Motion per rarity tier (`prisma/seed-history.ts`) — so ROI/CAGR values are approximate rather than real market data. See the "Data Limitations" section of `CLAUDE.md` for what works vs. what needs more data.

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript, React 19
- **Styling**: TailwindCSS, Recharts for charts, lucide-react icons; Bloomberg-style dark theme with a light/dark toggle
- **API layer**: tRPC v11 + TanStack React Query v5 (superjson transformer)
- **Database**: PostgreSQL (Neon serverless in production) via Prisma ORM v6
- **Auth**: NextAuth.js v5 (credentials + OAuth, JWT strategy), bcryptjs, Prisma adapter
- **Validation**: Zod
- **Data sources**: [pokemontcg.io](https://pokemontcg.io) (card metadata + TCGPlayer prices), PokemonPriceTracker / eBay (graded prices), YouTube Data API v3 (Creator Hub)
- **Testing**: Vitest (unit), Playwright (e2e)
- **Deployment**: Vercel + Neon PostgreSQL

## Getting Started

Requires **Node 22** and **PostgreSQL 16** (see `CLAUDE.md` for the exact local `PATH` setup on the maintainer's machine).

1. **Install dependencies** (runs `prisma generate` via `postinstall`):
   ```bash
   npm install
   ```

2. **Configure environment**. Copy `.env.example` to `.env` and fill in the values:
   ```
   DATABASE_URL=postgresql://...      # Neon or local Postgres connection string
   NEXTAUTH_SECRET=...                # openssl rand -base64 32
   NEXTAUTH_URL=http://localhost:3000 # production URL when deployed
   POKEMON_TCG_API_KEY=...            # free key from https://dev.pokemontcg.io/
   PRICE_TRACKER_API_KEY=...          # optional, paid
   YOUTUBE_API_KEY=...                # YouTube Data API v3 (Creator Hub)
   ADMIN_EMAIL=...                    # email allowed to access /hub/admin
   CRON_SECRET=...                    # guards /api/cron/* routes
   ```
   Never commit `.env` — it is gitignored.

3. **Set up the database**:
   ```bash
   npx prisma migrate dev        # apply migrations
   npx prisma db seed            # seed all 172 sets, ~20k cards (idempotent)
   npx tsx prisma/seed-history.ts # generate 52-week synthetic price history + index snapshots
   ```

4. **Run the dev server** (port 3000):
   ```bash
   npm run dev
   ```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | ESLint check |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright e2e tests |
| `npx prisma studio` | Open the database GUI |

Additional data scripts live in `prisma/`: `seed.ts`, `seed-history.ts`, `seed-sealed.ts`, `seed-creators.ts`, and eBay/price sync scripts (`sync-ebay.ts`, `sync-ebay-unpriced.ts`, `sync-prices.ts`).

## Project Structure

```
src/
├── app/          # Next.js App Router — (auth), (dashboard) route groups, api/trpc, api/cron
├── components/   # ui/, charts/, cards/, portfolio/, layout/, providers/
├── lib/          # api clients, db (Prisma singleton), trpc setup, utils, hooks
└── server/       # tRPC routers + business-logic services (metrics, signals, index)
prisma/           # schema.prisma, migrations, seed & sync scripts
docs/             # supporting docs
```

## Documentation

- **`SPEC.md`** — Full technical specification: data model, API integration, metric definitions, signal criteria, per-page feature breakdown, and implementation phases.
- **`CLAUDE.md`** — Working notes: architecture, code patterns, gotchas, per-router API details, deployment specifics, and data limitations.
- **`GETTING_STARTED.md`** — Original build guide describing how the project was scaffolded session by session.
- **`ROLLOUT.md`** — Rollout notes.
- **`prisma/schema.prisma`** — Authoritative database schema.

## Deployment

Deployed on Vercel with a Neon serverless PostgreSQL database. Environment variables are set in the Vercel dashboard. Note that the Prisma client requires `binaryTargets = ["native", "rhel-openssl-3.0.x"]` to run on Vercel's Linux environment — details in `CLAUDE.md`.
