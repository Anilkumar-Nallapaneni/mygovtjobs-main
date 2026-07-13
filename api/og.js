/**
 * Dynamic OG share image (SVG) — ?title=Job+Title
 * Deployed as a Vercel serverless function at /api/og
 */
function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTitle(title, maxChars = 80) {
  const clean = String(title || "Government Job").replace(/\s+/g, " ").trim().slice(0, maxChars);
  if (clean.length <= 42) return [clean];
  const words = clean.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > 42 && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export default function handler(req, res) {
  const siteUrl = (process.env.VITE_SITE_URL || process.env.ALERT_SITE_URL || "https://www.livegovtjobs.com").replace(
    /\/$/,
    ""
  );
  const titleLines = wrapTitle(req.query?.title);
  const titleSvg = titleLines
    .map((line, index) => {
      const y = 300 + index * 46;
      return `<text x="96" y="${y}" fill="#f8fafc" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="700">${escapeXml(line)}</text>`;
    })
    .join("\n  ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="64" y="64" width="8" height="502" fill="#f97316"/>
  <text x="96" y="140" fill="#fdba74" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="600">Live Govt Jobs</text>
  <text x="96" y="210" fill="#94a3b8" font-family="Segoe UI, Arial, sans-serif" font-size="24">Official government recruitment</text>
  ${titleSvg}
  <text x="96" y="560" fill="#64748b" font-family="Segoe UI, Arial, sans-serif" font-size="22">www.livegovtjobs.com</text>
</svg>`;

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.status(200).send(svg);
}
