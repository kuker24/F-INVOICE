import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkRateLimit, PUBLIC_PAY_LIMIT } from "@/lib/rate-limit/memory";
import { paymentConfirmSchema } from "@/lib/validation/invoice";
import { submitPublicPayment } from "@/server/services/payments";
import { AppError } from "@/server/errors";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const rl = checkRateLimit(
    `public-pay:${ip}:${token.slice(0, 8)}`,
    PUBLIC_PAY_LIMIT.limit,
    PUBLIC_PAY_LIMIT.windowMs,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak. Coba lagi ${rl.retryAfterSec}s` },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = paymentConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid" },
      { status: 400 },
    );
  }
  try {
    const pay = await submitPublicPayment(token, parsed.data);
    return NextResponse.json({
      data: { id: pay.id, payment_number: pay.payment_number, status: pay.status },
    });
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error(e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
