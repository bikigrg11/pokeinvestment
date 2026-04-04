import { createTRPCRouter } from "@/lib/trpc";
import { cardsRouter } from "./cards";
import { setsRouter } from "./sets";
import { portfolioRouter } from "./portfolio";
import { analyticsRouter } from "./analytics";
import { pricesRouter } from "./prices";
import { sealedRouter } from "./sealed";

export const appRouter = createTRPCRouter({
  cards: cardsRouter,
  sets: setsRouter,
  prices: pricesRouter,
  portfolio: portfolioRouter,
  analytics: analyticsRouter,
  sealed: sealedRouter,
});

export type AppRouter = typeof appRouter;
