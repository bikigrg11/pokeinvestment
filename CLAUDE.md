# PokeInvest

Pokémon card investment analytics platform. Think Bloomberg Terminal for Pokémon TCG cards.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript strict, TailwindCSS, Recharts, React Query (TanStack Query v5)
- **Backend**: Next.js API routes + tRPC
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js v5 (credentials + OAuth)
- **Data Sources**: pokemontcg.io API (free, card metadata + TCGPlayer prices), PokemonPriceTracker API (graded card prices, eBay data)
- **Deployment**: AWS Amplify (frontend) + RDS PostgreSQL

## Node Version

**Requires Node 22.** The system default is Node 12 — activate Node 22 and PostgreSQL 16 together before running any commands:

```bash
export PATH="/usr/local/opt/postgresql@16/bin:/usr/local/opt/node@22/bin:$PATH"
brew services start postgresql@16
```

Add the `export` line to `~/.zshrc` or `~/.bash_profile` to make it permanent. Node 22 is at `/usr/local/opt/node@22`, PostgreSQL 16 at `/usr/local/opt/postgresql@16`.

## Commands

- `npm run dev` — start dev server (port 3000)
- `npm run build` — production build
- `npm run lint` — ESLint + Prettier check
- `npm run test` — Vitest unit tests
- `npm run test:e2e` — Playwright e2e tests
- `npx prisma migrate dev` — run database migrations
- `npx prisma generate` — regenerate Prisma client
- `npx prisma studio` — open database GUI
- `npx prisma db seed` — seed database with card data

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth pages (login, register)
│   ├── (dashboard)/        # Main app pages (requires auth)
│   │   ├── page.tsx        # Home / Dashboard
│   │   ├── market/         # Market overview + Pokemon 250 Index
│   │   ├── cards/          # Card database + search
│   │   ├── cards/[id]/     # Card detail page
│   │   ├── sets/           # Set performance
│   │   ├── sealed/         # Sealed product tracker
│   │   ├── portfolio/      # Portfolio tracker
│   │   └── analytics/      # Investment screener
│   ├── api/                # API routes
│   │   └── trpc/           # tRPC router
│   └── layout.tsx          # Root layout (dark theme)
├── components/
│   ├── ui/                 # Base components (Button, Card, Table, Badge)
│   ├── charts/             # Recharts wrappers (PriceChart, IndexChart, MiniChart)
│   ├── cards/              # Card-specific components
│   ├── portfolio/          # Portfolio components
│   └── layout/             # Nav, Sidebar, Header
├── lib/
│   ├── api/                # External API clients (pokemontcg, pricetracker)
│   ├── db/                 # Prisma client singleton
│   ├── trpc/               # tRPC setup (router, context, procedures)
│   ├── utils/              # Shared utilities (formatting, calculations)
│   └── hooks/              # Custom React hooks
├── server/
│   ├── routers/            # tRPC routers (cards, sets, portfolio, analytics)
│   └── services/           # Business logic (investment metrics, signals, index calc)
└── prisma/
    ├── schema.prisma       # Database schema
    ├── migrations/         # Migration files
    └── seed.ts             # Seed script
```

## Database

See `prisma/schema.prisma` for the full schema. Key tables: cards, card_prices, sets, sealed_products, user_portfolios, portfolio_holdings, price_alerts.

Prices are synced via a cron job that runs every 6 hours fetching from pokemontcg.io and storing historical snapshots in card_prices.

## Code Patterns

- All API data fetching uses React Query with proper cache keys
- Server components for initial data, client components for interactivity
- Use tRPC for all internal API calls — never raw fetch to /api routes
- Investment metric calculations live in `server/services/metrics.ts` — keep them pure functions
- All monetary values stored as integers (cents) in the database, formatted on display
- Use Zod for all input validation (tRPC inputs, form data, API responses)

## Database Setup (local)

PostgreSQL 16 is installed via Homebrew. Start it with:

```bash
brew services start postgresql@16
```

The local DB uses the OS username (`bikigurung`) with no password. `DATABASE_URL` in `.env` reflects this:
```
DATABASE_URL="postgresql://bikigurung@localhost:5432/pokeinvest?schema=public"
```

Do **not** use `postgres:password@...` — there is no `postgres` role on this machine.

**Current DB state:** 172 sets, 5,761 cards, 8,650 price snapshots already seeded. Re-seeding is safe — the seed script uses `upsert` throughout and is fully idempotent.

**`brew install` exit code 1** is a false alarm on this machine — it's a Docker CLI plugin permissions error during cleanup, not a PostgreSQL failure. Installation succeeds regardless.

## Gotchas

- pokemontcg.io rate limit: 100 req/day without API key, 20,000/day with free key. Cache aggressively.
- TCGPlayer prices from pokemontcg.io come nested under variant names (holofoil, reverseHolofoil, normal). Always try multiple variants.
- Not all cards have prices — filter these out in market views, show "No price data" in detail views.
- The Pokemon 250 Index is calculated from the top 250 cards by market cap, equal-weighted, rebalanced monthly. Calculation logic is in `server/services/index.ts`.
- Dark mode only — the entire UI is dark theme. Do not add light mode.
- `src/app/page.tsx` must NOT exist — the dashboard route group `(dashboard)/page.tsx` serves `/`. Having both causes a conflict.
- tRPC uses superjson transformer — both server (`src/lib/trpc/index.ts`) and client (`TRPCProvider.tsx`) must specify `transformer: superjson`.
- NextAuth v5 uses JWT strategy (not database sessions) to avoid needing a DB connection on every request. Session callback maps `token.id` → `session.user.id`.
- `protectedProcedure` in tRPC guarantees `ctx.session.user` is non-null — safe to access without optional chaining inside protected procedures.
- pokemontcg.io date format is `MM/DD/YYYY` or `YYYY/MM/DD` — `parseTCGDate()` in `prisma/seed.ts` handles both forms. Always go through that helper.
- `package.json#prisma.seed` config is deprecated in Prisma 7 (still works in v6). Migration to `prisma.config.ts` will be needed on upgrade.
- Seed script (`prisma/seed.ts`) uses `tsx` (not `ts-node`) — must be in devDependencies.
- `generateSignals()` in `metrics.ts` takes an optional `SignalContext` — HighLiquidity and BlueChip signals are silently skipped without it. Pass context when calling from a router that has all cards loaded.
- Price variant priority order: holofoil → 1stEditionHolofoil → unlimitedHolofoil → reverseHolofoil → normal → 1stEditionNormal. Use `getBestVariant()` from `src/lib/api/pokemontcg.ts` rather than hardcoding this.
- `cards.list` tRPC procedure sorts by price **client-side** after fetching, because `CardPrice` is a related table and Prisma can't `ORDER BY` through an aggregated relation cheaply. If DB-level price sorting becomes a bottleneck, add a denormalised `latestMarketPriceC` column directly on `Card`.
- `vitest.config.ts` must include the `@/*` path alias matching `tsconfig.json`, otherwise test files that import from `@/server/...` will fail to resolve.
- `brew install` for `node@22` and `postgresql@16` both emit exit code 1 on this machine due to a Docker CLI plugin permissions issue during cleanup — the installs themselves succeed. Safe to ignore.

## UI Component Library

Shared components that already exist — use these instead of building from scratch:

| Component | Path | Notes |
|-----------|------|-------|
| `MetricCard` | `src/components/ui/MetricCard.tsx` | stat display card with icon, value, sub |
| `SignalBadge` | `src/components/ui/SignalBadge.tsx` | colored signal tag, handles camelCase→spaced labels |
| `SortableTable` | `src/components/ui/SortableTable.tsx` | generic client-side sortable table |
| `ErrorState` | `src/components/ui/ErrorState.tsx` | red AlertTriangle + message + Retry button; use on every page that fetches data |
| `MiniSparkline` | `src/components/charts/MiniSparkline.tsx` | small `AreaChart` for table rows |
| `ChartTooltip` | `src/components/charts/ChartTooltip.tsx` | dark recharts tooltip, auto-formats $ and % |

## Historical Price Data

**The DB only has one price snapshot per card (today's price).** This means:
- Price history charts will have 1 data point — show a flat line / graceful empty state
- ROI, CAGR, 24h/7d change cannot be computed — display "—"
- Grading upside works if `psa10Price` is populated (it often isn't — most cards lack PSA data)
- Volume field IS populated — liquidity sorting works

To generate synthetic 24-month price history for all seeded cards, run:
```bash
npx tsx prisma/seed-history.ts
```
(Script doesn't exist yet — build it when historical charts are needed.)

## Layout — Top Navigation

The dashboard uses a **horizontal top nav** (not a sidebar), matching the prototype. Nav lives in `src/components/layout/TopNav.tsx`. The `(dashboard)/layout.tsx` renders `<TopNav />` above `<main>` — not the old Sidebar+Header.

Prototype exact colors (not Tailwind defaults — use these hex values):
- Page background: `#080d19`
- Panel/card background: `#0c1222`
- Darker panel: `#0a0f1c`
- Border: `#1e293b`
- Text primary: `#f1f5f9`, secondary: `#cbd5e1`, muted: `#94a3b8`, very muted: `#64748b`
- Accent: `#fbbf24` (amber), positive: `#22c55e`, negative: `#ef4444`

## Style Rules

- Tailwind only, no custom CSS files
- Use inline `style={{}}` for exact hex colors from the prototype (Tailwind's slate palette is close but not exact)
- Financial numbers: `fontFamily: "'JetBrains Mono', 'SF Mono', monospace"` — apply inline, not via class
- Panel style: `background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20`
- Section label style: `fontSize: 13, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px"`
- All data tables must be sortable — use `SortableTable` component
- Bloomberg Terminal aesthetic — information-dense, data-first
- `clr(n)` in `src/lib/utils/formatting.ts` returns hex color string for positive/negative/null values — use for inline `color:` props
- All chart components must have `"use client"` — Recharts does not work in Server Components

## Pages — Build Status

All core pages are built and compiling cleanly (`npm run build` passes):

| Route | File | Status |
|-------|------|--------|
| `/` | `(dashboard)/page.tsx` | ✅ Built — 4 MetricCards, Index chart, Series BarChart, 4 leaderboards with card images |
| `/cards` | `(dashboard)/cards/page.tsx` | ✅ Built — search, set/rarity/signal filters, SortableTable + MiniSparkline |
| `/cards/[id]` | `(dashboard)/cards/[id]/page.tsx` | ✅ Built — image, price header, 6-col metrics, range-toggle ComposedChart, price breakdown, investment score |
| `/market` | `(dashboard)/market/page.tsx` | 🔲 Placeholder |
| `/sets` | `(dashboard)/sets/page.tsx` | 🔲 Placeholder |
| `/sealed` | `(dashboard)/sealed/page.tsx` | 🔲 Placeholder |
| `/portfolio` | `(dashboard)/portfolio/page.tsx` | 🔲 Placeholder |
| `/analytics` | `(dashboard)/analytics/page.tsx` | 🔲 Placeholder |

## tRPC Client Export

The tRPC React client is exported as `trpc` (not `api`) from `src/lib/trpc/client.ts`:
```typescript
import { trpc } from "@/lib/trpc/client";
// or alias it:
import { trpc as api } from "@/lib/trpc/client";
```
Never import `api` from that file — it doesn't exist.

## analytics.ts Router — Key Details

- `analytics.dashboard` returns: `topByPrice`, `topByVolume`, `topGrading`, `vintageHolos`, `seriesPerformance`, `stats`
- All four card arrays include `imageSmall` — use it for card thumbnails in leaderboards
- `stats.totalCards` and `stats.trackedCards` come back as JS `number` (already converted from BigInt inside the router)
- `seriesPerformance[].avgMarketPrice` is a raw dollar float (not cents) — comes from `AVG(marketPrice)` where prices are stored in cents, so divide by 100 before displaying or pass as-is to chart
- `BigInt` literals (`0n`) cause TypeScript errors when targeting below ES2020 — use `BigInt(0)` instead

## sets.list Return Shape

`sets.list` returns a **flat array** of set objects, not `{ sets: [] }`. Access directly:
```typescript
const { data: sets } = trpc.sets.list.useQuery({});
const setList = sets ?? [];  // NOT sets?.sets
```

## Card Schema Field Names

Use the exact Prisma field names — common mismatch:
- `card.cardNumber` (not `card.number`)
- `card.imageSmall` (not `card.image`)
- `card.tcgplayerUrl` (can be null)
- `card.supertype` (always present — "Pokémon", "Trainer", "Energy")

## Image Domains

`images.pokemontcg.io` is already configured in `next.config.ts` `remotePatterns`. No changes needed to use Next.js `<Image>` with card art URLs.

## Dashboard Leaderboard Categories

The prototype shows: Highest ROI, Biggest Movers, Most Liquid, Top Grading Upside.
With only one price snapshot in the DB, ROI and movers can't be computed. The analytics router instead returns:
- `topByPrice` → "Highest Market Price"
- `topByVolume` → "Most Liquid Cards"
- `vintageHolos` → "Vintage Holos (pre-2005)"
- `topGrading` → "Top Grading Upside"

Once `seed-history.ts` is built and run, ROI/movers can be added to the analytics router and swapped in.

## Pages — Final Build Status

| Route | Status |
|-------|--------|
| `/` | ✅ Dashboard |
| `/cards` | ✅ Card database |
| `/cards/[id]` | ✅ Card detail |
| `/sets` | ✅ Set performance |
| `/sealed` | ✅ Sealed products |
| `/portfolio` | ✅ Portfolio tracker — full CRUD, auth-gated |
| `/market` | 🔲 Placeholder |
| `/analytics` | 🔲 Placeholder |

## Portfolio Router — Full API

```typescript
portfolio.get          // protectedProcedure — returns portfolio + holdings + card + card.set + prices[0]
portfolio.addHolding   // protectedProcedure — auto-creates portfolio if needed
portfolio.removeHolding // protectedProcedure — ownership-verified delete
portfolio.updateHolding // protectedProcedure — ownership-verified update (qty, price, condition, notes)
```

`addHolding` input schema:
```typescript
{
  cardId: string,
  purchasePriceC: number,   // integer cents
  quantity: number,
  condition: string,         // "NM" | "LP" | "MP" | "HP" | "DMG"
  graded: boolean,
  gradeCompany?: string,     // "PSA" | "BGS" | "CGC" | "SGC"
  gradeValue?: string,       // "10" | "9.5" | "9" | ...
  purchaseDate: Date,        // superjson serializes Date objects correctly
  notes?: string,
}
```

## portfolio.get — Include Shape

The `get` query must include `card.set` explicitly — it is NOT included by default. Always use:
```typescript
holdings: {
  include: {
    card: {
      include: {
        set: { select: { id: true, name: true } },
        prices: { orderBy: { date: "desc" }, take: 1 },
      },
    },
  },
},
```
Forgetting `set` causes a TypeScript error when accessing `card.set.name` in the page.

## SessionProvider — Required for useSession

`next-auth/react`'s `useSession` requires `<SessionProvider>` in the tree. It is now wrapped inside `TRPCProvider.tsx` (already a client component). Do not add it again in layout.tsx.

```typescript
// src/components/providers/TRPCProvider.tsx
import { SessionProvider } from "next-auth/react";
// wraps the trpc.Provider + QueryClientProvider
```

## Auth-Gating Client Pages

For pages that require auth (portfolio), gate the tRPC query on session status:
```typescript
const { status } = useSession();
const { data } = trpc.portfolio.get.useQuery(undefined, {
  enabled: status === "authenticated",
});
```
Show a sign-in prompt when `status === "unauthenticated"`. Never show an error — graceful empty state with a `signIn()` button from `next-auth/react`.

## Custom Table with Inline Edit Rows

The portfolio page uses a manually rendered `<table>` instead of `SortableTable` so it can splice `<EditRow>` components between data rows when `editingId === row.id`. Use this pattern when you need inline expandable rows — `SortableTable` doesn't support inserting extra rows between items.

## Portfolio P&L Calculation

All arithmetic stays in cents throughout:
```typescript
const currentValueC = latestPrice * quantity;          // latestPrice already in cents
const costBasisC    = purchasePriceC * quantity;        // purchasePriceC in cents
const pnlC          = currentValueC - costBasisC;
const pnlPct        = (pnlC / costBasisC) * 100;
```
Only call `formatCents()` at display time.

## Portfolio vs Index Line Chart

Since there are no historical portfolio snapshots, the portfolio line is approximated by linearly interpolating `totalPnlPct` across the index history period:
```typescript
portfolio: totalPnlPct * ((i + 1) / pts.length)  // same approach as prototype
```
The index line uses `analytics.indexHistory` — show an empty state if fewer than 2 points exist.

## Ownership Verification in Mutations

`removeHolding` and `updateHolding` both fetch the holding first, confirm `holding.portfolio.userId === ctx.session.user.id`, and throw `TRPCError({ code: "FORBIDDEN" })` if not. Always do this for any mutation that acts on user-owned data — `protectedProcedure` only guarantees a session exists, not that the user owns the resource.

## useMemo Dependency Lint Rule

ESLint `react-hooks/exhaustive-deps` flags this pattern:
```typescript
const items = (data ?? []) as Foo[];  // inline expression
const stats = useMemo(() => items.filter(...), [items]);  // items recreated every render
```
Fix by wrapping the cast in its own `useMemo`:
```typescript
const items = useMemo(() => (data ?? []) as Foo[], [data]);
```

## Pages — Final Build Status

| Route | Status |
|-------|--------|
| `/` | ✅ Dashboard — metrics, index chart, series chart, 4 leaderboards with card images |
| `/cards` | ✅ Card database — search, filters, SortableTable + MiniSparkline |
| `/cards/[id]` | ✅ Card detail — image, price, range-toggle chart, metrics, investment score |
| `/sets` | ✅ Set performance — logo table, bar chart, click-to-expand with card list |
| `/sealed` | ✅ Sealed products — metrics, sortable table, empty state |
| `/market` | 🔲 Placeholder |
| `/portfolio` | 🔲 Placeholder |
| `/analytics` | 🔲 Placeholder |

## sets.performance Procedure

Added `sets.performance` to `src/server/routers/sets.ts` — raw SQL using `DISTINCT ON` to get avg market price per set, returns top 20 by avg price. Return shape:

```typescript
{ id, name, series, logoUrl, releaseDate, avgMarketPrice: number, cardCount: bigint }
```

`avgMarketPrice` is in **cents** (raw from DB). `cardCount` is `bigint` — convert with `Number()`.

## Sealed Router

`src/server/routers/sealed.ts` — `sealed.list` returns all `SealedProduct` rows joined with `set`, plus a computed `roi` field:
```typescript
roi = ((currentPriceC - releasePriceC) / releasePriceC) * 100  // null if either price missing
```
Registered as `sealed` in `src/server/routers/index.ts`.

## SealedProduct Schema

```
SealedProduct { id, name, setId, set, type, releasePriceC, currentPriceC, imageUrl, lastUpdated }
```
Prices are in **cents** (Int?). No sealed products are seeded yet — add via Prisma Studio or a seed script. The page renders a graceful empty state.

## Set Schema Fields

```
Set { id, name, series, releaseDate, totalCards, printedTotal, symbolUrl, logoUrl, legalities, createdAt }
```
- `logoUrl` — wide horizontal logo image (use width≈80, height≈32)
- `symbolUrl` — small circular symbol icon (use width=20, height=20)
- Both are hosted on `images.pokemontcg.io` (already in next.config.ts remotePatterns)

## Expandable Row Pattern

The Sets page uses a click-to-toggle expand pattern — clicking a row sets `selectedId`; clicking the same row again clears it. The detail panel fetches via `sets.byId` with `enabled: !!selectedId`. This avoids loading all card data upfront.

## sets.byId Return Shape

```typescript
{ set, cards, total, page, limit }
// cards include: prices[0] (latest price, desc by date)
```
Card fields available in detail panel: `id`, `name`, `cardNumber`, `rarity`, `prices[0].marketPrice`, `prices[0].psa10Price`.

## Environment Variables

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
POKEMON_TCG_API_KEY=...           # from pokemontcg.io (free)
PRICE_TRACKER_API_KEY=...         # from pokemonpricetracker.com (optional, paid)
```

Never commit .env files. Use .env.example as template.

## Pages — Final Build Status (all routes)

| Route | Status |
|-------|--------|
| `/` | ✅ Dashboard — metrics, index chart, series chart, 4 leaderboards with card images |
| `/market` | ✅ Market overview — 4 metrics, index AreaChart, series BarChart, 4 leaderboard tables |
| `/cards` | ✅ Card database — search, filters, SortableTable + MiniSparkline |
| `/cards/[id]` | ✅ Card detail — image, price, range-toggle chart, metrics, investment score |
| `/sets` | ✅ Set performance — logo table, bar chart, click-to-expand with card list |
| `/sealed` | ✅ Sealed products — metrics, sortable table, empty state |
| `/portfolio` | ✅ Portfolio tracker — full CRUD, auth-gated, inline edit, charts |
| `/analytics` | ✅ Investment screener — filters, rarity/price charts, sortable table |

## Responsive Grid CSS Classes

Defined in `src/app/globals.css` — use these instead of inline `gridTemplateColumns`:

| Class | Mobile | Tablet (≥640px) | Desktop (≥768px/1024px) |
|-------|--------|-----------------|-------------------------|
| `.grid-2col` | 1 col | — | 2 cols (≥768px) |
| `.grid-3col` | 1 col | 2 cols (≥640px) | 3 cols (≥1024px) |
| `.grid-4col` | 2 cols | 3 cols (≥640px) | 4 cols (≥1024px) |

Also available: `.hide-mobile` (hidden on <640px), `.nav-scroll` (horizontal scroll, no scrollbar), `.main-content` (16px padding mobile → 28px 24px desktop), `.skeleton` (shimmer animation for loading states), `.cell-name` (truncate long card names with ellipsis, max-width 180px).

## Mobile Responsive Rules

- Use CSS grid utility classes (above) instead of inline `gridTemplateColumns` for any multi-column layout — the inline style always wins and breaks mobile.
- TopNav hides the wordmark + BETA badge on mobile (`.hide-mobile`), shows icon-only nav links that scroll horizontally (`.nav-scroll`).
- Never rely on `repeat(N, 1fr)` inline for grids that need to stack on mobile — convert to a CSS class or add a matching `@media` rule in globals.css.

## Error / Loading / Empty State Patterns

Every page that fetches data via tRPC must handle all three states. Standard pattern:

```typescript
const { data, isLoading, isError, refetch } = trpc.foo.bar.useQuery(...);

// 1. Loading → skeleton boxes
if (isLoading) return <LoadingSkeleton />;  // or inline skeleton divs

// 2. Error → ErrorState with retry
if (isError) return (
  <div>
    <h1>Page Title</h1>
    <ErrorState message="Failed to load …" onRetry={() => void refetch()} />
  </div>
);

// 3. Empty → inline empty state with icon + message
// (handled inside the page, e.g. SortableTable emptyMessage prop)
```

**Skeleton divs:** use `<div className="skeleton" style={{ height: N, borderRadius: 8 }} />` inside the grid utility classes to approximate the page layout while loading.

**In-panel skeleton (charts/tables inside a rendered panel):** when a page renders its outer shell immediately but loads data inside panels, use skeleton divs *inside* the panel instead of "Loading…" text:
```tsx
// WRONG — blank white area while loading
{isLoading ? <div style={{ color: "#475569" }}>Loading…</div> : <Chart />}

// RIGHT — shimmer fills the chart area
{isLoading ? <div className="skeleton" style={{ height: 240, borderRadius: 8 }} /> : <Chart />}

// RIGHT — skeleton rows for tables
{isLoading ? (
  <div style={PANEL}>
    {[...Array(8)].map((_, i) => (
      <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 6 }} />
    ))}
  </div>
) : <SortableTable ... />}
```

**`refetch` must be wrapped in `void`** when passed as `onClick` callback to avoid floating promise lint errors: `onRetry={() => void refetch()}`.

## Card Image Placeholder Pattern

Never render a bare `card.imageSmall && <Image …>` — always provide a fallback so missing images show a styled box instead of nothing:

```tsx
import { ImageOff } from "lucide-react";

{card.imageSmall ? (
  <Image src={card.imageSmall} alt={card.name} width={W} height={H} style={{ objectFit: "contain", … }} />
) : (
  <div style={{ width: W, height: H, background: "#1e293b", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <ImageOff size={Math.round(W * 0.5)} color="#334155" />
  </div>
)}
```

Size the `ImageOff` icon to roughly half the container width.

## Portfolio Mutation Error Handling

`protectedProcedure` mutations (`addHolding`, `updateHolding`, `removeHolding`) can fail for network errors, Zod validation failures, or FORBIDDEN. Always provide both `onSuccess` and `onError` callbacks:

```typescript
const mutation = trpc.portfolio.addHolding.useMutation({
  onSuccess: () => { utils.portfolio.get.invalidate(); onClose(); },
  onError: (err) => setError(err.message || "Operation failed"),
});
```

**Client-side validation must run before `mutateAsync`** — show inline errors for qty < 1 and price ≤ 0 without sending the request. The Zod schema on the server enforces `quantity: z.number().int().positive()` but `purchasePriceC` only requires `int` (not positive), so the $0 guard must be client-side.

## Signal Type Cast in Client Filters

`generateSignals()` returns `Signal[]` (a string union). When filtering with `Array.prototype.includes()` and the filter value is `string`, TypeScript rejects it:
```typescript
// ERROR: Argument of type 'string' is not assignable to parameter of type 'Signal'
c.signals.includes(filters.signal)

// FIX: cast to never (or import Signal and cast to Signal)
c.signals.includes(filters.signal as never)
```

## Analytics Screener Architecture

- Server fetches top 500 cards via `$queryRaw DISTINCT ON` (ordered by marketPrice DESC)
- Signal computation happens in-memory in the router using `generateSignals()` + `SignalContext`
- Full 500-card dataset is returned to the client; client-side `useMemo` filters instantly on filter changes
- This avoids a round-trip per filter change. 500 cards is well within JSON budget.
- `cards = useMemo(() => allCards ?? [], [allCards])` — must be in its own `useMemo`, not an inline `??` expression, to avoid breaking downstream `useMemo` dependencies.

## Market Page Data Sources

`/market` uses two tRPC queries:
- `trpc.analytics.dashboard` — topByPrice, topByVolume, topGrading, vintageHolos, seriesPerformance, stats
- `trpc.analytics.indexHistory` — IndexSnapshot rows ordered by date asc

`seriesPerformance[].avgMarketPrice` is in **cents** — divide by 100 before displaying as dollars.

## seriesPerformance Chart — Cents Bug

`analytics.dashboard.seriesPerformance[].avgMarketPrice` is in **cents** (raw `AVG()` from the DB). The dashboard BarChart must convert before passing to Recharts:
```typescript
// WRONG — passes 45203 to chart, YAxis shows 45,203 instead of $452
avgMarketPrice: r.avgMarketPrice

// CORRECT
avgMarketPrice: +(r.avgMarketPrice / 100).toFixed(2)
```
Also add `tickFormatter={(v) => \`$${v}\`}` to the YAxis. The market page already does this correctly.

## React Fragment Key in Table Rows

When mapping over rows and conditionally inserting a sibling row (e.g. an inline edit row), you need a **keyed Fragment** — not a bare `<>`:
```typescript
import { Fragment } from "react";

{rows.map((row) => (
  <Fragment key={row.id}>        // ✅ key here
    <tr>...</tr>
    {editing && <EditRow />}
  </Fragment>
))}
```
Using `<>` with `key` on the inner `<tr>` instead causes React key warnings and can cause incorrect reconciliation when edit rows appear/disappear.

## "Add to Portfolio" Button Pattern

On the card detail page, the "Add to Portfolio" button navigates to `/portfolio` via `router.push("/portfolio")` — it does NOT attempt to pre-populate the form or pass state via query params. The user searches for the card again in the AddCardPanel. This is intentional: the AddCardPanel has its own search with price pre-fill from the latest market price.

## Data Limitations — What Works vs What Needs seed-history.ts

| Feature | Status | Reason |
|---------|--------|--------|
| Rarity/CollectorFavorite signals | ✅ Works | Based on rarity + release date, no history needed |
| Price filters in screener | ✅ Works | Uses current snapshot |
| Volume filter (> 0) | ❌ Returns 0 results | No volume data in DB |
| Grading Upside filter | ❌ Returns 0 results | No PSA/raw price data |
| HighLiquidity / Momentum / etc signals | ❌ Never fires | Needs price history or volume data |
| BlueChip signal | ❌ Never fires | Needs `releasePriceC` (not seeded) |
| Index/Portfolio line charts | ❌ Empty state | No `IndexSnapshot` rows |
| Price history charts | ❌ 1-point flat | Only one `CardPrice` per card |

Run `npx tsx prisma/seed-history.ts` (script not yet built) to generate synthetic history and unlock the remaining features.

## Smoke Test Checklist

Before shipping, verify each route returns 200 and tRPC endpoints respond:
```bash
for path in "/" "/cards" "/market" "/sets" "/sealed" "/portfolio" "/analytics" "/login"; do
  echo "$path → $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")"
done
```
Key tRPC endpoints to spot-check: `analytics.dashboard`, `analytics.screener`, `cards.list`, `sets.performance`, `sealed.list`, `analytics.indexHistory`.
