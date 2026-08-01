import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Invoice, InvoiceItem } from "@/types/database";
import { AppError } from "@/server/errors";
import {
  InvoicePdfDocument,
  type PdfInvoiceData,
  type PdfPaymentMethod,
} from "@/lib/pdf/document";

const TYPE_LABEL: Record<string, string> = {
  PROJECT: "Project",
  SUBSCRIPTION: "Langganan",
  MAINTENANCE: "Maintenance",
  HOSTING: "Hosting",
  OTHER: "Lainnya",
};

function joinAddress(
  parts: Array<string | null | undefined>,
): string | null {
  const s = parts
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
    .join(", ");
  return s || null;
}

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

  const [{ data: items }, { data: customer }, { data: biz }] =
    await Promise.all([
      admin
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("position"),
      admin
        .from("customers")
        .select("name,address,city,province,postal_code,phone,email")
        .eq("id", invoice.customer_id)
        .maybeSingle(),
      admin
        .from("business_settings")
        .select(
          "business_name,legal_name,address,city,province,postal_code,phone,email,website,tax_id,logo_url,signature_url",
        )
        .eq("owner_id", invoice.owner_id)
        .maybeSingle(),
    ]);

  // Template: invoice-specific or owner default
  let tmpl: {
    footer_text: string | null;
    show_signature: boolean | null;
    accent_color: string | null;
    logo_position: string | null;
  } | null = null;
  if (invoice.template_id) {
    const { data } = await admin
      .from("invoice_templates")
      .select("footer_text,show_signature,accent_color,logo_position")
      .eq("id", invoice.template_id)
      .maybeSingle();
    tmpl = data;
  } else {
    const { data } = await admin
      .from("invoice_templates")
      .select("footer_text,show_signature,accent_color,logo_position")
      .eq("owner_id", invoice.owner_id)
      .eq("is_default", true)
      .eq("status", "ACTIVE")
      .maybeSingle();
    tmpl = data;
  }

  // Payment method: invoice FK → else owner default ACTIVE
  let paymentMethod: PdfPaymentMethod | null = null;
  if (invoice.payment_method_id) {
    const { data: pm } = await admin
      .from("payment_methods")
      .select(
        "type,bank_name,account_number,account_holder,branch,instructions",
      )
      .eq("id", invoice.payment_method_id)
      .maybeSingle();
    if (pm) {
      paymentMethod = {
        type: pm.type as string,
        bankName: pm.bank_name as string | null,
        accountNumber: pm.account_number as string | null,
        accountHolder: pm.account_holder as string | null,
        branch: pm.branch as string | null,
        instructions: pm.instructions as string | null,
      };
    }
  } else {
    const { data: pm } = await admin
      .from("payment_methods")
      .select(
        "type,bank_name,account_number,account_holder,branch,instructions",
      )
      .eq("owner_id", invoice.owner_id)
      .eq("status", "ACTIVE")
      .eq("is_default", true)
      .maybeSingle();
    if (pm) {
      paymentMethod = {
        type: pm.type as string,
        bankName: pm.bank_name as string | null,
        accountNumber: pm.account_number as string | null,
        accountHolder: pm.account_holder as string | null,
        branch: pm.branch as string | null,
        instructions: pm.instructions as string | null,
      };
    }
  }

  const periodLabel =
    invoice.subscription_period_start && invoice.subscription_period_end
      ? `${invoice.subscription_period_start} s/d ${invoice.subscription_period_end}`
      : null;

  const data: PdfInvoiceData = {
    businessName: (biz?.business_name as string) ?? "F-INVOICE",
    legalName: (biz?.legal_name as string) ?? null,
    businessAddress: joinAddress([
      biz?.address as string | null,
      biz?.city as string | null,
      biz?.province as string | null,
      biz?.postal_code as string | null,
    ]),
    businessPhone: (biz?.phone as string) ?? null,
    businessEmail: (biz?.email as string) ?? null,
    businessWebsite: (biz?.website as string) ?? null,
    businessTaxId: (biz?.tax_id as string) ?? null,
    logoUrl: (biz?.logo_url as string) ?? null,
    signatureUrl: (biz?.signature_url as string) ?? null,
    showSignature: tmpl?.show_signature ?? true,
    accentColor: (tmpl?.accent_color as string) ?? null,
    invoiceNumber: invoice.invoice_number,
    invoiceType: TYPE_LABEL[invoice.invoice_type] ?? invoice.invoice_type,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    status: invoice.status,
    customerName: (customer?.name as string) ?? "",
    customerAddress: joinAddress([
      customer?.address as string | null,
      customer?.city as string | null,
      customer?.province as string | null,
      customer?.postal_code as string | null,
    ]),
    customerPhone: (customer?.phone as string) ?? null,
    customerEmail: (customer?.email as string) ?? null,
    periodLabel,
    items: ((items ?? []) as InvoiceItem[]).map((it) => ({
      name: it.name,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
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
    paymentMethod,
  };

  const element = React.createElement(InvoicePdfDocument, { data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = (await renderToBuffer(element as any)) as Buffer;
  const safeCust =
    (customer?.name as string)?.replace(/[^\w\-]+/g, "-").replace(/-+/g, "-") ??
    "customer";
  const filename = `${invoice.invoice_number}-${safeCust}.pdf`;
  return { buffer, filename };
}
