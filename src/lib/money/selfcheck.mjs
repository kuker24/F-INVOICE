/** Golden examples from design doc — run: node src/lib/money/selfcheck.mjs */

function lineTaxAmount(afterDiscount, taxRateBp) {
  return (afterDiscount * BigInt(taxRateBp) + 5000n) / 10000n;
}

function computeLine({ quantity, unitPrice, discountAmount, taxRateBp }) {
  const gross = BigInt(quantity) * unitPrice;
  const afterDiscount = gross - discountAmount;
  if (afterDiscount < 0n) throw new Error("LINE_DISCOUNT_EXCEEDS_GROSS");
  const taxAmount = lineTaxAmount(afterDiscount, taxRateBp);
  return { afterDiscount, taxAmount, lineTotal: afterDiscount + taxAmount };
}

function computeInvoiceTotals(lines, header) {
  const subtotal = lines.reduce((s, l) => s + l.afterDiscount, 0n);
  if (header.discountAmount > subtotal) throw new Error("HEADER_DISCOUNT_EXCEEDS_SUBTOTAL");
  const taxAmount = lines.reduce((s, l) => s + l.taxAmount, 0n);
  return {
    subtotal,
    taxAmount,
    totalAmount: subtotal - header.discountAmount + taxAmount + header.additionalFee,
  };
}

let failed = 0;
function assert(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    failed++;
  } else {
    console.log("ok", name);
  }
}

// Example A
{
  const line = computeLine({
    quantity: 1,
    unitPrice: 1_500_000n,
    discountAmount: 0n,
    taxRateBp: 1100,
  });
  assert("A tax 165000", line.taxAmount === 165_000n);
  assert("A total 1665000", line.lineTotal === 1_665_000n);
}

// Example B
{
  const line = computeLine({
    quantity: 2,
    unitPrice: 100_000n,
    discountAmount: 20_000n,
    taxRateBp: 1100,
  });
  assert("B after 180000", line.afterDiscount === 180_000n);
  assert("B tax 19800", line.taxAmount === 19_800n);
  const t = computeInvoiceTotals([line], {
    discountAmount: 30_000n,
    additionalFee: 5_000n,
  });
  assert("B total 174800", t.totalAmount === 174_800n);
}

// Example C half-up
assert("C 100bp", lineTaxAmount(100n, 1100) === 11n);
assert("C 1bp", lineTaxAmount(1n, 1100) === 0n);
assert("C 5bp", lineTaxAmount(5n, 1100) === 1n);

// header discount over
try {
  computeInvoiceTotals(
    [{ afterDiscount: 100n, taxAmount: 0n }],
    { discountAmount: 200n, additionalFee: 0n },
  );
  assert("header reject", false);
} catch (e) {
  assert("header reject", e.message === "HEADER_DISCOUNT_EXCEEDS_SUBTOTAL");
}

if (failed) {
  console.error(failed, "failed");
  process.exit(1);
}
console.log("all money selfcheck ok");
