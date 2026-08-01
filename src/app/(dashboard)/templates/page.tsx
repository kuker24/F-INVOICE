import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { ownerIdOf } from "@/lib/auth/owner";
import {
  ensureDefaultTemplate,
  listTemplates,
} from "@/server/services/templates";
import { TemplateEditor } from "@/components/templates/template-editor";

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
          {rows.length} template · layout PDF & tampilan publik. Nonaktifkan
          “Tanda tangan” lalu Update — slug sama memperbarui template, tidak
          membuat duplikat.
        </p>
      </div>
      <TemplateEditor
        templates={rows.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          layout_type: t.layout_type as "MINIMAL" | "CORPORATE",
          footer_text: t.footer_text,
          show_signature: t.show_signature,
          is_default: t.is_default,
          status: t.status,
        }))}
      />
    </div>
  );
}
