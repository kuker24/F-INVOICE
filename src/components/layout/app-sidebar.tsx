"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/config/navigation";
import { Button } from "@/components/ui/button";

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
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
            onClick={onNavigate}
            className={cn(
              "rounded-[18px] px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20",
              active
                ? "bg-paper text-ink shadow-subtle"
                : "text-mid-gray hover:bg-paper/70 hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({
  items,
  brand = "F-INVOICE",
}: {
  items: NavItem[];
  brand?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-hairline bg-paper px-3 py-2 md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
        <span className="text-sm font-semibold tracking-tight">{brand}</span>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/20"
            aria-label="Tutup overlay"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-50 flex h-full w-60 flex-col border-r border-hairline bg-surface-alt shadow-subtle">
            <div className="px-5 py-5">
              <Link
                href={items[0]?.href ?? "/"}
                className="text-base font-semibold tracking-tight text-ink"
                onClick={() => setOpen(false)}
              >
                {brand}
              </Link>
            </div>
            <NavLinks items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-hairline bg-surface-alt md:flex">
        <div className="px-5 py-5">
          <Link href={items[0]?.href ?? "/"} className="text-base font-semibold tracking-tight text-ink">
            {brand}
          </Link>
        </div>
        <NavLinks items={items} pathname={pathname} />
      </aside>
    </>
  );
}
