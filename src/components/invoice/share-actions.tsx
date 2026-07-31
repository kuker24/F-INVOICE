"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { whatsappShareUrl, invoiceShareText } from "@/lib/share/whatsapp";

export function InvoiceShareActions({
  publicUrl,
  invoiceNumber,
  customerName,
  customerPhone,
  businessName,
  totalLabel,
  dueDate,
}: {
  publicUrl: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string | null;
  businessName: string;
  totalLabel: string;
  dueDate?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const text = invoiceShareText({
    businessName,
    invoiceNumber,
    customerName,
    totalLabel,
    publicUrl,
    dueDate,
  });
  const wa = whatsappShareUrl(customerPhone, text);

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Salin link:", publicUrl);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={copy}>
        {copied ? "Tersalin" : "Salin link"}
      </Button>
      <a
        className={buttonVariants({ variant: "outline" })}
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp
      </a>
    </div>
  );
}
