import { redirect } from "next/navigation";
import { getSessionProfile, isStaff } from "@/lib/auth/profile";
import { navForRole } from "@/config/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!isStaff(session.profile.role)) redirect("/portal");

  const items = navForRole(session.profile.role);

  return (
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      <AppSidebar items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader profile={session.profile} />
        <main id="main" className="flex-1 p-4 md:p-6" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
