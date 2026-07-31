import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkRateLimit, PUBLIC_VIEW_LIMIT } from "@/lib/rate-limit";
import { getPublicInvoiceByToken } from "@/server/services/invoices";
import { AppError } from "@/server/errors";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const rl = await checkRateLimit(
    `public-inv:${ip}`,
    PUBLIC_VIEW_LIMIT.limit,
    PUBLIC_VIEW_LIMIT.windowMs,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  try {
    const dto = await getPublicInvoiceByToken(token);
    return NextResponse.json({ data: dto });
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
