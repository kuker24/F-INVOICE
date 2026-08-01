"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
  TemplateForm,
  type TemplateFormValues,
} from "@/components/forms/template-form";

type Row = TemplateFormValues & {
  id: string;
  status?: string;
};

export function TemplateEditor({ templates }: { templates: Row[] }) {
  const defaultTpl = useMemo(
    () => templates.find((t) => t.is_default) ?? templates[0] ?? null,
    [templates],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    defaultTpl?.id ?? null,
  );
  const [mode, setMode] = useState<"edit" | "create">(
    defaultTpl ? "edit" : "create",
  );

  const selected =
    mode === "edit"
      ? (templates.find((t) => t.id === selectedId) ?? defaultTpl)
      : null;

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="mb-0">
            {mode === "edit" && selected
              ? `Edit: ${selected.name}`
              : "Tambah template baru"}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {mode === "create" && defaultTpl ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setMode("edit");
                  setSelectedId(defaultTpl.id);
                }}
              >
                Edit default
              </Button>
            ) : null}
            {mode === "edit" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setMode("create");
                  setSelectedId(null);
                }}
              >
                + Baru
              </Button>
            ) : null}
          </div>
        </div>
        <TemplateForm
          key={mode === "edit" ? selected?.id ?? "edit" : "create"}
          keyHint={mode === "edit" ? selected?.id : "create"}
          initial={
            mode === "edit" && selected
              ? {
                  id: selected.id,
                  name: selected.name,
                  slug: selected.slug,
                  layout_type: selected.layout_type,
                  footer_text: selected.footer_text,
                  show_signature: selected.show_signature,
                  is_default: selected.is_default,
                }
              : {
                  name: "",
                  slug: "",
                  layout_type: "MINIMAL",
                  footer_text: "",
                  show_signature: true,
                  is_default: templates.length === 0,
                }
          }
        />
      </Card>

      <Card className="space-y-0 p-0">
        {!templates.length ? (
          <p className="px-5 py-8 text-sm text-mid-gray">Belum ada template.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {templates.map((t) => {
              const active = mode === "edit" && selectedId === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-paper/70 ${
                      active ? "bg-paper" : ""
                    }`}
                    onClick={() => {
                      setMode("edit");
                      setSelectedId(t.id);
                    }}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{t.name}</p>
                      <p className="truncate text-sm text-mid-gray">
                        {t.slug} · {t.layout_type}
                        {t.show_signature === false
                          ? " · tanpa tanda tangan"
                          : " · ada tanda tangan"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {t.is_default ? <Badge>Default</Badge> : null}
                      {active ? (
                        <span className="text-xs text-mid-gray">diedit</span>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
