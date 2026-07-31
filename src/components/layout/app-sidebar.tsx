"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/config/navigation";

export function AppSidebar({
  items,
  brand = "F-INVOICE",
}: {
  items: NavItem[];
  brand?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-hairline bg-surface-alt">
      <div className="px-5 py-5">
        <Link href={items[0]?.href ?? "/"} className="text-base font-semibold tracking-tight text-ink">
          {brand}
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3 pb-4">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              item.href !== "/portal" &&
              pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-[18px] px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-paper text-ink shadow-[0_0_0_1px_rgba(23,23,23,0.05)]"
                  : "text-mid-gray hover:bg-paper/70 hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
