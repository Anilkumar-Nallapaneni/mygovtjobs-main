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
