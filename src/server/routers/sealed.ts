import { createTRPCRouter, publicProcedure } from "@/lib/trpc";

export const sealedRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    const products = await ctx.db.sealedProduct.findMany({
      include: { set: { select: { id: true, name: true, series: true, releaseDate: true } } },
      orderBy: { name: "asc" },
    });

    return products.map((p) => {
      const roi =
        p.releasePriceC != null && p.currentPriceC != null && p.releasePriceC > 0
          ? ((p.currentPriceC - p.releasePriceC) / p.releasePriceC) * 100
          : null;
      return { ...p, roi };
    });
  }),
});
