/**
 * eBay Marketplace Account Deletion Notification Endpoint
 * https://developer.ebay.com/marketplace-account-deletion
 *
 * GET  — eBay sends a challenge_code to verify the endpoint is live.
 *         We must respond with SHA-256(challengeCode + verificationToken + endpointUrl)
 *
 * POST — eBay sends account deletion events. We log them (no user data stored).
 */

import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const VERIFICATION_TOKEN = process.env.EBAY_VERIFICATION_TOKEN ?? "";

// GET — challenge verification
export async function GET(req: NextRequest) {
  const challengeCode = req.nextUrl.searchParams.get("challenge_code");

  if (!challengeCode) {
    return NextResponse.json({ error: "Missing challenge_code" }, { status: 400 });
  }

  if (!VERIFICATION_TOKEN) {
    return NextResponse.json({ error: "EBAY_VERIFICATION_TOKEN not configured" }, { status: 500 });
  }

  // eBay spec: SHA-256(challengeCode + verificationToken + endpointUrl)
  // Must use the exact public URL eBay called.
  // When behind a proxy/tunnel, use x-forwarded headers to get the real host.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const endpointUrl = `${proto}://${host}/api/ebay/account-deletion`;

  const hash = createHash("sha256")
    .update(challengeCode + VERIFICATION_TOKEN + endpointUrl)
    .digest("hex");

  return NextResponse.json({ challengeResponse: hash });
}

// POST — account deletion notification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown;
    // PokeInvestment does not store eBay user data, so there is nothing to delete.
    // Log the notification for audit purposes and return 200.
    console.log("[eBay] Account deletion notification received:", JSON.stringify(body));
    return NextResponse.json({ status: "acknowledged" });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
