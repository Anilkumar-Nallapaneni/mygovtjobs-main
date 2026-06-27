/**
 * Quick audit: node scripts/audit-sites.mjs
 */
import https from "node:https";
import { OFFICIAL_SITES } from "../frontend/src/data/officialSites.js";

const ua =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 GovJobAlert/1.0";
const insecure = new https.Agent({ rejectUnauthorized: false });

function httpsFetch(url, maxRedirects = 6) {
  return new Promise((resolve) => {
    const visit = (target, hops) => {
      if (hops > maxRedirects) return resolve({ err: "too many redirects" });
      let u;
      try {
        u = new URL(target);
      } catch {
        return resolve({ err: "bad url" });
      }
      const req = https.request(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          method: "GET",
          headers: { "User-Agent": ua, Accept: "text/html,*/*", "Accept-Language": "en-IN,en;q=0.9" },
          agent: insecure,
          timeout: 22000,
        },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const body = Buffer.concat(chunks).toString("utf8");
            const loc = res.headers.location;
            if (loc && [301, 302, 303, 307, 308].includes(res.statusCode)) {
              try {
                return visit(new URL(loc, target).toString(), hops + 1);
              } catch {
                return resolve({ err: "bad redirect" });
              }
            }
            resolve({ status: res.statusCode, url: target, len: body.length });
          });
        }
      );
      req.on("error", (e) => resolve({ err: e.code || e.message }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ err: "timeout" });
      });
    };
    visit(url, 0);
  });
}

async function probe(url) {
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(22000),
      headers: { "User-Agent": ua, Accept: "text/html,*/*" },
    });
    const len = (await r.clone().text()).length;
    return { mode: "fetch", status: r.status, ok: r.ok, url: r.url, len };
  } catch (e) {
    const tls = await httpsFetch(url);
    return { mode: "tls", err: e.cause?.code || e.message?.slice(0, 36), ...tls };
  }
}

const rows = [];
for (const s of OFFICIAL_SITES) {
  const url = s.latestUrl || s.url;
  const r = await probe(url);
  const good =
    (r.ok && r.len > 800) ||
    (r.status && r.status < 400 && r.len > 800) ||
    (r.len > 3000);
  rows.push({ id: s.id, good, ...r, configured: url });
}

const failed = rows.filter((r) => !r.good);
console.log(`${rows.length - failed.length}/${rows.length} reachable (heuristic)`);
for (const r of failed) {
  console.log(
    [r.id, r.mode, r.status || r.err, `len=${r.len ?? 0}`, r.configured].filter(Boolean).join(" | ")
  );
}
