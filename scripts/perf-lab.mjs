/**
 * Cold-transfer lab (curl) — Lighthouse CLI optional if installed.
 * Usage: node scripts/perf-lab.mjs [baseUrl]
 */
import { execSync } from "node:child_process";

const base = (process.argv[2] || process.env.E2E_BASE_URL || "https://f-invoice-orpin.vercel.app").replace(
  /\/$/,
  "",
);

const paths = ["/login", "/i/demo-missing-token-lab"];

function curlTransfer(path) {
  const url = `${base}${path}`;
  // cache-bust + no reuse; sum Content-Length of main document only (HTML)
  const out = execSync(
    `curl -sS -o /dev/null -w "%{size_download} %{time_starttransfer} %{http_code}" -H "Cache-Control: no-cache" -H "Pragma: no-cache" "${url}?_=${Date.now()}"`,
    { encoding: "utf8" },
  ).trim();
  const [bytes, ttfb, code] = out.split(/\s+/);
  return {
    path,
    bytes: Number(bytes),
    ttfbMs: Math.round(Number(ttfb) * 1000),
    code: Number(code),
  };
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

console.log("perf-lab base", base);
for (const p of paths) {
  const runs = [];
  for (let i = 0; i < 3; i++) runs.push(curlTransfer(p));
  const bytes = runs.map((r) => r.bytes);
  const ttfb = runs.map((r) => r.ttfbMs);
  console.log(
    JSON.stringify({
      path: p,
      http: runs[0].code,
      htmlBytes_median: median(bytes),
      ttfbMs_median: median(ttfb),
      runs,
    }),
  );
}

// Optional Lighthouse if binary present
try {
  execSync("command -v lighthouse", { stdio: "ignore" });
  const lh = execSync(
    `lighthouse ${base}/login --only-categories=performance,accessibility --chrome-flags="--headless --no-sandbox" --quiet --output=json --output-path=stdout`,
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, timeout: 120_000 },
  );
  const j = JSON.parse(lh);
  const cats = j.categories || {};
  console.log(
    JSON.stringify({
      lighthouse: {
        performance: cats.performance?.score,
        accessibility: cats.accessibility?.score,
      },
    }),
  );
} catch {
  console.log(JSON.stringify({ lighthouse: "skipped — install globally for CI" }));
}
