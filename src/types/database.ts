export type UserRole = "DEVELOPER" | "ADMIN" | "USER";
export type AccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "INVITED";
export type CustomerType = "INDIVIDUAL" | "COMPANY" | "SCHOOL" | "OTHER";
export type CustomerStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type ProductStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type BillingType =
  | "ONE_TIME"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUAL"
  | "YEARLY"
  | "CUSTOM";
export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";
export type InvoiceType =
  | "PROJECT"
  | "SUBSCRIPTION"
  | "MAINTENANCE"
  | "HOSTING"
  | "OTHER";
export type SubscriptionStatus = "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED";
export type BillingCycle =
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUAL"
  | "YEARLY"
  | "CUSTOM";
export type PaymentStatus = "PENDING" | "VERIFIED" | "REJECTED" | "CANCELLED";
export type PaymentMethodType = "BANK_TRANSFER" | "E_WALLET" | "CASH" | "OTHER";
export type RecordStatus = "ACTIVE" | "INACTIVE";
export type TemplateLayout = "MINIMAL" | "CORPORATE";
export type PaymentSource = "staff" | "portal" | "public";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: AccountStatus;
  customer_id: string | null;
  owner_id: string | null;
  last_login_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  owner_id: string;
  code: string;
  name: string;
  type: CustomerType;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  tax_id: string | null;
  contact_person: string | null;
  notes: string | null;
  status: CustomerStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Product = {
  id: string;
  owner_id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  default_price: number;
  unit: string | null;
  billing_type: BillingType;
  default_tax_rate: number;
  status: ProductStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type BusinessSettings = {
  id: string;
  owner_id: string;
  business_name: string;
  legal_name: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  logo_url: string | null;
  signature_url: string | null;
  default_currency: string;
  timezone: string;
  invoice_prefix: string;
  payment_prefix: string;
  default_due_days: number;
  default_terms: string | null;
  default_notes: string | null;
  show_revenue_to_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type PaymentMethod = {
  id: string;
  owner_id: string;
  type: PaymentMethodType;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  branch: string | null;
  instructions: string | null;
  is_default: boolean;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  owner_id: string;
  customer_id: string;
  subscription_id: string | null;
  invoice_number: string;
  invoice_type: InvoiceType;
  issue_date: string;
  due_date: string;
  currency: string;
  status: InvoiceStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  additional_fee: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  allow_partial_payment: boolean;
  template_id: string | null;
  payment_method_id: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  terms: string | null;
  public_token: string;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  subscription_period_start: string | null;
  subscription_period_end: string | null;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  product_id: string | null;
  position: number;
  name: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  owner_id: string;
  customer_id: string;
  product_id: string | null;
  name: string;
  description: string | null;
  billing_cycle: BillingCycle;
  custom_interval_days: number | null;
  price: number;
  currency: string;
  start_date: string;
  next_invoice_date: string;
  end_date: string | null;
  due_days: number;
  auto_generate_invoice: boolean;
  template_id: string | null;
  payment_method_id: string | null;
  status: SubscriptionStatus;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
};

export type Payment = {
  id: string;
  owner_id: string;
  invoice_id: string;
  customer_id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  method: string | null;
  sender_name: string | null;
  reference_number: string | null;
  proof_url: string | null;
  status: PaymentStatus;
  notes: string | null;
  submitted_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  source: PaymentSource;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
};

export type InvoiceTemplate = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  layout_type: TemplateLayout;
  accent_color: string | null;
  logo_position: string | null;
  footer_text: string | null;
  show_signature: boolean;
  is_default: boolean;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  target_type: string | null;
  target_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export type ActivityLog = {
  id: string;
  owner_id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type PublicInvoiceDTO = {
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  currency: "IDR";
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  additional_fee: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  allow_partial_payment: boolean;
  customer_notes: string | null;
  terms: string | null;
  customer_name: string;
  business_name: string;
  items: {
    name: string;
    description: string | null;
    quantity: number;
    unit: string | null;
    unit_price: number;
    discount_amount: number;
    tax_rate: number;
    tax_amount: number;
    line_total: number;
  }[];
  payment_method: {
    type: PaymentMethodType;
    bank_name: string | null;
    account_number: string | null;
    account_holder: string | null;
    instructions: string | null;
  } | null;
};
