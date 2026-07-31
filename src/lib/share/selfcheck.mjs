/** node src/lib/share/selfcheck.mjs */
function whatsappShareUrl(phone, text) {
  const digits = (phone ?? "").replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("0")) n = `62${n.slice(1)}`;
  const q = encodeURIComponent(text);
  if (n.length >= 10) return `https://wa.me/${n}?text=${q}`;
  return `https://wa.me/?text=${q}`;
}

const a = whatsappShareUrl("081234567890", "hi");
if (!a.startsWith("https://wa.me/6281234567890?text=")) {
  console.error("FAIL phone normalize", a);
  process.exit(1);
}
const b = whatsappShareUrl(null, "x");
if (!b.startsWith("https://wa.me/?text=")) {
  console.error("FAIL empty phone", b);
  process.exit(1);
}
console.log("OK share/whatsapp");
