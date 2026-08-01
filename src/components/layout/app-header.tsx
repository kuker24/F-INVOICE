import type { Profile } from "@/types/database";
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-hairline bg-paper/95 px-4 backdrop-blur-sm md:px-6">
      <div className="min-w-0 truncate text-sm text-mid-gray">
        <span className="font-medium text-ink">{profile.full_name}</span>
        <span className="mx-2 text-hairline" aria-hidden>
          ·
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-mid-gray">
          {profile.role}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <form action={logoutAction}>
          <Button type="submit" variant="secondary" size="sm">
            Keluar
          </Button>
        </form>
      </div>
    </header>
  );
}
