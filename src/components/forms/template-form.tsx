"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { upsertTemplateAction } from "@/server/actions/templates";

export type TemplateFormValues = {
  id?: string;
  name: string;
  slug: string;
  layout_type: "MINIMAL" | "CORPORATE";
  footer_text?: string | null;
  show_signature?: boolean;
  is_default?: boolean;
};

export function TemplateForm({
  initial,
  keyHint,
}: {
  initial?: TemplateFormValues | null;
  /** Change to remount form when switching edit target */
  keyHint?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [name, setName] = useState(initial?.name ?? "Minimal");
  const [slug, setSlug] = useState(initial?.slug ?? "minimal");
  const [layout, setLayout] = useState<"MINIMAL" | "CORPORATE">(
    initial?.layout_type ?? "MINIMAL",
  );
  const [footer, setFooter] = useState(initial?.footer_text ?? "");
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? true);
  const [showSignature, setShowSignature] = useState(
    initial?.show_signature ?? true,
  );

  useEffect(() => {
    if (!initial) return;
    setName(initial.name);
    setSlug(initial.slug);
    setLayout(initial.layout_type);
    setFooter(initial.footer_text ?? "");
    setIsDefault(!!initial.is_default);
    setShowSignature(initial.show_signature !== false);
    setError(null);
    setOkMsg(null);
  }, [initial, keyHint]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    start(async () => {
      const res = await upsertTemplateAction({
        id: initial?.id,
        name,
        slug,
        layout_type: layout,
        footer_text: footer.trim() || null,
        show_signature: showSignature,
        is_default: isDefault,
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setOkMsg(
        showSignature
          ? "Tersimpan. PDF menampilkan tanda tangan."
          : "Tersimpan. PDF tanpa tanda tangan.",
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-3 sm:grid-cols-2">
      {initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}
      <div>
        <Label htmlFor="tpl-name">Nama</Label>
        <Input
          id="tpl-name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="tpl-slug">Slug</Label>
        <Input
          id="tpl-slug"
          name="slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <p className="mt-1 text-xs text-mid-gray">
          Slug unik per akun. Simpan dengan slug yang sama = update template.
        </p>
      </div>
      <div>
        <Label htmlFor="tpl-layout">Layout</Label>
        <Select
          id="tpl-layout"
          name="layout_type"
          value={layout}
          onChange={(e) =>
            setLayout(e.target.value as "MINIMAL" | "CORPORATE")
          }
        >
          <option value="MINIMAL">MINIMAL</option>
          <option value="CORPORATE">CORPORATE</option>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="tpl-footer">Footer</Label>
        <Textarea
          id="tpl-footer"
          name="footer_text"
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          rows={2}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_default"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
        />
        Default
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="show_signature"
          checked={showSignature}
          onChange={(e) => setShowSignature(e.target.checked)}
        />
        Tanda tangan
      </label>
      {error ? (
        <p className="sm:col-span-2 text-sm text-ember" role="alert">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="sm:col-span-2 text-sm text-mid-gray" role="status">
          {okMsg}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Menyimpan…"
            : initial?.id
              ? "Update template"
              : "Simpan template"}
        </Button>
      </div>
    </form>
  );
}
