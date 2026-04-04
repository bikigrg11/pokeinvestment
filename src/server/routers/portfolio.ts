import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { z } from "zod";

export const portfolioRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.portfolio.findFirst({
      where: { userId: ctx.session.user.id },
      include: {
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
      },
    });
  }),

  addHolding: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        purchasePriceC: z.number().int(),
        quantity: z.number().int().positive(),
        condition: z.string().default("NM"),
        graded: z.boolean().default(false),
        gradeCompany: z.string().optional(),
        gradeValue: z.string().optional(),
        purchaseDate: z.date(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id as string;
      let portfolio = await ctx.db.portfolio.findFirst({
        where: { userId },
      });
      if (!portfolio) {
        portfolio = await ctx.db.portfolio.create({
          data: { userId },
        });
      }
      return ctx.db.portfolioHolding.create({
        data: { portfolioId: portfolio.id, ...input },
      });
    }),

  removeHolding: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership before deleting
      const holding = await ctx.db.portfolioHolding.findUnique({
        where: { id: input.id },
        include: { portfolio: true },
      });
      if (!holding || holding.portfolio.userId !== (ctx.session.user.id as string)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.portfolioHolding.delete({ where: { id: input.id } });
    }),

  updateHolding: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        purchasePriceC: z.number().int().positive().optional(),
        quantity: z.number().int().positive().optional(),
        condition: z.string().optional(),
        graded: z.boolean().optional(),
        gradeCompany: z.string().nullable().optional(),
        gradeValue: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const holding = await ctx.db.portfolioHolding.findUnique({
        where: { id },
        include: { portfolio: true },
      });
      if (!holding || holding.portfolio.userId !== (ctx.session.user.id as string)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.portfolioHolding.update({ where: { id }, data });
    }),
});
