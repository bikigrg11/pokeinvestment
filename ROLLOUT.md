# PokeInvest — Rollout & App Store Checklist

_Last updated by the autonomous improvement session. This is your single source of truth for going live + getting into the App Store. Items marked **[YOU]** require you (account access, payment, or manual review); items marked **[DONE]** are already handled in the codebase._

---

## 0. The big picture (read this first)

PokeInvest is a **Next.js web app** deployed on **Vercel** at **https://pokeinvestment.com**. There is **no native iOS/Android project** in this repo. To put it on the **Apple App Store**, a website must be wrapped in a native shell — Apple does not accept a raw URL.

**Recommended path:** wrap the existing site with **Capacitor** (a thin native shell that loads the web app, lets you add native features, and passes Apple review more reliably than a bare web view). Alternative: **PWABuilder.com** (uses the PWA manifest we already added — fastest, but thin wrappers risk rejection under Apple guideline 4.2 "minimum functionality").

> ⚠️ **Apple review risk to plan for:** the app shows Pokémon card *investment/grading* content and links to creators doing "rip & ship" pack openings. Apple can flag gambling-adjacent content (guideline 5.3) and thin web wrappers (4.2). Mitigate by: (a) adding genuine native value in the wrapper (push notifications, offline, share sheet), (b) a clear 17+ age rating, (c) no real-money gambling mechanics in-app. See §4.

---

## 1. Production readiness (web) — do these tonight

- **[YOU] Verify Vercel env vars** (Project → Settings → Environment Variables, Production):
  - `DATABASE_URL` ✅ (set), `NEXTAUTH_SECRET` ✅, `NEXTAUTH_URL` → set to `https://pokeinvestment.com`, `POKEMON_TCG_API_KEY` ✅, `CRON_SECRET` ✅, `YOUTUBE_API_KEY` ✅, `ADMIN_EMAIL` ✅.
  - **Action:** confirm `NEXTAUTH_URL` is `https://pokeinvestment.com` (not the vercel.app alias) so auth callbacks use the right domain.
- **[YOU] Enable Vercel Analytics + Speed Insights** in the Vercel dashboard (Project → Analytics / Speed Insights → Enable). The code is already wired (`@vercel/analytics`, `@vercel/speed-insights`); it only reports once enabled.
- **[YOU] Rotate two secrets that leaked into local config:**
  1. The **GitHub token** embedded in this repo's `git remote` URL — rotate it at github.com/settings/tokens and switch the remote to SSH or a credential helper.
  2. The **YouTube Data API key** (it appears in chat history) — in Google Cloud, restrict it to **YouTube Data API v3** only, and consider regenerating; update `YOUTUBE_API_KEY` in Vercel.
- **[YOU] Custom domain** ✅ `pokeinvestment.com` is live and is now the canonical domain for SEO/sitemap/share links.
- **[YOU] Submit sitemap to Google** — Google Search Console → add `pokeinvestment.com` → submit `https://pokeinvestment.com/sitemap.xml`. (Sitemap + per-page metadata are **[DONE]**.)
- **[DONE]** Daily cron (`/api/cron/sync-prices`, 06:00 UTC) refreshes card prices, the index, and creator stats. Verified producing fresh data.
- **[YOU] Neon database plan** — currently free tier (512 MB). Price history is ~1.18M rows. If you add more history or traffic grows, upgrade to Neon Launch ($19/mo, 10 GB). Watch the storage gauge in the Neon dashboard.

## 2. Legal & trust (required for App Store AND good practice)

- **[DONE]** `/privacy` (Privacy Policy) and `/terms` (Terms of Use) pages exist in the app — **[YOU] review the text** and adjust the company name / contact email to your real details before launch. App Store **requires a public privacy policy URL**; use `https://pokeinvestment.com/privacy`.
- **[YOU] Support/contact** — confirm a real support email on the privacy/terms pages and in App Store Connect.
- **[YOU] App privacy questionnaire** (App Store Connect "App Privacy") — declare data collected: analytics (Vercel), and account email if users register. We collect: email (auth), anonymous usage analytics, no precise location, no ad tracking.

## 3. App Store — step by step  **[YOU]**

1. **Enroll** in the Apple Developer Program ($99/year) at developer.apple.com.
2. **Choose a wrapper** (recommended: Capacitor):
   ```bash
   npm i @capacitor/core @capacitor/cli @capacitor/ios
   npx cap init PokeInvest com.yourname.pokeinvest --web-dir=public
   # Point the app at the live site: in capacitor.config.ts set
   #   server: { url: "https://pokeinvestment.com", cleartext: false }
   npx cap add ios
   npx cap open ios   # opens Xcode
   ```
   (Or use **PWABuilder.com** → enter `https://pokeinvestment.com` → it reads our manifest → download the iOS package.)
3. **App icons & splash** — Capacitor/PWABuilder can generate the icon set from the 512px icon we expose at `/icon`. Provide a 1024×1024 master if asked (you can screenshot/export `/icon`).
4. **Bundle identifier** — reserve e.g. `com.yourname.pokeinvest` in the Apple Developer portal.
5. **App Store Connect** — create the app record; fill in:
   - Name, subtitle, **keywords** (e.g. "pokemon cards, tcg, prices, grading, psa, collectors"), description.
   - **Screenshots** (required sizes): 6.7" iPhone (1290×2796) and 13" iPad (2048×2732) at minimum. Capture Dashboard, Market, Grading, Creator Hub.
   - **Privacy Policy URL:** `https://pokeinvestment.com/privacy`.
   - **Age rating:** answer the questionnaire honestly → likely **17+** (simulated gambling / unrestricted web content via creator links).
   - **Category:** Finance or Sports/Entertainment.
6. **Build & upload** the IPA from Xcode (Product → Archive → Distribute) or via `eas build`/Transporter.
7. **Submit for review.** Expect possible 4.2/5.3 feedback; reply with the native value you added (push, offline, share) and the 17+ rating.

## 4. Reducing App Store rejection risk  **[YOU + some DONE]**

- **[DONE]** Real PWA manifest, icons, theme color, standalone display, offline-friendly metadata — gives the wrapper legitimacy.
- **[YOU]** Add at least one native capability in the wrapper (push notifications via Capacitor, or native share) so it's not "just a website."
- **[YOU]** Make sure no in-app real-money purchase of cards happens inside the app (link out to marketplaces in Safari, which we do).

## 5. Nice-to-have before/after launch

- **[YOU]** Error monitoring — add Sentry (`@sentry/nextjs`) for production error visibility.
- **[YOU]** Google Search Console + Bing Webmaster for SEO.
- **[YOU]** Seed more creators/tools — re-run `YOUTUBE_API_KEY=... npx tsx prisma/seed-creators.ts` after adding names/handles to that file (idempotent, API-verified).
- **[YOU]** Social preview — share a creator profile on X/Reddit to confirm the OG image renders.

---

## What the autonomous session already did  **[DONE]**

- PWA: `manifest.webmanifest`, generated PNG app icons (`/icon`, `/apple-icon`), theme color, Apple web-app meta, standalone display.
- SEO: `sitemap.xml` (all creator profiles + key pages), `robots.txt`, per-page + per-creator metadata, canonical = pokeinvestment.com, OG tags.
- Monitoring: Vercel Analytics + Speed Insights wired in.
- UX: custom 404 + error boundary, loading skeletons, light/dark themes.
- Content: Creator Hub seeded with 70 verified creators/resources; Trending Videos (live YouTube); Rankings; daily Heat.
- Legal: `/privacy` + `/terms` pages (review & personalize the text).
- Cleanup: removed dead/orphaned pages and files; focused nav.

_Keep this file updated as you complete items._
