import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** GET search for list pages — progressive, no client JS required. */
export function ListSearch({
  action,
  q = "",
  placeholder = "Cari…",
  status,
  statusOptions,
}: {
  action: string;
  q?: string;
  placeholder?: string;
  status?: string;
  statusOptions?: { value: string; label: string }[];
}) {
  const hasFilter = Boolean(q?.trim() || status);
  return (
    <form
      method="get"
      action={action}
      className="flex w-full flex-wrap items-center gap-2"
      role="search"
    >
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mid-gray"
          aria-hidden
        />
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder={placeholder}
          className="pl-9"
          aria-label={placeholder}
          autoComplete="off"
        />
      </div>
      {statusOptions?.length ? (
        <select
          name="status"
          defaultValue={status ?? ""}
          aria-label="Filter status"
          className="h-10 rounded-[18px] border border-hairline bg-canvas px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
        >
          <option value="">Semua status</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : null}
      <Button type="submit" variant="secondary" size="sm">
        Cari
      </Button>
      {hasFilter ? (
        <Link
          href={action}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Reset
        </Link>
      ) : null}
    </form>
  );
}
