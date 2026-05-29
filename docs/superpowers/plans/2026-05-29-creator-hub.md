# Creator Hub — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a community directory of Pokémon-hobby people & resources — social links across platforms, organized by category, with open (no-login) submission, up/down voting, and a daily-recomputed "Heat" trending score. Card "calls" are banked (stored) but not yet graded (that is Phase 2).

**Architecture:** New Prisma models (`Entry`, `EntryLink`, `EntryVote`, `EntryMetric`, `CreatorCall`) on the existing Neon Postgres DB. A new `creators` tRPC router exposes `list/byId/submit/vote/logCall` (public) plus an admin `setStatus` guarded by a new `adminProcedure`. Heat is a pure function recomputed by a `runCreatorSync()` service that pulls YouTube channel stats; it is chained into the existing `/api/cron/sync-prices` route to stay within the Vercel Hobby cron limit, and also exposed at `/api/cron/sync-creators` for manual runs. Three pages under `/hub` reuse the existing dark-panel component library.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, tRPC + Zod + superjson, Prisma/Neon, NextAuth v5 (`auth()`), YouTube Data API v3 (`channels.list`), Recharts, Vitest.

---

## Design decisions locked for this plan

- **Cron strategy:** No second `vercel.json` cron entry (Hobby limit). `runCreatorSync()` is a reusable service called (a) at the end of the existing `/api/cron/sync-prices` route and (b) from a dedicated `/api/cron/sync-creators` route for manual/external triggering.
- **Rate-limiting on serverless:** in-memory counters are unreliable across Fluid Compute instances, so submission rate-limiting is **DB-based**. This requires one addition to the spec data model: `Entry.submitterHash String?` (indexed). Votes are already deduped by the `@@unique([entryId, voterHash])` constraint.
- **Admin gate:** `adminProcedure` checks `ctx.session.user.email === process.env.ADMIN_EMAIL`. Requires adding `session` to the tRPC context via `auth()`.
- **TDD boundary:** pure logic (`voterHash`, `isSpam`, `computeHeatScores`, `parseChannelInput`) is built test-first with Vitest. Router, cron routes, and pages are verified by build + the smoke-test checklist at the end — consistent with the current codebase, which has no DB-integration or component tests.

---

## File structure

**Create:**
- `src/lib/utils/voter.ts` — `voterHash()` + `isSpam()` (pure, tested)
- `src/lib/utils/voter.test.ts`
- `src/server/services/creator-heat.ts` — `computeHeatScores()` (pure, tested) + `runCreatorSync()` (service)
- `src/server/services/creator-heat.test.ts`
- `src/lib/api/youtube.ts` — `parseChannelInput()` (pure, tested) + `fetchYouTubeChannels()`
- `src/lib/api/youtube.test.ts`
- `src/server/routers/creators.ts` — the `creators` tRPC router
- `src/app/api/cron/sync-creators/route.ts` — manual/external trigger for `runCreatorSync()`
- `src/app/(dashboard)/hub/page.tsx` — directory landing
- `src/app/(dashboard)/hub/[slug]/page.tsx` — entry profile + add/vote/log-call client UI
- `src/app/(dashboard)/hub/admin/page.tsx` — admin hide/review (server-gated)
- `src/components/hub/AddEntryModal.tsx` — open submission modal
- `src/components/hub/VoteControl.tsx` — up/down vote arrows
- `src/components/hub/LogCallModal.tsx` — "log a call" form

**Modify:**
- `prisma/schema.prisma` — enum + 5 models + `Card` back-relation
- `src/lib/trpc/index.ts` — add `session` to context, add `adminProcedure`
- `src/server/routers/index.ts` — register `creators` router
- `src/app/api/cron/sync-prices/route.ts` — chain `runCreatorSync()` at the end
- `src/components/layout/TopNav.tsx` — add `/hub` nav link
- `next.config.ts` — allow YouTube avatar host(s)
- `.env.example` — add `YOUTUBE_API_KEY`, `ADMIN_EMAIL`

---

## Task 1: Prisma schema — Creator Hub models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the enum and models**

Append to `prisma/schema.prisma`:

```prisma
enum EntryCategory {
  YOUTUBER
  SOCIAL_CREATOR
  STREAMER_BREAKER
  INVESTOR_X
  PODCAST
  MARKETPLACE
  LGS
  GROUP_BREAK
  GRADING
  AUTHENTICATION
  TOOL_SITE
  NEWS_BLOG
  COMMUNITY
}

model Entry {
  id               String        @id @default(cuid())
  slug             String        @unique
  name             String
  category         EntryCategory
  bio              String?
  avatarUrl        String?
  status           String        @default("live") // live | hidden
  voteScore        Int           @default(0)
  heatScore        Float         @default(0)
  youtubeChannelId String?       @unique
  ytSubscribers    Int?
  submitterHash    String?
  createdAt        DateTime      @default(now())
  links            EntryLink[]
  votes            EntryVote[]
  metrics          EntryMetric[]
  calls            CreatorCall[]

  @@index([category, heatScore])
  @@index([status])
  @@index([submitterHash])
}

model EntryLink {
  id       String @id @default(cuid())
  entryId  String
  entry    Entry  @relation(fields: [entryId], references: [id], onDelete: Cascade)
  platform String
  url      String

  @@index([entryId])
}

model EntryVote {
  id        String   @id @default(cuid())
  entryId   String
  entry     Entry    @relation(fields: [entryId], references: [id], onDelete: Cascade)
  voterHash String
  value     Int
  createdAt DateTime @default(now())

  @@unique([entryId, voterHash])
}

model EntryMetric {
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

model CreatorCall {
  id           String   @id @default(cuid())
  entryId      String
  entry        Entry    @relation(fields: [entryId], references: [id], onDelete: Cascade)
  cardId       String
  card         Card     @relation(fields: [cardId], references: [id])
  direction    String   // "bullish" (extensible to "bearish")
  sourceUrl    String?
  calledAt     DateTime
  priceAtCallC Int?
  createdAt    DateTime @default(now())

  @@index([entryId])
  @@index([cardId])
}
```

- [ ] **Step 2: Add the back-relation to `Card`**

In `prisma/schema.prisma`, find the `Card` model's relation block (currently ends with `alerts        PriceAlert[]`) and add one line:

```prisma
  alerts        PriceAlert[]
  creatorCalls  CreatorCall[]
```

- [ ] **Step 3: Generate the migration**

Run (Node 22 + Postgres 16 must be active per CLAUDE.md):

```bash
export PATH="/usr/local/opt/postgresql@16/bin:/usr/local/opt/node@22/bin:$PATH"
npx prisma migrate dev --name add_creator_hub
```

Expected: a new folder under `prisma/migrations/` and "Your database is now in sync with your schema." If Neon auto-suspended, re-run once.

- [ ] **Step 4: Regenerate the client**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client".

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Creator Hub data model (Entry, links, votes, metrics, calls)"
```

---

## Task 2: Pure utils — voter hash & spam filter (TDD)

**Files:**
- Create: `src/lib/utils/voter.ts`
- Test: `src/lib/utils/voter.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/utils/voter.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { voterHash, isSpam } from "./voter";

describe("voterHash", () => {
  const day = new Date("2026-05-29T12:00:00Z");

  it("is deterministic for the same ip+ua+day", () => {
    expect(voterHash("1.2.3.4", "UA", day)).toBe(voterHash("1.2.3.4", "UA", day));
  });

  it("differs when the day changes (daily salt)", () => {
    const next = new Date("2026-05-30T12:00:00Z");
    expect(voterHash("1.2.3.4", "UA", day)).not.toBe(voterHash("1.2.3.4", "UA", next));
  });

  it("differs for different IPs", () => {
    expect(voterHash("1.2.3.4", "UA", day)).not.toBe(voterHash("9.9.9.9", "UA", day));
  });

  it("returns a 64-char hex string", () => {
    expect(voterHash("1.2.3.4", "UA", day)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("isSpam", () => {
  it("flags text containing more than two URLs", () => {
    expect(isSpam("buy http://a.com http://b.com http://c.com now")).toBe(true);
  });

  it("flags banned promo terms", () => {
    expect(isSpam("CHEAP VIAGRA cards")).toBe(true);
  });

  it("passes a normal creator bio", () => {
    expect(isSpam("Vintage WOTC breaks every Friday at twitch.tv/example")).toBe(false);
  });

  it("passes empty input", () => {
    expect(isSpam("")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
export PATH="/usr/local/opt/node@22/bin:$PATH"
npm run test -- src/lib/utils/voter.test.ts
```

Expected: FAIL — cannot find module `./voter`.

- [ ] **Step 3: Implement**

`src/lib/utils/voter.ts`:

```typescript
import { createHash } from "crypto";

/**
 * Anonymous, rotating voter/submitter fingerprint for the no-login Creator Hub.
 * The daily salt means a fingerprint cannot be tracked across days, while still
 * deduping votes and rate-limiting submissions within a single day.
 */
export function voterHash(ip: string, ua: string, day: Date): string {
  const salt = day.toISOString().slice(0, 10); // YYYY-MM-DD
  return createHash("sha256").update(`${ip}|${ua}|${salt}`).digest("hex");
}

const BANNED_TERMS = [
  "viagra",
  "casino",
  "porn",
  "crypto airdrop",
  "free money",
  "click here to win",
];

const URL_RE = /https?:\/\/\S+/gi;

/** Cheap, dependency-free spam screen for open submissions. */
export function isSpam(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (BANNED_TERMS.some((t) => lower.includes(t))) return true;
  const urls = text.match(URL_RE);
  if (urls && urls.length > 2) return true;
  return false;
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test -- src/lib/utils/voter.test.ts
```

Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/voter.ts src/lib/utils/voter.test.ts
git commit -m "feat: add voterHash + spam filter utils for Creator Hub"
```

---

## Task 3: Heat score — pure function (TDD)

**Files:**
- Create: `src/server/services/creator-heat.ts`
- Test: `src/server/services/creator-heat.test.ts`

- [ ] **Step 1: Write the failing test**

`src/server/services/creator-heat.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeHeatScores, type HeatInput } from "./creator-heat";

describe("computeHeatScores", () => {
  it("returns 0 for an entry with no signal", () => {
    const inputs: HeatInput[] = [
      { entryId: "a", ytGrowth7d: null, upvoteVel7d: 0, viewVel7d: 0 },
    ];
    expect(computeHeatScores(inputs).get("a")).toBe(0);
  });

  it("ranks the strongest entry highest and scales 0-100", () => {
    const inputs: HeatInput[] = [
      { entryId: "low", ytGrowth7d: 0.0, upvoteVel7d: 0, viewVel7d: 0 },
      { entryId: "mid", ytGrowth7d: 0.05, upvoteVel7d: 5, viewVel7d: 10 },
      { entryId: "high", ytGrowth7d: 0.2, upvoteVel7d: 50, viewVel7d: 100 },
    ];
    const scores = computeHeatScores(inputs);
    expect(scores.get("high")).toBe(100);
    expect(scores.get("low")).toBe(0);
    expect(scores.get("mid")!).toBeGreaterThan(0);
    expect(scores.get("mid")!).toBeLessThan(100);
  });

  it("treats null ytGrowth as the lowest growth value", () => {
    const inputs: HeatInput[] = [
      { entryId: "nogrowth", ytGrowth7d: null, upvoteVel7d: 10, viewVel7d: 10 },
      { entryId: "growth", ytGrowth7d: 0.1, upvoteVel7d: 10, viewVel7d: 10 },
    ];
    const scores = computeHeatScores(inputs);
    expect(scores.get("growth")!).toBeGreaterThan(scores.get("nogrowth")!);
  });

  it("returns an empty map for empty input", () => {
    expect(computeHeatScores([]).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test -- src/server/services/creator-heat.test.ts
```

Expected: FAIL — cannot find `computeHeatScores`.

- [ ] **Step 3: Implement the pure function**

Create `src/server/services/creator-heat.ts` with the pure logic first (the `runCreatorSync` service is added in Task 6):

```typescript
export interface HeatInput {
  entryId: string;
  ytGrowth7d: number | null; // fractional 7-day subscriber growth, null if no channel
  upvoteVel7d: number; // net upvotes in last 7 days
  viewVel7d: number; // profile views in last 7 days
}

// Weights — see spec. Tunable.
const W_GROWTH = 0.5;
const W_UPVOTE = 0.3;
const W_VIEW = 0.2;

/** Percentile rank of each value within `values`, in [0,1]. Ties share the lower rank. */
function percentiles(values: number[]): number[] {
  const n = values.length;
  if (n <= 1) return values.map(() => 0);
  return values.map((v) => {
    const below = values.filter((x) => x < v).length;
    return below / (n - 1);
  });
}

/**
 * Recency-weighted "trending now" score per entry, scaled 0-100.
 * Each signal is converted to a percentile rank across all entries, then blended.
 * Entries whose every signal is the minimum collapse to 0.
 */
export function computeHeatScores(inputs: HeatInput[]): Map<string, number> {
  const out = new Map<string, number>();
  if (inputs.length === 0) return out;

  // null growth sorts as the lowest value so "no channel" never beats real growth.
  const growth = inputs.map((i) => (i.ytGrowth7d == null ? -Infinity : i.ytGrowth7d));
  const upvote = inputs.map((i) => i.upvoteVel7d);
  const view = inputs.map((i) => i.viewVel7d);

  const pg = percentiles(growth);
  const pu = percentiles(upvote);
  const pv = percentiles(view);

  inputs.forEach((input, idx) => {
    const blended = W_GROWTH * pg[idx] + W_UPVOTE * pu[idx] + W_VIEW * pv[idx];
    out.set(input.entryId, Math.round(blended * 100));
  });
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test -- src/server/services/creator-heat.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/services/creator-heat.ts src/server/services/creator-heat.test.ts
git commit -m "feat: add Creator Hub heat score pure function"
```

---

## Task 4: YouTube API client (TDD on parsing, mocked fetch)

**Files:**
- Create: `src/lib/api/youtube.ts`
- Test: `src/lib/api/youtube.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/api/youtube.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import { parseChannelInput, fetchYouTubeChannels } from "./youtube";

describe("parseChannelInput", () => {
  it("extracts a channel id from a /channel/ URL", () => {
    expect(parseChannelInput("https://youtube.com/channel/UC123abc")).toEqual({
      kind: "id",
      value: "UC123abc",
    });
  });

  it("extracts a handle from an @handle URL", () => {
    expect(parseChannelInput("https://www.youtube.com/@SomeCreator")).toEqual({
      kind: "handle",
      value: "SomeCreator",
    });
  });

  it("treats a bare @handle as a handle", () => {
    expect(parseChannelInput("@SomeCreator")).toEqual({ kind: "handle", value: "SomeCreator" });
  });

  it("treats a raw UC id as an id", () => {
    expect(parseChannelInput("UCabc123def456ghi789jkl0")).toEqual({
      kind: "id",
      value: "UCabc123def456ghi789jkl0",
    });
  });

  it("returns unknown for unrelated input", () => {
    expect(parseChannelInput("https://twitch.tv/foo").kind).toBe("unknown");
  });
});

describe("fetchYouTubeChannels", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("maps channels.list statistics into stats objects", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "UC123",
              snippet: { title: "Creator", thumbnails: { default: { url: "http://img" } } },
              statistics: { subscriberCount: "1000", viewCount: "50000" },
            },
          ],
        }),
      }))
    );

    const res = await fetchYouTubeChannels(["UC123"]);
    expect(res).toEqual([
      { channelId: "UC123", title: "Creator", avatarUrl: "http://img", subscribers: 1000, views: 50000 },
    ]);
  });

  it("returns [] when no api key is configured", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    expect(await fetchYouTubeChannels(["UC123"])).toEqual([]);
  });

  it("returns [] for empty id list", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    expect(await fetchYouTubeChannels([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test -- src/lib/api/youtube.test.ts
```

Expected: FAIL — cannot find module `./youtube`.

- [ ] **Step 3: Implement**

`src/lib/api/youtube.ts`:

```typescript
export interface YTChannelStats {
  channelId: string;
  title: string;
  avatarUrl: string | null;
  subscribers: number | null;
  views: number | null;
}

type ParsedChannel =
  | { kind: "id"; value: string }
  | { kind: "handle"; value: string }
  | { kind: "unknown"; value: string };

/** Parse the many forms a user might paste for a YouTube channel into a lookup key. */
export function parseChannelInput(input: string): ParsedChannel {
  const trimmed = input.trim();
  const channelMatch = trimmed.match(/youtube\.com\/channel\/([A-Za-z0-9_-]+)/);
  if (channelMatch) return { kind: "id", value: channelMatch[1] };

  const handleUrl = trimmed.match(/youtube\.com\/@([A-Za-z0-9_.-]+)/);
  if (handleUrl) return { kind: "handle", value: handleUrl[1] };

  if (trimmed.startsWith("@")) return { kind: "handle", value: trimmed.slice(1) };

  if (/^UC[A-Za-z0-9_-]{20,}$/.test(trimmed)) return { kind: "id", value: trimmed };

  return { kind: "unknown", value: trimmed };
}

interface YTApiItem {
  id: string;
  snippet?: { title?: string; thumbnails?: { default?: { url?: string } } };
  statistics?: { subscriberCount?: string; viewCount?: string };
}

const toNum = (s: string | undefined): number | null =>
  s == null || s === "" ? null : Number(s);

/**
 * Batch up to 50 channel ids per `channels.list` call (free quota ~1 unit/call).
 * Returns [] if no API key is set so callers degrade gracefully.
 */
export async function fetchYouTubeChannels(ids: string[]): Promise<YTChannelStats[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || ids.length === 0) return [];

  const out: YTChannelStats[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url =
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics` +
      `&id=${batch.join(",")}&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = (await res.json()) as { items?: YTApiItem[] };
    for (const item of data.items ?? []) {
      out.push({
        channelId: item.id,
        title: item.snippet?.title ?? "",
        avatarUrl: item.snippet?.thumbnails?.default?.url ?? null,
        subscribers: toNum(item.statistics?.subscriberCount),
        views: toNum(item.statistics?.viewCount),
      });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test -- src/lib/api/youtube.test.ts
```

Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/youtube.ts src/lib/api/youtube.test.ts
git commit -m "feat: add YouTube channel stats client for Creator Hub"
```

---

## Task 5: tRPC context session + adminProcedure

**Files:**
- Modify: `src/lib/trpc/index.ts`

- [ ] **Step 1: Add `session` to the context and an `adminProcedure`**

Edit `src/lib/trpc/index.ts`. Add imports at the top:

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import superjson from "superjson";
import { ZodError } from "zod";
```

Replace `createTRPCContext` so it resolves the NextAuth session (JWT-based, no DB hit):

```typescript
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  return {
    db,
    session,
    ...opts,
  };
};
```

At the bottom, after `export const publicProcedure = t.procedure;`, add:

```typescript
/** Procedure restricted to the configured admin email. */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  const email = ctx.session?.user?.email;
  if (!email || email !== process.env.ADMIN_EMAIL) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
  return next({ ctx });
});
```

- [ ] **Step 2: Verify it type-checks**

```bash
export PATH="/usr/local/opt/node@22/bin:$PATH"
npx tsc --noEmit
```

Expected: no new errors referencing `src/lib/trpc/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/trpc/index.ts
git commit -m "feat: add session to tRPC context + adminProcedure"
```

---

## Task 6: Creator sync service (Heat recompute)

**Files:**
- Create: `src/server/services/creator-sync.ts`

> Kept in a separate file from `creator-heat.ts` so the pure heat test never imports Prisma.

- [ ] **Step 1: Create the sync service**

`src/server/services/creator-sync.ts`:

```typescript
import { db } from "@/lib/db";
import { fetchYouTubeChannels } from "@/lib/api/youtube";
import { computeHeatScores, type HeatInput } from "./creator-heat";

export interface CreatorSyncResult {
  entriesProcessed: number;
  channelsFetched: number;
}

/**
 * Daily creator sync: pull YouTube stats for entries with a channel, snapshot an
 * EntryMetric row, then recompute every live entry's heatScore from the latest
 * metrics + 7-day vote velocity. Idempotent per UTC day (EntryMetric upsert).
 */
export async function runCreatorSync(): Promise<CreatorSyncResult> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const entries = await db.entry.findMany({
    where: { status: "live" },
    select: { id: true, youtubeChannelId: true },
  });

  // 1. Fetch YouTube stats for entries that have a channel id.
  const channelIds = entries
    .map((e) => e.youtubeChannelId)
    .filter((id): id is string => !!id);
  const stats = await fetchYouTubeChannels(channelIds);
  const statByChannel = new Map(stats.map((s) => [s.channelId, s]));

  // 2. Compute 7-day vote velocity per entry (net up-votes in window).
  const recentVotes = await db.entryVote.groupBy({
    by: ["entryId"],
    where: { createdAt: { gte: weekAgo } },
    _sum: { value: true },
  });
  const voteVelByEntry = new Map(
    recentVotes.map((v) => [v.entryId, v._sum.value ?? 0])
  );

  // 3. Snapshot today's EntryMetric + gather Heat inputs.
  const heatInputs: HeatInput[] = [];
  for (const e of entries) {
    const s = e.youtubeChannelId ? statByChannel.get(e.youtubeChannelId) : undefined;

    // 7-day-ago subscriber count for growth (null if we lack history).
    const prior = await db.entryMetric.findFirst({
      where: { entryId: e.id, date: { lte: weekAgo } },
      orderBy: { date: "desc" },
    });
    const ytGrowth7d =
      s?.subscribers != null && prior?.ytSubscribers != null && prior.ytSubscribers > 0
        ? (s.subscribers - prior.ytSubscribers) / prior.ytSubscribers
        : null;

    const upvoteVel7d = voteVelByEntry.get(e.id) ?? 0;
    const views7d = 0; // on-platform view tracking not yet implemented (Phase 1)

    await db.entryMetric.upsert({
      where: { entryId_date: { entryId: e.id, date: today } },
      update: {
        ytSubscribers: s?.subscribers ?? null,
        ytViews: s?.views != null ? BigInt(s.views) : null,
        upvotes7d: upvoteVel7d,
        views7d,
      },
      create: {
        entryId: e.id,
        date: today,
        ytSubscribers: s?.subscribers ?? null,
        ytViews: s?.views != null ? BigInt(s.views) : null,
        upvotes7d: upvoteVel7d,
        views7d,
      },
    });

    heatInputs.push({ entryId: e.id, ytGrowth7d, upvoteVel7d, viewVel7d: views7d });

    // Keep denormalized subscriber count fresh on the Entry too.
    if (s?.subscribers != null) {
      await db.entry.update({
        where: { id: e.id },
        data: { ytSubscribers: s.subscribers },
      });
    }
  }

  // 4. Recompute + persist heat scores.
  const heat = computeHeatScores(heatInputs);
  for (const [entryId, score] of heat) {
    await db.entry.update({ where: { id: entryId }, data: { heatScore: score } });
  }

  return { entriesProcessed: entries.length, channelsFetched: stats.length };
}
```

- [ ] **Step 2: Verify it type-checks and the heat test still passes**

```bash
export PATH="/usr/local/opt/node@22/bin:$PATH"
npm run test -- src/server/services/creator-heat.test.ts
npx tsc --noEmit
```

Expected: 4 tests PASS; no new TS errors. (The pure `computeHeatScores` test is unaffected — `runCreatorSync` lives in a separate file.)

- [ ] **Step 3: Commit**

```bash
git add src/server/services/creator-sync.ts
git commit -m "feat: add runCreatorSync service (YouTube snapshot + heat recompute)"
```

---

## Task 7: creators tRPC router

**Files:**
- Create: `src/server/routers/creators.ts`
- Modify: `src/server/routers/index.ts`

- [ ] **Step 1: Write the router**

`src/server/routers/creators.ts`:

```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, adminProcedure } from "@/lib/trpc";
import { voterHash, isSpam } from "@/lib/utils/voter";
import { parseChannelInput, fetchYouTubeChannels } from "@/lib/api/youtube";

const CATEGORIES = [
  "YOUTUBER", "SOCIAL_CREATOR", "STREAMER_BREAKER", "INVESTOR_X", "PODCAST",
  "MARKETPLACE", "LGS", "GROUP_BREAK", "GRADING", "AUTHENTICATION",
  "TOOL_SITE", "NEWS_BLOG", "COMMUNITY",
] as const;

const SUBMIT_LIMIT_PER_DAY = 3;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

function fingerprint(headers: Headers): string {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = headers.get("user-agent") ?? "";
  return voterHash(ip, ua, new Date());
}

export const creatorsRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        category: z.enum(CATEGORIES).optional(),
        sort: z.enum(["heat", "votes", "newest"]).default("heat"),
      })
    )
    .query(async ({ ctx, input }) => {
      const orderBy =
        input.sort === "votes"
          ? { voteScore: "desc" as const }
          : input.sort === "newest"
            ? { createdAt: "desc" as const }
            : { heatScore: "desc" as const };

      return ctx.db.entry.findMany({
        where: { status: "live", ...(input.category ? { category: input.category } : {}) },
        orderBy,
        include: { links: true },
        take: 200,
      });
    }),

  byId: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const entry = await ctx.db.entry.findUnique({
        where: { slug: input.slug },
        include: {
          links: true,
          metrics: { orderBy: { date: "asc" }, take: 90 },
          calls: {
            orderBy: { calledAt: "desc" },
            take: 50,
            include: { card: { select: { id: true, name: true, imageSmall: true } } },
          },
        },
      });
      if (!entry || entry.status !== "live") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return entry;
    }),

  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(80),
        category: z.enum(CATEGORIES),
        bio: z.string().max(500).optional(),
        youtubeUrl: z.string().url().optional(),
        links: z
          .array(z.object({ platform: z.string().min(1), url: z.string().url() }))
          .max(8)
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (isSpam(`${input.name} ${input.bio ?? ""}`)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Submission flagged as spam" });
      }

      const submitterHash = fingerprint(ctx.headers);
      const since = new Date(Date.now() - 60 * 60 * 1000); // last hour
      const recent = await ctx.db.entry.count({
        where: { submitterHash, createdAt: { gte: since } },
      });
      if (recent >= SUBMIT_LIMIT_PER_DAY) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Slow down — try again later" });
      }

      // Resolve a YouTube channel id + avatar when a YouTube URL is provided.
      let youtubeChannelId: string | null = null;
      let avatarUrl: string | null = null;
      let ytSubscribers: number | null = null;
      if (input.youtubeUrl) {
        const parsed = parseChannelInput(input.youtubeUrl);
        if (parsed.kind === "id") {
          const [stat] = await fetchYouTubeChannels([parsed.value]);
          if (stat) {
            youtubeChannelId = stat.channelId;
            avatarUrl = stat.avatarUrl;
            ytSubscribers = stat.subscribers;
          }
        }
      }

      // Ensure a unique slug.
      let slug = slugify(input.name) || `entry-${Date.now()}`;
      if (await ctx.db.entry.findUnique({ where: { slug } })) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      }

      const links = [...input.links];
      if (input.youtubeUrl) links.push({ platform: "youtube", url: input.youtubeUrl });

      return ctx.db.entry.create({
        data: {
          slug,
          name: input.name,
          category: input.category,
          bio: input.bio,
          avatarUrl,
          youtubeChannelId,
          ytSubscribers,
          submitterHash,
          links: { create: links },
        },
        include: { links: true },
      });
    }),

  vote: publicProcedure
    .input(z.object({ entryId: z.string(), value: z.union([z.literal(1), z.literal(-1)]) }))
    .mutation(async ({ ctx, input }) => {
      const voter = fingerprint(ctx.headers);

      // Upsert this voter's vote; recompute the denormalized score from scratch.
      await ctx.db.entryVote.upsert({
        where: { entryId_voterHash: { entryId: input.entryId, voterHash: voter } },
        update: { value: input.value },
        create: { entryId: input.entryId, voterHash: voter, value: input.value },
      });

      const agg = await ctx.db.entryVote.aggregate({
        where: { entryId: input.entryId },
        _sum: { value: true },
      });
      const voteScore = agg._sum.value ?? 0;

      // Downvote-bury: auto-hide entries the community pushes to -3 or below.
      const status = voteScore <= -3 ? "hidden" : "live";
      await ctx.db.entry.update({
        where: { id: input.entryId },
        data: { voteScore, status },
      });

      return { voteScore, status };
    }),

  logCall: publicProcedure
    .input(
      z.object({
        entryId: z.string(),
        cardId: z.string(),
        direction: z.literal("bullish").default("bullish"),
        sourceUrl: z.string().url().optional(),
        calledAt: z.date().default(() => new Date()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Bank the price snapshot at call time (Phase 2 grades against forward prices).
      const latest = await ctx.db.cardPrice.findFirst({
        where: { cardId: input.cardId },
        orderBy: { date: "desc" },
        select: { marketPrice: true },
      });

      return ctx.db.creatorCall.create({
        data: {
          entryId: input.entryId,
          cardId: input.cardId,
          direction: input.direction,
          sourceUrl: input.sourceUrl,
          calledAt: input.calledAt,
          priceAtCallC: latest?.marketPrice ?? null,
        },
      });
    }),

  // ── Admin ──────────────────────────────────────────────────────────────────
  adminList: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.entry.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  }),

  adminSetStatus: adminProcedure
    .input(z.object({ entryId: z.string(), status: z.enum(["live", "hidden"]) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.entry.update({
        where: { id: input.entryId },
        data: { status: input.status },
      });
    }),
});
```

- [ ] **Step 2: Register the router**

Edit `src/server/routers/index.ts`:

```typescript
import { createTRPCRouter } from "@/lib/trpc";
import { cardsRouter } from "./cards";
import { setsRouter } from "./sets";
import { analyticsRouter } from "./analytics";
import { pricesRouter } from "./prices";
import { sealedRouter } from "./sealed";
import { creatorsRouter } from "./creators";

export const appRouter = createTRPCRouter({
  cards: cardsRouter,
  sets: setsRouter,
  prices: pricesRouter,
  analytics: analyticsRouter,
  sealed: sealedRouter,
  creators: creatorsRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 3: Verify it type-checks**

```bash
export PATH="/usr/local/opt/node@22/bin:$PATH"
npx tsc --noEmit
```

Expected: no errors in `creators.ts` or `index.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/server/routers/creators.ts src/server/routers/index.ts
git commit -m "feat: add creators tRPC router (list/byId/submit/vote/logCall + admin)"
```

---

## Task 8: Cron — sync-creators route + chain into sync-prices

**Files:**
- Create: `src/app/api/cron/sync-creators/route.ts`
- Modify: `src/app/api/cron/sync-prices/route.ts`

- [ ] **Step 1: Create the dedicated route**

`src/app/api/cron/sync-creators/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { runCreatorSync } from "@/server/services/creator-sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/sync-creators
 * Manual / external trigger for the creator Heat sync. Scheduled runs piggyback
 * on /api/cron/sync-prices (Vercel Hobby allows only one cron entry).
 * Protected by CRON_SECRET, matching the price cron.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret =
    url.searchParams.get("secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCreatorSync();
    return NextResponse.json({ status: "ok", ...result, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[cron/sync-creators] failed", { error: (err as Error).message });
    return NextResponse.json(
      { status: "error", message: (err as Error).message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Chain it into the price cron**

In `src/app/api/cron/sync-prices/route.ts`, add the import near the other imports:

```typescript
import { runCreatorSync } from "@/server/services/creator-sync";
```

Then, inside the `GET` handler's `try` block, **after** `const indexValue = await recomputeIndexSnapshot(today);` and **before** the `const elapsed = ...` line, add:

```typescript
    // Piggyback the creator Heat sync onto the daily cron (Hobby cron-count limit).
    // Failure here must not fail the price sync, so swallow + log.
    let creatorSync: Awaited<ReturnType<typeof runCreatorSync>> | null = null;
    try {
      creatorSync = await runCreatorSync();
    } catch (e) {
      console.error("[cron/sync-prices] creator sync failed", (e as Error).message);
    }
```

Then add `creatorSync` to the success-response JSON object (the `return NextResponse.json({ status: "ok", ... })` near the end of the `try`):

```typescript
      indexValue,
      creatorSync,
      elapsedSeconds: Number(elapsed),
```

- [ ] **Step 3: Verify build/type-check**

```bash
export PATH="/usr/local/opt/node@22/bin:$PATH"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/sync-creators/route.ts src/app/api/cron/sync-prices/route.ts
git commit -m "feat: add creator sync cron route + chain into price cron"
```

---

## Task 9: Hub directory landing page (`/hub`)

**Files:**
- Create: `src/app/(dashboard)/hub/page.tsx`
- Create: `src/components/hub/VoteControl.tsx`

- [ ] **Step 1: Create the VoteControl component**

`src/components/hub/VoteControl.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

export function VoteControl({ entryId, initialScore }: { entryId: string; initialScore: number }) {
  const [score, setScore] = useState(initialScore);
  const [pending, setPending] = useState(false);
  const vote = trpc.creators.vote.useMutation({
    onSuccess: (res) => setScore(res.voteScore),
    onSettled: () => setPending(false),
  });

  const cast = (value: 1 | -1) => {
    setPending(true);
    vote.mutate({ entryId, value });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button
        onClick={() => cast(1)}
        disabled={pending}
        aria-label="Upvote"
        style={{ background: "none", border: "none", cursor: "pointer", color: "#22c55e", padding: 2 }}
      >
        <ChevronUp size={16} />
      </button>
      <span
        style={{
          fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
          fontSize: 13,
          color: score > 0 ? "#22c55e" : score < 0 ? "#ef4444" : "#94a3b8",
          minWidth: 24,
          textAlign: "center",
        }}
      >
        {score}
      </span>
      <button
        onClick={() => cast(-1)}
        disabled={pending}
        aria-label="Downvote"
        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2 }}
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create the landing page**

`src/app/(dashboard)/hub/page.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageOff, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { ErrorState } from "@/components/ui/ErrorState";
import { VoteControl } from "@/components/hub/VoteControl";
import { AddEntryModal } from "@/components/hub/AddEntryModal";

const PANEL = { background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 };

const CATEGORIES = [
  "YOUTUBER", "SOCIAL_CREATOR", "STREAMER_BREAKER", "INVESTOR_X", "PODCAST",
  "MARKETPLACE", "LGS", "GROUP_BREAK", "GRADING", "AUTHENTICATION",
  "TOOL_SITE", "NEWS_BLOG", "COMMUNITY",
] as const;
type Category = (typeof CATEGORIES)[number];
const labelFor = (c: string) => c.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

function heatColor(h: number) {
  return h >= 75 ? "#fbbf24" : h >= 50 ? "#22c55e" : "#94a3b8";
}

export default function HubPage() {
  const [category, setCategory] = useState<Category | "">("");
  const [sort, setSort] = useState<"heat" | "votes" | "newest">("heat");
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, isError, refetch } = trpc.creators.list.useQuery({
    category: category || undefined,
    sort,
  });
  const entries = useMemo(() => data ?? [], [data]);

  return (
    <div className="main-content" style={{ maxWidth: 1440, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Creator Hub</h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
            People & resources across the Pokémon hobby — ranked by community Heat.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "#fbbf24",
            color: "#0a0f1c", border: "none", borderRadius: 6, padding: "8px 14px",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}
        >
          <Plus size={15} /> Add entry
        </button>
      </div>

      {/* Filters */}
      <div style={{ ...PANEL, marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "")}
          style={{ background: "#0a0f1c", color: "#f1f5f9", border: "1px solid #1e293b", borderRadius: 6, padding: "6px 10px" }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{labelFor(c)}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          style={{ background: "#0a0f1c", color: "#f1f5f9", border: "1px solid #1e293b", borderRadius: 6, padding: "6px 10px" }}
        >
          <option value="heat">Sort: Heat</option>
          <option value="votes">Sort: Votes</option>
          <option value="newest">Sort: Newest</option>
        </select>
      </div>

      {isError ? (
        <ErrorState message="Failed to load the directory." onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div style={PANEL}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 6 }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ ...PANEL, textAlign: "center", color: "#64748b" }}>
          No entries yet — be the first to add one.
        </div>
      ) : (
        <div style={{ ...PANEL, padding: 0 }}>
          {entries.map((e) => (
            <div
              key={e.id}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                borderBottom: "1px solid #1e293b",
              }}
            >
              {e.avatarUrl ? (
                <Image src={e.avatarUrl} alt={e.name} width={40} height={40} style={{ borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ImageOff size={20} color="#334155" />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/hub/${e.slug}`} style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                  {e.name}
                </Link>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {labelFor(e.category)}
                  {e.links.length > 0 && ` · ${e.links.map((l) => l.platform).join(", ")}`}
                </div>
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
                  color: heatColor(e.heatScore), background: `${heatColor(e.heatScore)}15`,
                  padding: "3px 8px", borderRadius: 4,
                }}
              >
                {Math.round(e.heatScore)}
              </span>
              <VoteControl entryId={e.id} initialScore={e.voteScore} />
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddEntryModal onClose={() => setShowAdd(false)} onSubmitted={() => { setShowAdd(false); void refetch(); }} />}
    </div>
  );
}
```

- [ ] **Step 3: Commit (page won't fully build until Task 10 adds the modal — build verified there)**

```bash
git add src/app/(dashboard)/hub/page.tsx src/components/hub/VoteControl.tsx
git commit -m "feat: add Creator Hub directory landing page + vote control"
```

---

## Task 10: Add-entry modal + Log-call modal

**Files:**
- Create: `src/components/hub/AddEntryModal.tsx`
- Create: `src/components/hub/LogCallModal.tsx`

- [ ] **Step 1: AddEntryModal**

`src/components/hub/AddEntryModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const CATEGORIES = [
  "YOUTUBER", "SOCIAL_CREATOR", "STREAMER_BREAKER", "INVESTOR_X", "PODCAST",
  "MARKETPLACE", "LGS", "GROUP_BREAK", "GRADING", "AUTHENTICATION",
  "TOOL_SITE", "NEWS_BLOG", "COMMUNITY",
] as const;
const labelFor = (c: string) => c.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

const FIELD = {
  width: "100%", background: "#0a0f1c", color: "#f1f5f9",
  border: "1px solid #1e293b", borderRadius: 6, padding: "8px 10px", marginTop: 4,
};

export function AddEntryModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("YOUTUBER");
  const [bio, setBio] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = trpc.creators.submit.useMutation({
    onSuccess: onSubmitted,
    onError: (e) => setError(e.message || "Submission failed"),
  });

  const handleSubmit = () => {
    setError(null);
    if (name.trim().length < 2) return setError("Name must be at least 2 characters");
    const links: { platform: string; url: string }[] = [];
    if (website.trim()) links.push({ platform: "website", url: website.trim() });
    submit.mutate({
      name: name.trim(),
      category,
      bio: bio.trim() || undefined,
      youtubeUrl: youtubeUrl.trim() || undefined,
      links,
    });
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "#000000aa", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 10, padding: 24, width: 440, maxWidth: "100%" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Add to the Hub</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <X size={18} />
          </button>
        </div>

        <label style={{ fontSize: 12, color: "#94a3b8" }}>
          Name *
          <input value={name} onChange={(e) => setName(e.target.value)} style={FIELD} />
        </label>
        <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginTop: 12 }}>
          Category *
          <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} style={FIELD}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{labelFor(c)}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginTop: 12 }}>
          YouTube URL (optional — unlocks Heat tracking)
          <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/@…" style={FIELD} />
        </label>
        <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginTop: 12 }}>
          Website / other link (optional)
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" style={FIELD} />
        </label>
        <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginTop: 12 }}>
          Bio (optional)
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} style={{ ...FIELD, resize: "vertical" }} />
        </label>

        {error && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 12 }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submit.isPending}
          style={{ width: "100%", marginTop: 18, background: "#fbbf24", color: "#0a0f1c", border: "none", borderRadius: 6, padding: "10px", fontWeight: 700, cursor: "pointer" }}
        >
          {submit.isPending ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: LogCallModal**

`src/components/hub/LogCallModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const FIELD = {
  width: "100%", background: "#0a0f1c", color: "#f1f5f9",
  border: "1px solid #1e293b", borderRadius: 6, padding: "8px 10px", marginTop: 4,
};

export function LogCallModal({ entryId, onClose, onLogged }: { entryId: string; onClose: () => void; onLogged: () => void }) {
  const [query, setQuery] = useState("");
  const [cardId, setCardId] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: results } = trpc.cards.list.useQuery(
    { search: query, limit: 8 },
    { enabled: query.trim().length >= 2 }
  );

  const log = trpc.creators.logCall.useMutation({
    onSuccess: onLogged,
    onError: (e) => setError(e.message || "Failed to log call"),
  });

  const submit = () => {
    setError(null);
    if (!cardId) return setError("Pick a card first");
    log.mutate({ entryId, cardId, sourceUrl: sourceUrl.trim() || undefined });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000000aa", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 10, padding: 24, width: 440, maxWidth: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Log a call</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={18} /></button>
        </div>

        <label style={{ fontSize: 12, color: "#94a3b8" }}>
          Search a card
          <input value={query} onChange={(e) => { setQuery(e.target.value); setCardId(null); }} style={FIELD} />
        </label>

        {query.trim().length >= 2 && (results?.cards ?? results ?? []) && (
          <div style={{ marginTop: 8, maxHeight: 180, overflowY: "auto" }}>
            {((results as { cards?: { id: string; name: string }[] })?.cards ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => { setCardId(c.id); setQuery(c.name); }}
                style={{ display: "block", width: "100%", textAlign: "left", background: cardId === c.id ? "#fbbf2415" : "transparent", color: "#f1f5f9", border: "none", padding: "6px 8px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginTop: 12 }}>
          Source URL (video/post, optional)
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" style={FIELD} />
        </label>

        {error && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 12 }}>{error}</p>}

        <button onClick={submit} disabled={log.isPending} style={{ width: "100%", marginTop: 18, background: "#fbbf24", color: "#0a0f1c", border: "none", borderRadius: 6, padding: "10px", fontWeight: 700, cursor: "pointer" }}>
          {log.isPending ? "Logging…" : "Log bullish call"}
        </button>
      </div>
    </div>
  );
}
```

> **Note on `cards.list` shape:** confirm the return shape of `trpc.cards.list` while implementing (CLAUDE.md says it returns cards with client-side price sort). Adjust the `results` access (`results.cards` vs `results`) and the input field name (`search`, `limit`) to match the real `cards.list` input/output. This is the one place the plan cannot pin exactly without reading `src/server/routers/cards.ts` — read it first and align the types.

- [ ] **Step 3: Verify the build now compiles the hub landing + modals**

```bash
export PATH="/usr/local/opt/node@22/bin:$PATH"
npm run build
```

Expected: build succeeds (the `/hub` route compiles). Fix any type mismatches surfaced by `cards.list`.

- [ ] **Step 4: Commit**

```bash
git add src/components/hub/AddEntryModal.tsx src/components/hub/LogCallModal.tsx
git commit -m "feat: add Creator Hub add-entry + log-call modals"
```

---

## Task 11: Entry profile page (`/hub/[slug]`)

**Files:**
- Create: `src/app/(dashboard)/hub/[slug]/page.tsx`

- [ ] **Step 1: Create the profile page**

`src/app/(dashboard)/hub/[slug]/page.tsx`:

```tsx
"use client";

import { useState, useMemo, use } from "react";
import Image from "next/image";
import { ImageOff, ExternalLink, TrendingUp } from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { ErrorState } from "@/components/ui/ErrorState";
import { VoteControl } from "@/components/hub/VoteControl";
import { LogCallModal } from "@/components/hub/LogCallModal";

const PANEL = { background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 };
const LABEL = { fontSize: 13, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.8px" };
const labelFor = (c: string) => c.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

export default function EntryProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [showLog, setShowLog] = useState(false);

  const { data: entry, isLoading, isError, refetch } = trpc.creators.byId.useQuery({ slug });

  const heatSeries = useMemo(
    () =>
      (entry?.metrics ?? [])
        .filter((m) => m.upvotes7d != null || m.ytSubscribers != null)
        .map((m) => ({
          date: new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          subs: m.ytSubscribers ?? 0,
        })),
    [entry]
  );

  if (isError) {
    return (
      <div className="main-content" style={{ maxWidth: 1000, margin: "0 auto" }}>
        <ErrorState message="Couldn't load this profile." onRetry={() => void refetch()} />
      </div>
    );
  }
  if (isLoading || !entry) {
    return (
      <div className="main-content" style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div className="skeleton" style={{ height: 120, borderRadius: 8, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 8 }} />
      </div>
    );
  }

  return (
    <div className="main-content" style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ ...PANEL, display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        {entry.avatarUrl ? (
          <Image src={entry.avatarUrl} alt={entry.name} width={64} height={64} style={{ borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ImageOff size={28} color="#334155" />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>{entry.name}</h1>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{labelFor(entry.category)}</div>
          {entry.bio && <p style={{ fontSize: 13, color: "#cbd5e1", marginTop: 8 }}>{entry.bio}</p>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 800, color: "#fbbf24" }}>
            {Math.round(entry.heatScore)}
          </span>
          <span style={{ fontSize: 10, color: "#64748b" }}>HEAT</span>
          <VoteControl entryId={entry.id} initialScore={entry.voteScore} />
        </div>
      </div>

      {/* Links */}
      {entry.links.length > 0 && (
        <div style={{ ...PANEL, marginBottom: 16 }}>
          <div style={LABEL}>Links</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            {entry.links.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#0a0f1c", border: "1px solid #1e293b", borderRadius: 6, padding: "6px 12px", color: "#cbd5e1", fontSize: 13, textDecoration: "none" }}
              >
                {l.platform} <ExternalLink size={12} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Heat / subscriber trend */}
      <div style={{ ...PANEL, marginBottom: 16 }}>
        <div style={LABEL}>Subscriber trend</div>
        {heatSeries.length >= 2 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={heatSeries}>
              <XAxis dataKey="date" stroke="#475569" fontSize={11} />
              <YAxis stroke="#475569" fontSize={11} />
              <RTooltip contentStyle={{ background: "#0a0f1c", border: "1px solid #1e293b" }} />
              <Area type="monotone" dataKey="subs" stroke="#fbbf24" fill="#fbbf2433" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 12 }}>
            Not enough history yet — trend builds as the daily sync runs.
          </p>
        )}
      </div>

      {/* Calls */}
      <div style={PANEL}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={LABEL}>Cards covered</div>
          <button
            onClick={() => setShowLog(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#0a0f1c", border: "1px solid #1e293b", borderRadius: 6, padding: "6px 12px", color: "#fbbf24", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            <TrendingUp size={13} /> Log a call
          </button>
        </div>
        {entry.calls.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 12 }}>No calls logged yet.</p>
        ) : (
          <div style={{ marginTop: 12 }}>
            {entry.calls.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                {c.card.imageSmall ? (
                  <Image src={c.card.imageSmall} alt={c.card.name} width={28} height={39} style={{ objectFit: "contain" }} />
                ) : (
                  <div style={{ width: 28, height: 39, background: "#1e293b", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ImageOff size={14} color="#334155" />
                  </div>
                )}
                <span style={{ color: "#f1f5f9", fontSize: 13, flex: 1 }}>{c.card.name}</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  {new Date(c.calledAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLog && (
        <LogCallModal entryId={entry.id} onClose={() => setShowLog(false)} onLogged={() => { setShowLog(false); void refetch(); }} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
export PATH="/usr/local/opt/node@22/bin:$PATH"
npm run build
```

Expected: `/hub/[slug]` compiles.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/hub/[slug]/page.tsx"
git commit -m "feat: add Creator Hub entry profile page"
```

---

## Task 12: Admin review page (`/hub/admin`)

**Files:**
- Create: `src/app/(dashboard)/hub/admin/page.tsx`

- [ ] **Step 1: Create the admin page (server-gated, client table)**

`src/app/(dashboard)/hub/admin/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { AdminTable } from "./AdminTable";

export default async function HubAdminPage() {
  const session = await auth();
  const isAdmin = !!session?.user?.email && session.user.email === process.env.ADMIN_EMAIL;

  if (!isAdmin) {
    return (
      <div className="main-content" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 40, textAlign: "center", color: "#64748b" }}>
          Admin access required.
        </div>
      </div>
    );
  }

  return <AdminTable />;
}
```

- [ ] **Step 2: Create the client admin table**

> **Note:** this uses `trpc.useUtils()` for cache invalidation. Confirm that matches how the portfolio page creates its `utils` object (CLAUDE.md shows `utils.portfolio.get.invalidate()`); if the codebase uses `trpc.useContext()`, switch to that.

`src/app/(dashboard)/hub/admin/AdminTable.tsx`:

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { ErrorState } from "@/components/ui/ErrorState";

const PANEL = { background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 };
const labelFor = (c: string) => c.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

export function AdminTable() {
  const utils = trpc.useUtils();
  const { data, isLoading, isError, refetch } = trpc.creators.adminList.useQuery();
  const setStatus = trpc.creators.adminSetStatus.useMutation({
    onSuccess: () => utils.creators.adminList.invalidate(),
  });

  return (
    <div className="main-content" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 16 }}>Hub Admin</h1>
      {isError ? (
        <ErrorState message="Failed to load entries." onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div style={PANEL}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, borderRadius: 6 }} />)}
        </div>
      ) : (
        <div style={{ ...PANEL, padding: 0 }}>
          {(data ?? []).map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid #1e293b" }}>
              <div style={{ flex: 1 }}>
                <span style={{ color: "#f1f5f9", fontSize: 14 }}>{e.name}</span>
                <span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>{labelFor(e.category)}</span>
              </div>
              <span style={{ fontSize: 11, color: e.status === "live" ? "#22c55e" : "#ef4444" }}>{e.status}</span>
              <button
                onClick={() => setStatus.mutate({ entryId: e.id, status: e.status === "live" ? "hidden" : "live" })}
                style={{ background: "#0a0f1c", border: "1px solid #1e293b", borderRadius: 6, padding: "4px 12px", color: "#cbd5e1", fontSize: 12, cursor: "pointer" }}
              >
                {e.status === "live" ? "Hide" : "Restore"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
export PATH="/usr/local/opt/node@22/bin:$PATH"
npm run build
```

Expected: `/hub/admin` compiles.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/hub/admin/page.tsx" "src/app/(dashboard)/hub/admin/AdminTable.tsx"
git commit -m "feat: add Creator Hub admin review page"
```

---

## Task 13: Wiring — nav link, image host, env

**Files:**
- Modify: `src/components/layout/TopNav.tsx`
- Modify: `next.config.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add the Hub nav item**

In `src/components/layout/TopNav.tsx`, add `Users` to the lucide import line:

```typescript
import {
  Home, Activity, Grid3X3, BookOpen, Package, BarChart3, Award, Users,
} from "lucide-react";
```

Add an entry to `NAV_ITEMS` (after Grading):

```typescript
  { href: "/grading", label: "Grading", icon: Award },
  { href: "/hub", label: "Hub", icon: Users },
```

- [ ] **Step 2: Allow YouTube avatar hosts in `next.config.ts`**

In `next.config.ts`, add these `remotePatterns` entries alongside the existing `images.pokemontcg.io` entry:

```typescript
{ protocol: "https", hostname: "yt3.ggpht.com" },
{ protocol: "https", hostname: "yt3.googleusercontent.com" },
{ protocol: "https", hostname: "i.ytimg.com" },
```

(Match the exact object shape already used in the file — read it first and mirror it.)

- [ ] **Step 3: Add env vars to `.env.example`**

Append to `.env.example`:

```
YOUTUBE_API_KEY=          # YouTube Data API v3 key (free, Google Cloud)
ADMIN_EMAIL=              # email allowed to access /hub/admin
```

- [ ] **Step 4: Verify build**

```bash
export PATH="/usr/local/opt/node@22/bin:$PATH"
npm run build
```

Expected: full build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/TopNav.tsx next.config.ts .env.example
git commit -m "feat: wire Creator Hub into nav, image hosts, env"
```

---

## Task 14: Full verification

- [ ] **Step 1: Run the full unit suite**

```bash
export PATH="/usr/local/opt/node@22/bin:$PATH"
npm run test
```

Expected: all suites pass, including the existing `metrics.test.ts` plus the 3 new ones (`voter`, `creator-heat`, `youtube`).

- [ ] **Step 2: Lint + production build**

```bash
npm run lint
npm run build
```

Expected: lint clean, build succeeds.

- [ ] **Step 3: Smoke-test routes (dev server in one terminal)**

```bash
npm run dev
```

Then in another terminal:

```bash
for path in "/hub" "/hub/admin"; do
  echo "$path → $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")"
done
```

Expected: both return `200`.

- [ ] **Step 4: Manual end-to-end check**

1. Open `/hub` → empty-state shows.
2. Click "Add entry", submit a creator with a real YouTube `@handle` URL → entry appears.
3. Upvote/downvote it → score updates; downvote 3+ times → it disappears (auto-hidden).
4. Open the entry profile → links render, "Log a call" works against a card search.
5. Trigger the cron locally: `curl "http://localhost:3000/api/cron/sync-creators?secret=$CRON_SECRET"` → returns `{ status: "ok", entriesProcessed: N }` and the entry's Heat updates after refresh.
6. Visit `/hub/admin` while logged in as `ADMIN_EMAIL` → can hide/restore.

- [ ] **Step 5: Final commit (if any fixups were needed)**

```bash
git add -A
git commit -m "chore: Creator Hub Phase 1 verification fixups"
```

---

## Phase 2 (not in this plan)

Accuracy scoreboard: grade each `CreatorCall` against real forward prices accrued after `calledAt`, aggregate per entry into a batting average + avg return, and surface a `/hub/scoreboard` leaderboard. Gated until enough non-synthetic price history exists. See the design spec's "Phase 2" section.
