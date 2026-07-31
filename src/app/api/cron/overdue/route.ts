import { NextResponse } from "next/server";
import { getServerEnv } from "@/config/env";
import { markOverdueBatch, businessToday } from "@/server/services/invoices";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = getServerEnv().CRON_SECRET;
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const today = businessToday("Asia/Jakarta");
  const result = await markOverdueBatch(today, 100);
  return NextResponse.json({ ok: true, today, ...result });
}
