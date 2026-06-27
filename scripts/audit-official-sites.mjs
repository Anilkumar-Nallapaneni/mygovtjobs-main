/**
 * Quick HEAD/GET audit of officialSites.ts URLs — writes scripts/data/site-audit.json
 *
 * Usage: node scripts/audit-official-sites.mjs [--limit=20] [--strict]
 *   --strict  exit 1 when >10% latestUrl probes return 404/410 (stale deep links)
 *
 * Network failures (timeouts, TLS, geo blocks on residential IPs) are reported but
 * do not fail --strict — only stale URLs (404/410) do. CI runs on ubuntu-latest.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OFFICIAL_SITES } from "../frontend/src/data/officialSites.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "data", "site-audit.json");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
const PROBE_TIMEOUT_MS = Number(process.env.PORTAL_AUDIT_TIMEOUT_MS || 15000);
const PROBE_RETRIES = Number(process.env.PORTAL_AUDIT_RETRIES || 1);

/** Stale deep link — fix latestUrl in officialSites.ts */
function isStale(result) {
  return result?.status === 404 || result?.status === 410;
}

/** Any HTTP response (incl. 403 bot-wall) — site host is up */
function hasHttpResponse(result) {
  return Boolean(result && result.status > 0);
}

async function probeOnce(url, method = "GET") {
  const res = await fetch(url, {
    method,
    redirect: "follow",
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
  });
  const text = method === "GET" ? await res.text() : "";
  return {
    status: res.status,
    ok: res.ok,
    stale: isStale({ status: res.status }),
    finalUrl: res.url,
    bytes: text.length,
    hasRss: /type=["']application\/rss\+xml/i.test(text) || /rel=["']alternate["'][^>]+rss/i.test(text),
  };
}

async function probe(url) {
  const attempts = ["GET", "HEAD"];
  let last = { status: 0, ok: false, stale: false, error: "fetch failed" };
  for (let retry = 0; retry <= PROBE_RETRIES; retry += 1) {
    for (let i = 0; i < attempts.length; i += 1) {
      try {
        const result = await probeOnce(url, attempts[i]);
        result.stale = isStale(result);
        if (!result.stale) return result;
        last = result;
      } catch (e) {
        last = {
          status: 0,
          ok: false,
          stale: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
      if (i === 0) await new Promise((r) => setTimeout(r, 350));
    }
    if (retry < PROBE_RETRIES) await new Promise((r) => setTimeout(r, 800));
  }
  return last;
}

function uniqueUrls(...urls) {
  const seen = new Set();
  return urls.filter((u) => {
    const t = (u || "").trim();
    if (!t || seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 0;
  let sites = [...OFFICIAL_SITES];
  if (limit > 0) sites = sites.slice(0, limit);

  const results = [];
  for (const s of sites) {
    const latest = await probe(s.latestUrl || s.url);
    const fallbacks = uniqueUrls(s.url, s.rssUrl).filter((u) => u !== (s.latestUrl || s.url));
    let home = null;
    if (fallbacks.length > 0) {
      home = await probe(fallbacks[0]);
    }

    const stale = isStale(latest);
    const networkFail = !hasHttpResponse(latest);
    const homeOk = home && hasHttpResponse(home) && !isStale(home);

    results.push({
      id: s.id,
      name: s.name,
      latestUrl: s.latestUrl,
      latest,
      home,
      stale,
      networkFail,
      homeFallbackOk: homeOk,
    });

    let tag = "ok";
    if (stale) tag = "STALE";
    else if (networkFail && !homeOk) tag = "FAIL";
    else if (networkFail && homeOk) tag = "warn-net";
    else if (!latest.ok) tag = "warn";

    const detail = latest.error || latest.finalUrl || s.latestUrl;
    console.log(`[${tag}] ${s.id} ${latest.status} ${detail}`);
    await new Promise((r) => setTimeout(r, 250));
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));

  const staleRows = results.filter((r) => r.stale);
  const networkRows = results.filter((r) => r.networkFail && !r.homeFallbackOk);
  const notOk = results.filter((r) => r.latest.status > 0 && !r.latest.ok && !r.stale);
  const stalePct = results.length ? (staleRows.length / results.length) * 100 : 0;
  const networkPct = results.length ? (networkRows.length / results.length) * 100 : 0;

  console.log(
    `\n${staleRows.length}/${results.length} stale deep links (${stalePct.toFixed(1)}%), ` +
      `${networkRows.length} network-unreachable (${networkPct.toFixed(1)}%), ` +
      `${notOk.length} HTTP non-ok (403/405 etc.) → ${OUT}`
  );

  const strict = process.argv.includes("--strict") || process.env.PORTAL_AUDIT_STRICT === "1";
  const maxFailPct = Number(process.env.PORTAL_AUDIT_MAX_FAIL_PCT || 10);
  if (strict && stalePct > maxFailPct) {
    console.error(
      `\n✗ Portal audit failed: ${stalePct.toFixed(1)}% stale latestUrl (404/410), max ${maxFailPct}%`
    );
    for (const r of staleRows) {
      console.error(`  - ${r.id}: ${r.latestUrl} → ${r.latest.status}`);
    }
    process.exit(1);
  }
  if (strict) {
    console.log(`\n✓ Portal audit passed (${stalePct.toFixed(1)}% stale ≤ ${maxFailPct}%)`);
    if (networkRows.length > 0) {
      console.log(
        `  (${networkRows.length} sites had network errors — expected on some residential IPs; not a CI failure)`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
