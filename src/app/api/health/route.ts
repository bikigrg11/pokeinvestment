import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Verify DB is reachable
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", timestamp: Date.now() });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: (err as Error).message, timestamp: Date.now() },
      { status: 503 }
    );
  }
}
