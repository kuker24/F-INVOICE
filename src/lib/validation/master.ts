import { z } from "zod";

export const customerSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(200),
  type: z
    .enum(["INDIVIDUAL", "COMPANY", "SCHOOL", "OTHER"])
    .optional()
    .default("INDIVIDUAL"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  tax_id: z.string().max(40).optional().nullable(),
  contact_person: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export const productSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  default_price: z.coerce.number().int().min(0),
  unit: z.string().max(40).optional().nullable(),
  billing_type: z
    .enum(["ONE_TIME", "MONTHLY", "QUARTERLY", "SEMIANNUAL", "YEARLY", "CUSTOM"])
    .optional()
    .default("ONE_TIME"),
  default_tax_rate: z.coerce.number().int().min(0).max(10000).optional().default(0),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export const paymentMethodSchema = z.object({
  type: z.enum(["BANK_TRANSFER", "E_WALLET", "CASH", "OTHER"]),
  bank_name: z.string().max(100).optional().nullable(),
  account_number: z.string().max(64).optional().nullable(),
  account_holder: z.string().max(120).optional().nullable(),
  branch: z.string().max(100).optional().nullable(),
  instructions: z.string().max(1000).optional().nullable(),
  is_default: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const businessSettingsSchema = z.object({
  business_name: z.string().min(1).max(200).optional(),
  legal_name: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  website: z.string().max(200).optional().nullable(),
  tax_id: z.string().max(40).optional().nullable(),
  default_due_days: z.coerce.number().int().min(0).max(365).optional(),
  default_terms: z.string().max(4000).optional().nullable(),
  default_notes: z.string().max(4000).optional().nullable(),
  timezone: z.string().max(64).optional(),
  invoice_prefix: z.string().min(1).max(12).optional(),
  payment_prefix: z.string().min(1).max(12).optional(),
  show_revenue_to_admin: z.boolean().optional(),
});
