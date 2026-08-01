"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import { exportInvoicesCsvAction } from "@/server/actions/invoices";

export function ExportCsvButton() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="outline"
        type="button"
        disabled={busy}
        onClick={async () => {
          setError(null);
          setBusy(true);
          try {
            const res = await exportInvoicesCsvAction();
            if (!res.success) {
              setError(res.error.message);
              return;
            }
            const blob = new Blob([res.data.csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "invoices.csv";
            a.click();
            URL.revokeObjectURL(url);
          } finally {
            setBusy(false);
          }
        }}
      >
        Export CSV
      </Button>
      <InlineError message={error} />
    </div>
  );
}
