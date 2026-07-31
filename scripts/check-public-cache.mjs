/**
 * Proves shipped public invoice path stays ISR-safe:
 * - page has revalidate, no makePdfUrl/Date.now
 * - getPublicInvoiceByToken has no after() outside cache fill
 * - after() only inside loadPublicInvoiceUncached
 * - middleware still skips auth on /i/
 * - sin1 regions preserved
 */
import { readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), "utf8");

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log("ok", msg);
  else {
    console.error("FAIL", msg);
    fails++;
  }
}

const page = read("src/app/i/[publicToken]/page.tsx");
// strip comments so prose mentioning Date.now does not fail
const pageCode = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
ok(/export const revalidate\s*=\s*60/.test(page), "public page revalidate=60");
ok(/preferredRegion/.test(page), "public page preferredRegion");
ok(!/makePdfUrl/.test(pageCode), "public page no makePdfUrl (Date.now leak)");
ok(!/Date\.now\s*\(/.test(pageCode), "public page no Date.now()");
ok(/pdf\?token=/.test(page) || /token=\$\{/.test(page), "public PDF uses token query");
ok(/getPublicInvoiceByToken/.test(page), "uses getPublicInvoiceByToken");

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const inv = read("src/server/services/invoices.ts");
const getStart = inv.indexOf("export async function getPublicInvoiceByToken");
const afterGet = inv.slice(getStart);
// next top-level decl only (column 0) — ignore indented const inside body
const nextTop = afterGet.search(/\n(?:export |async function |function |type )/);
const getBody =
  nextTop > 0 ? afterGet.slice(0, nextTop) : afterGet.slice(0, 1200);
const getCode = stripComments(getBody);
// after should not appear in getPublicInvoiceByToken itself
ok(!/\bafter\s*\(/.test(getCode), "getPublicInvoiceByToken has no after()");
ok(/unstable_cache/.test(getCode), "getPublicInvoiceByToken uses unstable_cache");
ok(/loadPublicInvoiceUncached/.test(inv), "loadPublicInvoiceUncached exists");
const loadStart = inv.indexOf("async function loadPublicInvoiceUncached");
const loadEnd = inv.indexOf("export async function getPublicInvoiceByToken");
const loadBody = stripComments(inv.slice(loadStart, loadEnd));
ok(/\bafter\s*\(/.test(loadBody), "after() only on cache fill path");
ok(
  loadBody.includes("after(") && !getCode.includes("after("),
  "after only in uncached loader",
);

const mw = read("src/middleware.ts");
ok(/pathname\.startsWith\("\/i\/"\)/.test(mw), "middleware special-cases /i/");
ok(/SKIP_AUTH_PREFIXES/.test(mw) && mw.includes('"/i/"'), "SKIP_AUTH includes /i/");
ok(!/updateSession/.test(mw.slice(mw.indexOf('if (pathname.startsWith("/i/")'), mw.indexOf('if (pathname.startsWith("/i/")') + 400)), " /i/ branch no updateSession");

const vj = read("vercel.json");
ok(/"sin1"/.test(vj), "vercel regions sin1");
ok(!/\*\/5/.test(vj), "no 5-minute cron");

const layout = read("src/app/layout.tsx");
ok(/preferredRegion[\s\S]*sin1/.test(layout), "root preferredRegion sin1");

const dash = read("src/app/(dashboard)/dashboard/page.tsx");
ok(/Suspense/.test(dash), "dashboard uses Suspense");
const portal = read("src/app/(portal)/portal/page.tsx");
ok(/Suspense/.test(portal), "portal uses Suspense");

const pdf = read("src/app/api/invoices/[id]/pdf/route.ts");
ok(/token\.length >= 32/.test(pdf) || /token && token\.length/.test(pdf), "PDF allows public token auth");
ok(/public_token === token/.test(pdf), "PDF checks public_token match");

if (fails) {
  console.error(`\n${fails} check(s) failed`);
  process.exit(1);
}
console.log("\nall public-cache structural checks ok");
