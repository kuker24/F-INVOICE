import assert from "node:assert/strict";

// Inline mirror of href + relative (keep tiny; no TS path)
function notificationHref(targetType, targetId, opts = {}) {
  if (!targetType || !targetId) return null;
  const portal = opts.portal ?? false;
  switch (targetType) {
    case "invoice":
      return portal ? `/portal/invoices` : `/invoices/${targetId}`;
    case "payment":
      return portal ? `/portal/payments` : `/payments`;
    case "subscription":
      return portal ? `/portal/subscriptions` : `/subscriptions`;
    case "customer":
      return portal ? null : `/customers/${targetId}`;
    default:
      return null;
  }
}

assert.equal(notificationHref("invoice", "abc"), "/invoices/abc");
assert.equal(notificationHref("invoice", "abc", { portal: true }), "/portal/invoices");
assert.equal(notificationHref("payment", "x"), "/payments");
assert.equal(notificationHref(null, "x"), null);
console.log("notifications href selfcheck ok");
