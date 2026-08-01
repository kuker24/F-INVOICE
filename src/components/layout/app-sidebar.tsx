"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  navGroupLabels,
  type NavGroup,
  type NavItem,
} from "@/config/navigation";
import { Button } from "@/components/ui/button";

const GROUP_ORDER: NavGroup[] = ["home", "master", "uang", "sistem"];

function groupItems(items: NavItem[]) {
  const byGroup = new Map<NavGroup, NavItem[]>();
  for (const g of GROUP_ORDER) byGroup.set(g, []);
  for (const item of items) {
    const list = byGroup.get(item.group) ?? [];
    list.push(item);
    byGroup.set(item.group, list);
  }
  return GROUP_ORDER.map((g) => ({
    group: g,
    label: navGroupLabels[g],
    items: byGroup.get(g) ?? [],
  })).filter((s) => s.items.length > 0);
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const sections = groupItems(items);
  return (
    <nav className="flex flex-1 flex-col gap-3 px-3 pb-4" aria-label="Menu utama">
      {sections.map((section) => (
        <div key={section.group} className="flex flex-col gap-0.5">
          {section.label ? (
            <p className="px-3 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-mid-gray">
              {section.label}
            </p>
          ) : null}
          {section.items.map((item) => {
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
        </div>
      ))}
    </nav>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AppSidebar({
  items,
  brand = "F-INVOICE",
}: {
  items: NavItem[];
  brand?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  function closeDrawer() {
    setOpen(false);
    // Return focus after paint so toggle is focusable again.
    queueMicrotask(() => toggleRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const nodes = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

    nodes()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const list = nodes();
      if (list.length === 0) return;
      const first = list[0]!;
      const last = list[list.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-hairline bg-paper px-3 py-2 md:hidden">
        <Button
          ref={toggleRef}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          aria-controls={menuId}
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
            tabIndex={-1}
            onClick={closeDrawer}
          />
          <aside
            id={menuId}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            className="relative z-50 flex h-full w-60 flex-col border-r border-hairline bg-surface-alt shadow-subtle"
          >
            <div className="px-5 py-5">
              <Link
                href={items[0]?.href ?? "/"}
                className="text-base font-semibold tracking-tight text-ink"
                onClick={closeDrawer}
              >
                {brand}
              </Link>
            </div>
            <NavLinks
              items={items}
              pathname={pathname}
              onNavigate={closeDrawer}
            />
          </aside>
        </div>
      ) : null}

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-hairline bg-surface-alt md:flex">
        <div className="px-5 py-5">
          <Link
            href={items[0]?.href ?? "/"}
            className="text-base font-semibold tracking-tight text-ink"
          >
            {brand}
          </Link>
        </div>
        <NavLinks items={items} pathname={pathname} />
      </aside>
    </>
  );
}
