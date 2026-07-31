"use client";
import { Button } from "@/components/ui/button";
import { exportInvoicesCsvAction } from "@/server/actions/invoices";

export function ExportCsvButton() {
  return (
    <Button
      variant="outline"
      type="button"
      onClick={async () => {
        const res = await exportInvoicesCsvAction();
        if (!res.success) {
          alert(res.error.message);
          return;
        }
        const blob = new Blob([res.data.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "invoices.csv";
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      Export CSV
    </Button>
  );
}
