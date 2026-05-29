import { initTRPC, TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import superjson from "superjson";
import { ZodError } from "zod";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  return {
    db,
    session,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/** Procedure restricted to the configured admin email. */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  const email = ctx.session?.user?.email;
  if (!email || email !== process.env.ADMIN_EMAIL) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
  return next({ ctx });
});

