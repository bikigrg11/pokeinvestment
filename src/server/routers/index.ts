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
