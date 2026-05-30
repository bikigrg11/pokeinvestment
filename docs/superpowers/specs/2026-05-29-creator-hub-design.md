# Creator Hub — Hobby Directory & Creator Accuracy Scoreboard

**Date:** 2026-05-29
**Status:** Approved design (Phase 1 build-ready)

## Summary

A community directory of Pokémon-hobby people and resources (creators, marketplaces,
services, tools), with social links across platforms, organized by category, and
community up/down voting. The directory is not the product — it is the **input** to
two pieces of proprietary signal that strengthen the core investment terminal:

1. **Heat score** — a recency-weighted "trending now" score per entry (ships Phase 1).
2. **Creator Accuracy Scoreboard** — creators' card "calls" graded against real forward
   price moves (data-gated; turns on in Phase 2).

**Primary goal:** community engagement / stickiness for existing users (not acquisition).

## Decisions (locked during brainstorming)

- **Purpose:** community engagement / stickiness.
- **Submission model:** open, **no login required**. Mitigated with anti-abuse (below).
- **Payoff:** Creator Accuracy Scoreboard, anchored by a Heat / trending score.
- **Heat signal:** **blend** of YouTube growth (real signal day 1, solves cold-start) +
  on-platform engagement (grows with traffic).
- **Sequencing — Approach A (phased):** ship Directory + Heat first; bank calls silently;
  surface Accuracy only once real forward price history is deep enough to grade honestly.
- **Moderation default:** entries go **live immediately**, defended by rate-limit +
  spam filter + downvote-bury + admin hide (not a pre-approval queue).

## Critical constraint — why accuracy is phased

Historical prices in the DB are **synthetic GBM**, so retro-grading past calls would be
fake — the same credibility trap fixed in the price-sync work on 2026-05-29. Real price
points now accrue daily via `/api/cron/sync-prices`. Therefore:

- Phase 1 **banks** calls (stores `priceAtCallC` snapshot at call time) but shows no scores.
- Phase 2 grades calls vs **real** prices accrued after the call date. Accuracy is a
  "builds over weeks/months" feature by design.

## Phase 1 — Directory + Heat (build now)

### Data model (Prisma → Neon Postgres)

```prisma
enum EntryCategory {
  YOUTUBER SOCIAL_CREATOR STREAMER_BREAKER INVESTOR_X PODCAST   // People (can log calls)
  MARKETPLACE LGS GROUP_BREAK                                   // Buy/Sell
  GRADING AUTHENTICATION                                        // Services
  TOOL_SITE NEWS_BLOG COMMUNITY                                 // Info
}

model Entry {
  id               String        @id @default(cuid())
  slug             String        @unique
  name             String
  category         EntryCategory
  bio              String?
  avatarUrl        String?
  status           String        @default("live")  // live | hidden
  voteScore        Int           @default(0)        // denormalized up - down
  heatScore        Float         @default(0)        // denormalized 0-100, recomputed daily
  youtubeChannelId String?       @unique
  ytSubscribers    Int?
  createdAt        DateTime      @default(now())
  links            EntryLink[]
  votes            EntryVote[]
  metrics          EntryMetric[]
  calls            CreatorCall[]

  @@index([category, heatScore])
  @@index([status])
}

model EntryLink {
  id       String @id @default(cuid())
  entryId  String
  entry    Entry  @relation(fields: [entryId], references: [id], onDelete: Cascade)
  platform String // youtube|instagram|tiktok|x|twitch|whatnot|website|discord|podcast
  url      String
}

model EntryVote {
  id        String   @id @default(cuid())
  entryId   String
  entry     Entry    @relation(fields: [entryId], references: [id], onDelete: Cascade)
  voterHash String   // hash(IP + UA + daily salt) — no login
  value     Int      // +1 / -1
  createdAt DateTime @default(now())
  @@unique([entryId, voterHash])
}

model EntryMetric { // daily snapshot — powers Heat + trend sparkline
  id            String   @id @default(cuid())
  entryId       String
  entry         Entry    @relation(fields: [entryId], references: [id], onDelete: Cascade)
  date          DateTime
  ytSubscribers Int?
  ytViews       BigInt?
  upvotes7d     Int?
  views7d       Int?
  @@unique([entryId, date])
}

model CreatorCall { // banked Phase 1; graded Phase 2
  id           String   @id @default(cuid())
  entryId      String
  entry        Entry    @relation(fields: [entryId], references: [id], onDelete: Cascade)
  cardId       String   // FK to Card
  card         Card     @relation(fields: [cardId], references: [id])
  direction    String   // "bullish" (extensible to "bearish")
  sourceUrl    String?  // link to the video/post
  calledAt     DateTime
  priceAtCallC Int?     // market price snapshot at call time (cents)
  createdAt    DateTime @default(now())
  @@index([entryId])
  @@index([cardId])
}
```

### Heat score

Recomputed daily (cron) from `EntryMetric`:

```
heat = w1 * pct(ytGrowth7d) + w2 * pct(upvoteVelocity7d) + w3 * pct(viewVelocity7d)
```

- `ytGrowth7d = (subs_today - subs_7dago) / subs_7dago` (null if no channel)
- `upvoteVelocity7d` = net upvotes in last 7 days
- `viewVelocity7d` = on-platform profile views in last 7 days
- `pct(...)` = percentile rank across all live entries → final score scaled 0–100.
- 7-day windows make it "trending now," not all-time size. Weights tunable; start
  `w1=0.5, w2=0.3, w3=0.2`. Entries with no data → heat 0.

### Pages (reuse dark panels, `SortableTable`, `MetricCard`, `MiniSparkline`, `SignalBadge`, `clr()`)

- **`/hub`** — directory landing. Category filter, sort by Heat / Votes / Newest. Rows:
  avatar (with `ImageOff` fallback), name, category, platform icons, Heat badge
  (gold ≥75 / green ≥50 / muted), vote arrows. Loading skeletons + `ErrorState`.
- **`/hub/[slug]`** — profile: links, Heat trend `MiniSparkline` (from `EntryMetric`),
  vote control, "Log a call" button. Phase 2 adds "cards covered" + accuracy stats.
- **Add-entry modal** — open (no login): name, category, links, optional YouTube URL
  (auto-resolve channelId via YouTube API). Client + Zod validation.

### Anti-abuse (honors "open, no login")

- IP rate-limit on submit and vote (e.g. 3 submits/hr, votes deduped per `voterHash`).
- Profanity + spam-URL filter on submit.
- Downvote-bury: `voteScore <= -3` → `status = "hidden"` automatically.
- Admin hide/review page (gated to an admin email) for manual takedowns.

### Integration

- New tRPC router `creators`: `list`, `byId`, `submit`, `vote`, `logCall`.
- New daily cron `/api/cron/sync-creators`: batch YouTube `channels.list` (≤50 ids/call,
  free, ~cheap quota) → write `EntryMetric` → recompute `heatScore`. Protected by
  `CRON_SECRET`, `maxDuration = 300`, bulk writes (same pattern as the fixed price cron).
- New env: `YOUTUBE_API_KEY` (free, Google Cloud).
- **Vercel Hobby cron limit:** Hobby caps the number of cron jobs. Either merge creator
  sync into the existing price cron path, or upgrade plan. Decide at planning time.
- `Card` gets a back-relation to `CreatorCall`.

### Out of scope (YAGNI) for Phase 1

Follows/notifications, comment threads, non-YouTube external metrics, NLP auto-call
extraction, voter reputation, and the accuracy scoreboard UI (Phase 2).

## Phase 2 — Accuracy Scoreboard (later, data-gated)

- Job grades each `CreatorCall`: return = `(currentPriceC - priceAtCallC) / priceAtCallC`,
  measured against a market baseline over the same window. Aggregate per entry →
  batting average + avg return per call.
- Surface on profiles ("cards covered", per-call result) and a new `/hub/scoreboard`
  leaderboard. "Hot but wrong" vs "quiet but right" framing for shareable content.
- Gate: only show once enough real (non-synthetic) price history exists after call dates.

## Success criteria

- Phase 1: a visitor can browse entries by category, see a non-empty Heat ranking on day 1
  (driven by YouTube growth), submit an entry without an account, and vote — with spam
  defenses active. Calls are recorded and stored with a price snapshot but not yet scored.
- Phase 2: creators show a real, honestly-graded accuracy record built from calls logged
  after launch.
