/**
 * Proves shipped public invoice path stays ISR-safe:
 * - page has revalidate, no makePdfUrl/Date.now/after/cookies
 * - getPublicInvoiceByToken pure unstable_cache
 * - VIEWED via beacon + API, not render path
 * - middleware matcher excludes /i/
 * - sin1 regions preserved
 */
import { readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), "utf8");
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log("ok", msg);
  else {
    console.error("FAIL", msg);
    fails++;
  }
}

const page = read("src/app/i/[publicToken]/page.tsx");
const pageCode = stripComments(page);
ok(/export const revalidate\s*=\s*60/.test(page), "public page revalidate=60");
ok(/preferredRegion/.test(page), "public page preferredRegion");
ok(!/makePdfUrl/.test(pageCode), "public page no makePdfUrl");
ok(!/Date\.now\s*\(/.test(pageCode), "public page no Date.now()");
ok(!/\bafter\s*\(/.test(pageCode), "public page no after()");
ok(!/cookies\s*\(/.test(pageCode), "public page no cookies()");
ok(/PublicViewBeacon/.test(page), "public page has VIEWED beacon");
ok(/pdf\?token=/.test(page) || /token=\$\{/.test(page), "public PDF uses token query");
ok(/getPublicInvoiceByToken/.test(page), "uses getPublicInvoiceByToken");

const inv = read("src/server/services/invoices.ts");
const getStart = inv.indexOf("export async function getPublicInvoiceByToken");
const afterGet = inv.slice(getStart);
const nextTop = afterGet.search(/\n(?:export |async function |function |type )/);
const getBody =
  nextTop > 0 ? afterGet.slice(0, nextTop) : afterGet.slice(0, 1200);
const getCode = stripComments(getBody);
ok(!/\bafter\s*\(/.test(getCode), "getPublicInvoiceByToken has no after()");
ok(/unstable_cache/.test(getCode), "getPublicInvoiceByToken uses unstable_cache");
ok(!/\bafter\s*\(/.test(stripComments(inv)), "invoices service no after() at all");

const mw = read("src/middleware.ts");
ok(/matcher:/.test(mw), "middleware has matcher");
ok(/i\//.test(mw) && /matcher[\s\S]*i\//.test(mw), "matcher excludes i/ path");
ok(!/checkRateLimit/.test(mw), "middleware no rate-limit import");
ok(!/PUBLIC_VIEW_LIMIT/.test(mw), "middleware no PUBLIC_VIEW_LIMIT");

const beacon = read("src/components/invoice/public-view-beacon.tsx");
ok(/sendBeacon|fetch/.test(beacon), "beacon posts view");
ok(/\/api\/public\/invoices\//.test(beacon), "beacon hits public view API");

const viewApi = read("src/app/api/public/invoices/[token]/view/route.ts");
ok(/export async function POST/.test(viewApi), "view API is POST");
ok(/status:\s*["']VIEWED["']|status:\s*"VIEWED"/.test(viewApi), "view API sets VIEWED");
ok(/checkRateLimit/.test(viewApi), "view API rate-limits");

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
