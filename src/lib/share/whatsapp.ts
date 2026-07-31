/** Build wa.me share URL (no API key). */
export function whatsappShareUrl(phone: string | null | undefined, text: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  // ID local 08… → 62…
  let n = digits;
  if (n.startsWith("0")) n = `62${n.slice(1)}`;
  const q = encodeURIComponent(text);
  if (n.length >= 10) return `https://wa.me/${n}?text=${q}`;
  return `https://wa.me/?text=${q}`;
}

export function invoiceShareText(opts: {
  businessName: string;
  invoiceNumber: string;
  customerName: string;
  totalLabel: string;
  publicUrl: string;
  dueDate?: string | null;
}): string {
  const lines = [
    `Invoice ${opts.invoiceNumber} — ${opts.businessName}`,
    `Kepada: ${opts.customerName}`,
    `Total: ${opts.totalLabel}`,
  ];
  if (opts.dueDate) lines.push(`Jatuh tempo: ${opts.dueDate}`);
  lines.push("", opts.publicUrl);
  return lines.join("\n");
}
