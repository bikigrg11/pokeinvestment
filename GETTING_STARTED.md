# How to Use These Files with Claude Code

## Setup

1. Create a new directory for your project:
   ```bash
   mkdir pokeinvest && cd pokeinvest
   ```

2. Copy these files into the root:
   - `CLAUDE.md` → project root (Claude reads this automatically every session)
   - `SPEC.md` → project root (reference spec)
   - `.env.example` → project root

3. Get your free API key from https://dev.pokemontcg.io/

## Session 1: Scaffold

Open Claude Code and say:

```
Read SPEC.md. Scaffold the full Next.js project based on the spec:
- Next.js 15 with App Router and TypeScript strict
- Prisma with the full schema from the spec
- tRPC setup
- NextAuth v5 with credentials provider
- TailwindCSS with the dark theme from the spec
- shadcn/ui init
- All environment variables from .env.example
- Package.json with all dependencies

Don't build any pages yet. Just the foundation, schema, and configuration.
Then run the dev server to verify it compiles.
```

## Session 2: Data Layer

```
Read SPEC.md sections 3 and 4. Build the data layer:
1. pokemontcg.io API client in lib/api/ with caching and rate limit handling
2. Seed script that fetches all sets and the top cards from each set
3. tRPC routers for cards, sets, and prices
4. Investment metric calculation functions in server/services/metrics.ts
5. Run the seed script and verify data is in the database
```

## Session 3: Core Pages

```
Read SPEC.md section 5.1-5.4. Build these pages:
1. Dashboard with market summary, index chart, and leaderboards
2. Card database with search, filters, pagination, and sortable table
3. Card detail page with price chart, metrics, and signals

Use the existing pokeinvest.jsx artifact as visual reference for the UI design
(Bloomberg-style dark theme, amber accent, monospace numbers).
```

## Session 4: Portfolio + Remaining Pages

```
Read SPEC.md section 5.5-5.8. Build:
1. Set browser with expandable set cards
2. Portfolio tracker with add/remove, P&L tracking, allocation chart
3. Investment screener with adjustable filters
4. Sealed products page

Then run through all pages and fix any issues.
```

## Tips

- Start each new session with: "Read CLAUDE.md and SPEC.md, then [task]"
- If Claude drifts from the spec, say: "Check SPEC.md section X — we're deviating"
- After each session, tell Claude: "add to CLAUDE.md: [any new gotcha or pattern you learned]"
- Use `/compact` when context gets long to keep Claude focused
- For complex features, use: "Plan first, then implement" to get Claude to think before coding
