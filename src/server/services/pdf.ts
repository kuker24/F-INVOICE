import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Invoice, InvoiceItem } from "@/types/database";
import { AppError } from "@/server/errors";
import {
  InvoicePdfDocument,
  type PdfInvoiceData,
} from "@/lib/pdf/document";

export async function buildInvoicePdfBuffer(invoiceId: string): Promise<{
  buffer: Buffer;
  filename: string;
}> {
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) throw new AppError("NOT_FOUND", "Invoice tidak ditemukan.");
  const invoice = inv as Invoice;
  if (invoice.status === "DRAFT") {
    throw new AppError("NOT_READY", "PDF hanya untuk invoice non-DRAFT.");
  }

  const { data: items } = await admin
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("position");
  const { data: customer } = await admin
    .from("customers")
    .select("name,address,city")
    .eq("id", invoice.customer_id)
    .maybeSingle();
  const { data: biz } = await admin
    .from("business_settings")
    .select("business_name,address,city")
    .eq("owner_id", invoice.owner_id)
    .maybeSingle();
  const { data: tmpl } = invoice.template_id
    ? await admin
        .from("invoice_templates")
        .select("footer_text")
        .eq("id", invoice.template_id)
        .maybeSingle()
    : { data: null };

  const data: PdfInvoiceData = {
    businessName: (biz?.business_name as string) ?? "F-INVOICE",
    businessAddress: [biz?.address, biz?.city].filter(Boolean).join(", ") || null,
    invoiceNumber: invoice.invoice_number,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    status: invoice.status,
    customerName: (customer?.name as string) ?? "",
    customerAddress:
      [customer?.address, customer?.city].filter(Boolean).join(", ") || null,
    items: ((items ?? []) as InvoiceItem[]).map((it) => ({
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.unit_price,
      discountAmount: it.discount_amount,
      taxAmount: it.tax_amount,
      lineTotal: it.line_total,
    })),
    subtotal: invoice.subtotal,
    discountAmount: invoice.discount_amount,
    taxAmount: invoice.tax_amount,
    additionalFee: invoice.additional_fee,
    totalAmount: invoice.total_amount,
    amountPaid: invoice.amount_paid,
    balanceDue: invoice.balance_due,
    notes: invoice.customer_notes,
    terms: invoice.terms,
    footer: (tmpl?.footer_text as string) ?? null,
  };

  const element = React.createElement(InvoicePdfDocument, { data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = (await renderToBuffer(element as any)) as Buffer;
  const safeCust = (customer?.name as string)?.replace(/[^\w\-]+/g, "-") ?? "customer";
  const filename = `${invoice.invoice_number}-${safeCust}.pdf`;
  return { buffer, filename };
}
