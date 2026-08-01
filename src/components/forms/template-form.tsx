"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { upsertTemplateAction } from "@/server/actions/templates";

export function TemplateForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await upsertTemplateAction({
        name: fd.get("name"),
        slug: fd.get("slug"),
        layout_type: fd.get("layout_type"),
        footer_text: fd.get("footer_text") || null,
        show_signature: fd.get("show_signature") === "on",
        is_default: fd.get("is_default") === "on",
      });
      if (!res.success) { setError(res.error.message); return; }
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-3 sm:grid-cols-2">
      <div>
        <Label>Nama</Label>
        <Input name="name" required defaultValue="Minimal" />
      </div>
      <div>
        <Label>Slug</Label>
        <Input name="slug" required defaultValue="minimal" />
      </div>
      <div>
        <Label>Layout</Label>
        <Select name="layout_type" defaultValue="MINIMAL">
          <option value="MINIMAL">MINIMAL</option>
          <option value="CORPORATE">CORPORATE</option>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label>Footer</Label>
        <Textarea name="footer_text" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_default" defaultChecked /> Default
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="show_signature" defaultChecked /> Tanda tangan
      </label>
      {error ? <p className="sm:col-span-2 text-sm text-ember">{error}</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan"}</Button>
      </div>
    </form>
  );
}
