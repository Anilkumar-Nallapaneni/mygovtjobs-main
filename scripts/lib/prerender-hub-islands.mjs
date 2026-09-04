/**
 * Visible no-JS body islands for SEO hubs (results, sarkari-naukri, state/board/org).
 */
export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDisplayDate(value) {
  const raw = String(value ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!m) return raw && raw !== "—" ? escapeHtml(raw) : "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

export function flattenRecruitmentEvents(payload, eventType, limit = 24) {
  const rows = payload?.byType?.[eventType];
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const rec of rows) {
    const ev = Array.isArray(rec.events) ? rec.events[0] : null;
    out.push({
      title: ev?.title || rec.title || "Official update",
      org: rec.organization || "",
      date: ev?.event_date || "",
      href: ev?.document_url || ev?.official_url || rec.official_url || "",
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function flattenArchiveItems(payload, limit = 24) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.slice(0, limit).map((item) => ({
    title: item.title || "Official update",
    org: item.dept || item.sourceName || "",
    date: item.publishedAt || "",
    href: item.link || "",
  }));
}

export function flattenJobItems(jobs, limit = 16) {
  return (jobs || []).slice(0, limit).map((job) => ({
    title: job.title || "Government recruitment",
    org: job.dept || "",
    date: job.last_date || job.lastDate || "",
    href: job.slug || job.id ? `/jobs/${encodeURIComponent(String(job.slug || job.id))}` : "",
  }));
}

export function flattenOrgItems(orgs, limit = 30) {
  return (orgs || []).slice(0, limit).map((row) => ({
    title: row.dept || row.slug || "Organisation",
    org: Number(row.count) > 0 ? `${row.count} live` : Number(row.vacancies) > 0 ? `${row.vacancies} vacancies` : "",
    date: "",
    href: row.slug ? `/org/${encodeURIComponent(String(row.slug))}` : "",
  }));
}

/** Conservative board/state needles so HSSC/UPSSSC do not count as SSC. */
export function textMatchesBoard(text, boardId) {
  const hay = String(text || "").toLowerCase();
  switch (boardId) {
    case "ssc":
      return /\bssc\b/.test(hay) && !/\b(upsssc|hssc|bssc|jssc|ossc|gkssc)\b/.test(hay);
    case "upsc":
      return /\bupsc\b/.test(hay);
    case "railways":
      return /\b(railway|rrb|rrc)\b/.test(hay);
    case "banking":
      return /\b(ibps|sbi|rbi|bank)\b/.test(hay);
    case "police":
      return /\b(police|capf|crpf|bsf|cisf|itbp)\b/.test(hay);
    case "teaching":
      return /\b(ctet|kvs|nvs|teacher|university|iit|iiser)\b/.test(hay);
    case "defence":
      return /\b(defence|drdo|army|navy|air force|isro)\b/.test(hay);
    case "psu":
      return /\b(psu|ongc|ntpc|gail|sail|port)\b/.test(hay);
    case "health":
      return /\b(nhm|esic|aiims|health|medical)\b/.test(hay);
    case "engineering":
      return /\b(engineer|engineering)\b/.test(hay);
    case "state":
      return /\bpsc\b/.test(hay);
    default:
      return hay.includes(String(boardId || "").toLowerCase());
  }
}

export function slugifyOrgName(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Exact org slug, or acronym alias (uppsc), never substring leaks like "psc". */
export function matchesOrgSlug(orgName, slug) {
  const target = String(slug || "").trim();
  if (!target || target.length < 4) return false;
  const full = slugifyOrgName(orgName);
  if (!full) return false;
  if (full === target) return true;
  const base = slugifyOrgName(String(orgName || "").replace(/\([^)]*\)/g, ""));
  if (base && base === target) return true;
  const [longer, shorter] = full.length >= target.length ? [full, target] : [target, full];
  if (!longer.startsWith(`${shorter}-`)) return false;
  const extra = longer.slice(shorter.length + 1);
  return /^[a-z]{2,6}$/.test(extra);
}

export function flattenEventsMatching(payload, predicate, limit = 16) {
  const out = [];
  for (const rows of Object.values(payload?.byType || {})) {
    if (!Array.isArray(rows)) continue;
    for (const rec of rows) {
      const hay = `${rec.organization || ""} ${rec.title || ""}`;
      if (!predicate(hay, rec)) continue;
      const ev = Array.isArray(rec.events) ? rec.events[0] : null;
      out.push({
        title: ev?.title || rec.title || "Official update",
        org: rec.organization || "",
        date: ev?.event_date || "",
        href: ev?.document_url || ev?.official_url || rec.official_url || "",
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function buildSeoHubIsland({ title, lede, body, items = [], empty = "" }) {
  const rows = items
    .map((item) => {
      const label = escapeHtml(item.title);
      const meta = [item.org, formatDisplayDate(item.date)].filter(Boolean).join(" · ");
      const href = String(item.href || "").trim();
      const link =
        href && /^https?:\/\//i.test(href)
          ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${label}</a>`
          : href.startsWith("/")
            ? `<a href="${escapeHtml(href)}">${label}</a>`
            : label;
      return `<li>${link}${meta ? `<span> — ${escapeHtml(meta)}</span>` : ""}</li>`;
    })
    .join("\n    ");
  const list = rows
    ? `<ul class="seo-hub-island__list">\n    ${rows}\n  </ul>`
    : empty
      ? `<p>${escapeHtml(empty)}</p>`
      : "";
  return `<article id="seo-hub" class="seo-static-island">
  <h1>${escapeHtml(title)}</h1>
  ${lede ? `<p class="seo-static-island__lede">${escapeHtml(lede)}</p>` : ""}
  ${body ? `<p class="seo-hub-island__body">${escapeHtml(body)}</p>` : ""}
  ${list}
</article>`;
}
