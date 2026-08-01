import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listPortalInvoices } from "@/server/services/invoices";
import { listMyNotifications } from "@/server/services/notifications";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIdr } from "@/lib/money/invoice-math";
import type { Profile } from "@/types/database";

function PortalStatsFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[24px] border border-hairline bg-paper p-5"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

function NotesFallback() {
  return (
    <div className="rounded-[24px] border border-hairline bg-paper p-5 space-y-3" aria-busy="true">
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
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <p className="text-sm text-mid-gray">Invoice open</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
          {open.length}
        </p>
      </Card>
      <Card>
        <p className="text-sm text-mid-gray">Sisa tagihan</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
          {formatIdr(outstanding)}
        </p>
      </Card>
    </div>
  );
}

async function PortalNotes({ profile }: { profile: Profile }) {
  const notes = await listMyNotifications(profile, 5);
  return (
    <Card>
      <CardTitle className="mb-2">Notifikasi</CardTitle>
      {notes.length ? (
        <ul className="divide-y divide-hairline text-sm">
          {notes.map((n) => (
            <li
              key={n.id}
              className={`py-2 first:pt-0 last:pb-0 ${n.is_read ? "text-mid-gray" : "text-ink"}`}
            >
              <span className="font-medium">{n.title}</span>
              <span className="text-mid-gray"> — {n.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-mid-gray">
          Belum ada notifikasi. Status invoice dan konfirmasi bayar muncul di
          sini.
        </p>
      )}
    </Card>
  );
}

export default async function PortalHome() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Portal · {session.profile.full_name}
        </h1>
        <p className="text-sm text-mid-gray">Ringkasan tagihan dan notifikasi</p>
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
