/** Pure integer IDR math. tax_rate_bp: 1100 = 11%. Half-up to nearest rupiah. */

export function lineTaxAmount(afterDiscount: bigint, taxRateBp: number): bigint {
  if (taxRateBp < 0) throw new Error("TAX_RATE_NEGATIVE");
  return (afterDiscount * BigInt(taxRateBp) + 5000n) / 10000n;
}

export function computeLine(input: {
  quantity: number;
  unitPrice: bigint;
  discountAmount: bigint;
  taxRateBp: number;
}) {
  if (input.quantity <= 0) throw new Error("QTY_INVALID");
  if (input.unitPrice < 0n) throw new Error("PRICE_NEGATIVE");
  if (input.discountAmount < 0n) throw new Error("DISCOUNT_NEGATIVE");
  const gross = BigInt(input.quantity) * input.unitPrice;
  const afterDiscount = gross - input.discountAmount;
  if (afterDiscount < 0n) throw new Error("LINE_DISCOUNT_EXCEEDS_GROSS");
  const taxAmount = lineTaxAmount(afterDiscount, input.taxRateBp);
  const lineTotal = afterDiscount + taxAmount;
  return { gross, afterDiscount, taxAmount, lineTotal };
}

export function computeInvoiceTotals(
  lines: { afterDiscount: bigint; taxAmount: bigint }[],
  header: { discountAmount: bigint; additionalFee: bigint },
) {
  if (header.discountAmount < 0n) throw new Error("HEADER_DISCOUNT_NEGATIVE");
  if (header.additionalFee < 0n) throw new Error("FEE_NEGATIVE");
  const subtotal = lines.reduce((s, l) => s + l.afterDiscount, 0n);
  if (header.discountAmount > subtotal) {
    throw new Error("HEADER_DISCOUNT_EXCEEDS_SUBTOTAL");
  }
  const taxAmount = lines.reduce((s, l) => s + l.taxAmount, 0n);
  const totalAmount =
    subtotal - header.discountAmount + taxAmount + header.additionalFee;
  if (totalAmount < 0n) throw new Error("TOTAL_NEGATIVE");
  return { subtotal, taxAmount, totalAmount };
}

export function toBigInt(n: number | string | bigint): bigint {
  if (typeof n === "bigint") return n;
  if (typeof n === "number") {
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      throw new Error("MONEY_NOT_INTEGER");
    }
    return BigInt(n);
  }
  return BigInt(n);
}

export function toNumber(n: bigint): number {
  const v = Number(n);
  if (!Number.isSafeInteger(v)) throw new Error("MONEY_OVERFLOW");
  return v;
}

export function formatIdr(amount: number | bigint): string {
  const n = typeof amount === "bigint" ? toNumber(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}
