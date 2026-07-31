import { NextResponse } from "next/server";

/** Keep-warm + uptime probe. No auth, no DB. */
export const preferredRegion = ["sin1"];
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
