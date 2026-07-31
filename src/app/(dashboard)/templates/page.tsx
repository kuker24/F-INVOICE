import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { ownerIdOf } from "@/lib/auth/owner";
import { ensureDefaultTemplate, listTemplates } from "@/server/services/templates";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TemplateForm } from "@/components/forms/template-form";

export default async function TemplatesPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "DEVELOPER") redirect("/dashboard");
  await ensureDefaultTemplate(ownerIdOf(session.profile));
  const rows = await listTemplates(session.profile);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <h1 className="text-xl font-semibold">Template invoice</h1>
      <Card>
        <CardTitle className="mb-4">Tambah / update</CardTitle>
        <TemplateForm />
      </Card>
      <Card className="space-y-3">
        {rows.map((t) => (
          <div key={t.id} className="flex items-center justify-between border-b border-hairline pb-3 last:border-0">
            <div>
              <p className="font-medium">{t.name}</p>
              <p className="text-sm text-mid-gray">{t.slug} · {t.layout_type}</p>
            </div>
            {t.is_default ? <Badge>Default</Badge> : null}
          </div>
        ))}
      </Card>
    </div>
  );
}
