import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { navForRole } from "@/config/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "USER") redirect("/dashboard");

  const items = navForRole(session.profile.role);

  return (
    <div className="flex min-h-screen bg-canvas">
      <div className="hidden md:block">
        <AppSidebar items={items} brand="Portal" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader profile={session.profile} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
