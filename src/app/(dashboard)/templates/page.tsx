import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { ownerIdOf } from "@/lib/auth/owner";
import {
  ensureDefaultTemplate,
  listTemplates,
} from "@/server/services/templates";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TemplateForm } from "@/components/forms/template-form";

export default async function TemplatesPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "DEVELOPER") redirect("/dashboard");
  await ensureDefaultTemplate(ownerIdOf(session.profile));
  const rows = await listTemplates(session.profile);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Template invoice
        </h1>
        <p className="text-sm text-mid-gray">
          {rows.length} template · layout PDF & tampilan publik
        </p>
      </div>
      <Card>
        <CardTitle className="mb-4">Tambah / update</CardTitle>
        <TemplateForm />
      </Card>
      <Card className="space-y-0 p-0">
        {!rows.length ? (
          <EmptyState
            title="Belum ada template"
            description="Template default dibuat otomatis; tambah varian lewat form di atas."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {rows.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{t.name}</p>
                  <p className="truncate text-sm text-mid-gray">
                    {t.slug} · {t.layout_type}
                  </p>
                </div>
                {t.is_default ? <Badge>Default</Badge> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
