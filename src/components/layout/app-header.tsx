import type { Profile } from "@/types/database";
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-hairline bg-paper px-4 md:px-6">
      <div className="text-sm text-mid-gray">
        <span className="font-medium text-ink">{profile.full_name}</span>
        <span className="mx-2">·</span>
        <span className="uppercase tracking-wide">{profile.role}</span>
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="secondary" size="sm">
          Keluar
        </Button>
      </form>
    </header>
  );
}
