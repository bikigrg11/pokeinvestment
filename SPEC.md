# PokeInvest — Technical Specification

## 1. Overview

PokeInvest is a web application that treats Pokémon TCG cards as financial instruments. Users can track market data, analyze investment metrics, manage portfolios, and discover opportunities — similar to Bloomberg Terminal or TradingView but for Pokémon cards.

## 2. Data Model

### 2.1 Database Schema (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String?
  image         String?
  createdAt     DateTime  @default(now())
  portfolios    Portfolio[]
  alerts        PriceAlert[]
  sessions      Session[]
  accounts      Account[]
}

model Card {
  id            String    @id  // pokemontcg.io ID e.g. "base1-4"
  name          String
  pokemon       String         // Parsed Pokemon name without suffixes
  setId         String
  set           Set       @relation(fields: [setId], references: [id])
  rarity        String?
  cardNumber    String
  supertype     String         // Pokemon, Trainer, Energy
  subtypes      String[]
  types         String[]       // Fire, Water, etc.
  hp            String?
  artist        String?
  imageSmall    String?
  imageLarge    String?
  tcgplayerUrl  String?
  cardmarketUrl String?
  releaseDate   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  prices        CardPrice[]
  holdings      PortfolioHolding[]
  alerts        PriceAlert[]

  @@index([pokemon])
  @@index([setId])
  @@index([rarity])
}

model CardPrice {
  id            String    @id @default(cuid())
  cardId        String
  card          Card      @relation(fields: [cardId], references: [id])
  date          DateTime  @default(now())
  marketPrice   Int?           // cents — TCGPlayer market price
  lowPrice      Int?           // cents
  midPrice      Int?           // cents
  highPrice     Int?           // cents
  variant       String         // holofoil, reverseHolofoil, normal, etc.
  psa10Price    Int?           // cents — from PriceTracker API
  psa9Price     Int?           // cents
  rawPrice      Int?           // cents
  volume        Int?           // estimated sales count

  @@index([cardId, date])
  @@index([date])
  @@unique([cardId, date, variant])
}

model Set {
  id            String    @id  // pokemontcg.io set ID
  name          String
  series        String
  releaseDate   DateTime?
  totalCards    Int
  printedTotal  Int
  symbolUrl     String?
  logoUrl       String?
  legalities    Json?
  createdAt     DateTime  @default(now())
  cards         Card[]
  sealedProducts SealedProduct[]

  @@index([series])
}

model SealedProduct {
  id            String    @id @default(cuid())
  name          String
  setId         String
  set           Set       @relation(fields: [setId], references: [id])
  type          String         // booster_box, etb, blister, etc.
  releasePriceC Int?           // cents
  currentPriceC Int?           // cents
  imageUrl      String?
  lastUpdated   DateTime?

  @@index([setId])
}

model Portfolio {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  name          String    @default("My Portfolio")
  createdAt     DateTime  @default(now())
  holdings      PortfolioHolding[]

  @@index([userId])
}

model PortfolioHolding {
  id            String    @id @default(cuid())
  portfolioId   String
  portfolio     Portfolio  @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  cardId        String
  card          Card      @relation(fields: [cardId], references: [id])
  purchasePriceC Int           // cents
  quantity      Int
  condition     String    @default("NM")  // NM, LP, MP, HP, DMG
  graded        Boolean   @default(false)
  gradeCompany  String?        // PSA, CGC, BGS
  gradeValue    String?        // 10, 9.5, 9, etc.
  purchaseDate  DateTime
  notes         String?
  createdAt     DateTime  @default(now())

  @@index([portfolioId])
  @@index([cardId])
}

model PriceAlert {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  cardId        String
  card          Card      @relation(fields: [cardId], references: [id])
  targetPriceC  Int            // cents
  direction     String         // above, below
  active        Boolean   @default(true)
  triggeredAt   DateTime?
  createdAt     DateTime  @default(now())

  @@index([userId, active])
  @@index([cardId])
}

model IndexSnapshot {
  id            String    @id @default(cuid())
  date          DateTime  @unique
  value         Float          // index value (base 1000)
  components    Json           // array of { cardId, weight, price }
  totalMarketCap Float

  @@index([date])
}
```

### 2.2 Monetary Values

ALL prices stored as integers in cents. Conversion happens at the display layer only.
- `formatCents(amountInCents)` → "$12.34"
- `toCents(dollarAmount)` → 1234
- API responses from pokemontcg.io come as dollars — convert on ingestion.

## 3. API Integration

### 3.1 pokemontcg.io (Primary — Free)

Base URL: `https://api.pokemontcg.io/v2`
Auth: `X-Api-Key` header (optional, increases rate limit)

Endpoints used:
- `GET /cards` — search/list cards with pagination, includes TCGPlayer pricing
- `GET /cards/{id}` — single card with full pricing
- `GET /sets` — all sets

Rate limits: 100/day without key, 20,000/day with free key.

Pricing fields path: `card.tcgplayer.prices[variant].market`
Variants: holofoil, reverseHolofoil, normal, 1stEditionHolofoil, 1stEditionNormal, unlimitedHolofoil

### 3.2 Sync Strategy

1. **Initial seed**: Fetch all sets, then fetch all cards per set (paginated). Store in DB. Run once.
2. **Daily price sync**: Cron job at 2am UTC. For each card in DB, fetch latest price from API. Create new CardPrice row. Batch requests with delays to respect rate limits.
3. **On-demand refresh**: User can trigger price refresh for a single card (rate-limited to 1/min per user).

### 3.3 Caching Layers

- **Database**: CardPrice table is the source of truth for historical data
- **Redis/memory**: Cache API responses for 1 hour to avoid rate limit issues
- **React Query**: Client-side cache with staleTime of 5 minutes for card data, 1 minute for portfolio

## 4. Investment Metrics

All calculations in `server/services/metrics.ts`. Pure functions, no side effects.

```typescript
// ROI: (current - purchase) / purchase
function calculateROI(currentPriceC: number, purchasePriceC: number): number

// CAGR: (current/purchase)^(1/years) - 1
function calculateCAGR(currentPriceC: number, purchasePriceC: number, years: number): number

// Volatility: standard deviation of daily returns over N days
function calculateVolatility(prices: { date: Date; priceC: number }[], days?: number): number

// Liquidity score: 0-100 based on volume relative to market average
function calculateLiquidity(volume: number, marketAvgVolume: number): number

// Grading upside: PSA10 price / raw price
function calculateGradingUpside(psa10PriceC: number, rawPriceC: number): number

// Investment signals: returns array of signal tags
function generateSignals(card: CardWithPrices): Signal[]
// Signal types: Undervalued, Momentum, GradingCandidate, HighLiquidity,
//               CollectorFavorite, Breakout, SteadyGainer, BlueChip

// Pokemon 250 Index: equal-weight basket of top 250 cards by market cap
function calculateIndex(topCards: CardWithPrices[], previousValue: number): IndexSnapshot
```

### Signal Criteria

| Signal | Condition |
|--------|-----------|
| Undervalued | Price below 90-day moving average by >15% AND positive volume trend |
| Momentum | Price up >10% in 7 days with increasing volume |
| Grading Candidate | PSA10/raw ratio > 3x AND raw price > $5 |
| High Liquidity | Volume in top 20% of all tracked cards |
| Collector Favorite | From vintage set (pre-2005) AND rarity >= Rare Holo |
| Breakout | Price up >25% in 30 days from base of low volatility |
| Steady Gainer | Positive ROI for 6+ consecutive months |
| Blue Chip | Top 50 by market cap AND >100% ROI since release |

## 5. Pages & Features

### 5.1 Dashboard (/)
- Market summary cards: Index value, total market cap, avg ROI, cards tracked
- Pokemon 250 Index chart (area chart, 5yr)
- Top ROI / Biggest Movers / Most Liquid / Top Grading Upside leaderboards (5 cards each)
- Market sentiment indicator

### 5.2 Market (/market)
- Full Pokemon 250 Index with performance metrics
- Tabs: Trending / Highest ROI / Most Liquid / Grading Upside
- 100-card sortable table with mini sparkline charts
- Era performance comparison bar chart

### 5.3 Card Database (/cards)
- Full-text search across card names
- Filters: set, rarity, type, price range, signal tags
- Paginated sortable table with card images, prices, signals
- Export to CSV

### 5.4 Card Detail (/cards/[id])
- Card image + metadata
- Live price from TCGPlayer with variant selector
- Price history chart with range selector (3M/6M/1Y/2Y/ALL)
- Volume overlay on price chart
- Investment metrics grid (ROI, CAGR, volatility, liquidity, grading upside, PSA spread)
- Investment score radar/bar chart
- Price breakdown table (raw, PSA 9, PSA 10, low, mid, high)
- Signal badges
- Direct buy links (TCGPlayer, Cardmarket)
- Add to portfolio button

### 5.5 Sets (/sets)
- All sets with logos, release dates, card counts
- Click to expand: shows cards in set with prices
- Set ROI comparison chart
- Filter by era/series

### 5.6 Sealed Products (/sealed)
- Sortable table: product, type, set, release price, current price, ROI
- Filter by product type (booster box, ETB, etc.)

### 5.7 Portfolio (/portfolio)
- Add card search (search pokemontcg.io, specify qty + cost basis + condition + grade)
- Portfolio value, total P&L, return %, vs Index comparison
- Allocation pie chart
- Holdings table with live P&L per card
- Portfolio performance chart vs Pokemon 250 Index
- Export portfolio to CSV

### 5.8 Screener (/analytics)
- Search + filter cards by investment criteria
- Adjustable filters: grading upside, ROI, volume, price range, signals
- Results table with all metrics
- Save screener presets

## 6. Non-Functional Requirements

- **Performance**: Initial page load < 2s, API responses < 500ms
- **Mobile**: Responsive down to 375px width. Tables scroll horizontally.
- **SEO**: Card detail pages server-rendered for search indexing
- **Accessibility**: WCAG 2.1 AA compliant
- **Security**: CSRF protection, rate limiting on all API routes, parameterized queries only

## 7. Implementation Order

Phase 1: Foundation
1. Scaffold Next.js + Prisma + tRPC + Auth
2. Database schema + migrations
3. pokemontcg.io API client with caching
4. Seed script for initial data load
5. Basic card list page with search

Phase 2: Core Features
6. Card detail page with pricing
7. Set browser
8. Investment metrics calculations
9. Dashboard with leaderboards
10. Pokemon 250 Index calculation + chart

Phase 3: Portfolio & Analytics
11. Portfolio CRUD
12. Portfolio performance tracking
13. Investment screener
14. Signal generation
15. Sealed product tracker

Phase 4: Polish
16. Price alerts
17. CSV export
18. Mobile responsive pass
19. Performance optimization
20. E2E tests
