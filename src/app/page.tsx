import { redirect } from "next/navigation";
import { getSessionProfile, homePathForRole } from "@/lib/auth/profile";

export default async function HomePage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  redirect(homePathForRole(session.profile.role));
}
