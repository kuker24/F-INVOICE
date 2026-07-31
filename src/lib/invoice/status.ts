import type { InvoiceStatus } from "@/types/database";

export const USER_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["CANCELLED"],
  VIEWED: ["CANCELLED"],
  PARTIALLY_PAID: ["CANCELLED"],
  OVERDUE: ["CANCELLED"],
  PAID: [],
  CANCELLED: [],
};

export const SYSTEM_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: [],
  SENT: ["VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE"],
  VIEWED: ["PARTIALLY_PAID", "PAID", "OVERDUE"],
  PARTIALLY_PAID: ["PAID", "OVERDUE", "PARTIALLY_PAID"],
  OVERDUE: ["PARTIALLY_PAID", "PAID", "OVERDUE"],
  PAID: ["PARTIALLY_PAID", "OVERDUE", "VIEWED", "SENT"],
  CANCELLED: [],
};

export function canUserTransition(from: InvoiceStatus, to: InvoiceStatus) {
  return USER_TRANSITIONS[from].includes(to);
}

export function recomputePaymentDrivenStatus(input: {
  amountPaid: number;
  totalAmount: number;
  currentStatus: InvoiceStatus;
  dueDate: string; // YYYY-MM-DD
  today: string; // YYYY-MM-DD business TZ
  sentAt: string | null;
  viewedAt: string | null;
}): { status: InvoiceStatus; paidAt: string | null; clearPaidAt: boolean } {
  const { amountPaid, totalAmount } = input;
  if (amountPaid === totalAmount && totalAmount > 0) {
    return {
      status: "PAID",
      paidAt: new Date().toISOString(),
      clearPaidAt: false,
    };
  }
  if (amountPaid > 0 && amountPaid < totalAmount) {
    return { status: "PARTIALLY_PAID", paidAt: null, clearPaidAt: true };
  }
  // amountPaid === 0
  if (
    input.currentStatus === "PAID" ||
    input.currentStatus === "PARTIALLY_PAID" ||
    input.currentStatus === "OVERDUE"
  ) {
    if (input.dueDate < input.today) {
      return { status: "OVERDUE", paidAt: null, clearPaidAt: true };
    }
    if (input.viewedAt) {
      return { status: "VIEWED", paidAt: null, clearPaidAt: true };
    }
    if (input.sentAt) {
      return { status: "SENT", paidAt: null, clearPaidAt: true };
    }
  }
  return {
    status: input.currentStatus,
    paidAt: null,
    clearPaidAt: amountPaid === 0,
  };
}

export const OPEN_FOR_PAYMENT: InvoiceStatus[] = [
  "SENT",
  "VIEWED",
  "PARTIALLY_PAID",
  "OVERDUE",
];
