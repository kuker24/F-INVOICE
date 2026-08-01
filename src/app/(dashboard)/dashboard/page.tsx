import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { getDashboardStats } from "@/server/services/dashboard";
import { listMyNotifications } from "@/server/services/notifications";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { NotificationList } from "@/components/dashboard/notification-list";
import { formatIdr } from "@/lib/money/invoice-math";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

function StatsFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
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
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

function StatLink({
  href,
  label,
  children,
  hint,
  className,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-[24px] border border-hairline bg-paper p-5 shadow-subtle transition-colors",
        "hover:border-ink/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-mid-gray">
        {label}
      </p>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-2 text-xs text-mid-gray">{hint}</p> : null}
    </Link>
  );
}

async function DashboardStats({ profile }: { profile: Profile }) {
  const stats = await getDashboardStats(profile);
  const firstRun = stats.customers === 0 && stats.openInvoices === 0;

  if (firstRun) {
    return (
      <Card className="p-0">
        <EmptyState
          title="Belum ada data bisnis"
          description="Mulai dari pelanggan, lalu buat invoice. Dashboard menampilkan piutang, jatuh tempo, dan antrian verifikasi."
          actionHref="/customers/new"
          actionLabel="+ Pelanggan"
        />
      </Card>
    );
  }

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Ringkasan keuangan"
    >
      <StatLink
        href="/invoices?status=OVERDUE"
        label="Jatuh tempo"
        className="sm:col-span-1"
        hint="Buka invoice overdue"
      >
        <div className="flex items-center gap-2">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink">
            {stats.overdueInvoices}
          </p>
          {stats.overdueInvoices > 0 ? (
            <Badge tone="danger">OVERDUE</Badge>
          ) : null}
        </div>
      </StatLink>

      <StatLink
        href="/invoices"
        label="Piutang"
        hint="Semua invoice terbuka"
      >
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink">
          {formatIdr(stats.outstanding)}
        </p>
      </StatLink>

      <StatLink
        href="/invoices"
        label="Invoice terbuka"
        hint={`${stats.openInvoices} dokumen`}
      >
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
          {stats.openInvoices}
        </p>
      </StatLink>

      <StatLink
        href="/payments?status=PENDING"
        label="Menunggu verifikasi"
        hint="Bukti bayar PENDING"
      >
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
          {stats.pendingPayments}
        </p>
      </StatLink>

      <StatLink href="/customers" label="Pelanggan" className="lg:col-span-1">
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
          {stats.customers}
        </p>
      </StatLink>

      {stats.showRevenue ? (
        <div className="rounded-[24px] border border-hairline bg-paper p-5 shadow-subtle sm:col-span-2 lg:col-span-3">
          <p className="text-xs font-medium uppercase tracking-wide text-mid-gray">
            Pendapatan (PAID)
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatIdr(stats.revenue ?? 0)}
          </p>
        </div>
      ) : (
        <p className="self-center text-sm text-mid-gray sm:col-span-2 lg:col-span-3">
          Pendapatan disembunyikan untuk peran Admin.
        </p>
      )}
    </div>
  );
}

async function DashboardNotes({ profile }: { profile: Profile }) {
  const notes = await listMyNotifications(profile, 8);
  return (
    <Card>
      <NotificationList notes={notes} />
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-mid-gray">
            Kerja hari ini — kejar piutang, verifikasi bayar, kirim invoice.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/invoices/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            + Invoice
          </Link>
          <Link
            href="/payments?status=PENDING"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Antrian bayar
          </Link>
          <Link
            href="/payments/new"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            + Catat bayar
          </Link>
        </div>
      </div>
      <Suspense fallback={<StatsFallback />}>
        <DashboardStats profile={session.profile} />
      </Suspense>
      <Suspense fallback={<NotesFallback />}>
        <DashboardNotes profile={session.profile} />
      </Suspense>
    </div>
  );
}
