import { z } from "zod";

export const invoiceItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  quantity: z.coerce.number().int().min(1),
  unit: z.string().max(40).optional().nullable(),
  unit_price: z.coerce.number().int().min(0),
  discount_amount: z.coerce.number().int().min(0).default(0),
  tax_rate: z.coerce.number().int().min(0).max(10000).default(0),
});

export const createInvoiceSchema = z.object({
  customer_id: z.string().uuid(),
  invoice_type: z
    .enum(["PROJECT", "SUBSCRIPTION", "MAINTENANCE", "HOSTING", "OTHER"])
    .default("PROJECT"),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  discount_amount: z.coerce.number().int().min(0).default(0),
  additional_fee: z.coerce.number().int().min(0).default(0),
  allow_partial_payment: z.boolean().optional().default(true),
  template_id: z.string().uuid().optional().nullable(),
  payment_method_id: z.string().uuid().optional().nullable(),
  customer_notes: z.string().max(4000).optional().nullable(),
  internal_notes: z.string().max(4000).optional().nullable(),
  terms: z.string().max(4000).optional().nullable(),
  items: z.array(invoiceItemSchema).min(1),
});

export const updateInvoiceDraftSchema = createInvoiceSchema.partial().extend({
  items: z.array(invoiceItemSchema).min(1).optional(),
});

export const paymentRecordSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.coerce.number().int().positive(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.string().max(100).optional().nullable(),
  sender_name: z.string().max(120).optional().nullable(),
  reference_number: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  verify_immediately: z.boolean().optional().default(false),
  proof_url: z.string().max(500).optional().nullable(),
});

export const paymentConfirmSchema = z.object({
  invoice_id: z.string().uuid().optional(),
  amount: z.coerce.number().int().positive(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.string().max(100).optional().nullable(),
  sender_name: z.string().max(120).optional().nullable(),
  reference_number: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const subscriptionSchema = z.object({
  customer_id: z.string().uuid(),
  product_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  billing_cycle: z.enum([
    "MONTHLY",
    "QUARTERLY",
    "SEMIANNUAL",
    "YEARLY",
    "CUSTOM",
  ]),
  custom_interval_days: z.coerce.number().int().positive().optional().nullable(),
  price: z.coerce.number().int().min(0),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  next_invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  due_days: z.coerce.number().int().min(0).max(365).default(7),
  auto_generate_invoice: z.boolean().optional().default(true),
  template_id: z.string().uuid().optional().nullable(),
  payment_method_id: z.string().uuid().optional().nullable(),
  internal_notes: z.string().max(4000).optional().nullable(),
});
