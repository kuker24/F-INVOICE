import { NextResponse } from "next/server";
import { getServerEnv } from "@/config/env";
import { runSubscriptionCron } from "@/server/services/subscriptions";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = getServerEnv().CRON_SECRET;
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runSubscriptionCron(50);
  return NextResponse.json({ ok: true, ...result });
}
