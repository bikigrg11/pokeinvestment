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
