import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { Card, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/forms/profile-form";

export default async function PortalProfilePage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <h1 className="text-xl font-semibold">Profil</h1>
      <Card>
        <CardTitle className="mb-4">{session.profile.email}</CardTitle>
        <ProfileForm
          initial={{
            full_name: session.profile.full_name,
            phone: session.profile.phone,
          }}
        />
      </Card>
    </div>
  );
}
