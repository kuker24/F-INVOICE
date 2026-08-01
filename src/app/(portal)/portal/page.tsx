import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listPortalInvoices } from "@/server/services/invoices";
import { listMyNotifications } from "@/server/services/notifications";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationList } from "@/components/dashboard/notification-list";
import { formatIdr } from "@/lib/money/invoice-math";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

function PortalStatsFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[24px] border border-hairline bg-paper p-5"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-9 w-28" />
        </div>
      ))}
    </div>
  );
}

function NotesFallback() {
  return (
    <div
      className="rounded-[24px] border border-hairline bg-paper p-5 space-y-3"
      aria-busy="true"
    >
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

async function PortalStats({ profile }: { profile: Profile }) {
  const invoices = await listPortalInvoices(profile);
  const open = invoices.filter((i) =>
    ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(String(i.status)),
  );
  const outstanding = open.reduce((s, i) => s + Number(i.balance_due), 0);
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-label="Ringkasan tagihan">
      <Link
        href="/portal/invoices"
        className={cn(
          "block rounded-[24px] border border-hairline bg-paper p-5 shadow-subtle",
          "hover:border-ink/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20",
        )}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-mid-gray">
          Invoice terbuka
        </p>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">
          {open.length}
        </p>
      </Link>
      <Link
        href="/portal/invoices"
        className={cn(
          "block rounded-[24px] border border-hairline bg-paper p-5 shadow-subtle",
          "hover:border-ink/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20",
        )}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-mid-gray">
          Sisa tagihan
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
          {formatIdr(outstanding)}
        </p>
      </Link>
    </div>
  );
}

async function PortalNotes({ profile }: { profile: Profile }) {
  const notes = await listMyNotifications(profile, 5);
  return (
    <Card>
      <NotificationList notes={notes} portal />
    </Card>
  );
}

export default async function PortalHome() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Portal</h1>
        <p className="text-sm text-mid-gray">
          Tagihan dan status bayar Anda
        </p>
      </div>
      <Suspense fallback={<PortalStatsFallback />}>
        <PortalStats profile={session.profile} />
      </Suspense>
      <Suspense fallback={<NotesFallback />}>
        <PortalNotes profile={session.profile} />
      </Suspense>
    </div>
  );
}
