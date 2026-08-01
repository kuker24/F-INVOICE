import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-14 text-center",
        className,
      )}
    >
      <p className="text-sm font-semibold tracking-tight text-ink">{title}</p>
      {description ? (
        <p className="max-w-sm text-pretty text-sm text-mid-gray">{description}</p>
      ) : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className={cn(buttonVariants({ size: "sm" }), "mt-3")}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
