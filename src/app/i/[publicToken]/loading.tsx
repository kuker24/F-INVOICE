import { Skeleton } from "@/components/ui/skeleton";

export default function PublicInvoiceLoading() {
  return (
    <div className="min-h-screen bg-canvas px-4 py-10" aria-busy="true" aria-label="Memuat invoice">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-[24px] border border-hairline bg-paper p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-40" />
          <div className="grid gap-2 sm:grid-cols-2 pt-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="rounded-[24px] border border-hairline bg-paper p-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
          <div className="border-t border-hairline pt-3 flex justify-between">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
