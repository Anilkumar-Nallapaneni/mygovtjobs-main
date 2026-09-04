/**
 * Strip PDF/OCR boilerplate from text used in meta descriptions and JSON-LD.
 * Keep in sync with shared/scrub-seo-text.mjs
 */

// PDF/OCR text can include C0 controls; strip them before meta/JSON-LD.
// eslint-disable-next-line no-control-regex -- intentional C0 control strip
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const PDF_BOILERPLATE = [
  /\bpage\s+\d+\s+of\s+\d+\b/gi,
  /\b\d+\s*\/\s*\d+\s*(?:pages?)?\b/gi,
  /\bscanned\s+by\s+camscanner\b/gi,
  /\bscanned\s+with\s+(?:camscanner|adobe\s+scan)\b/gi,
  /\badvertisement\s+download\b/gi,
  /\bclick\s+here\s+to\s+(?:download|apply|view)\b/gi,
  /\bplease\s+download\s+(?:the\s+)?(?:official\s+)?(?:notification|advertisement)\s+pdf\b/gi,
  /\bwww\.[a-z0-9.-]+\s+page\b/gi,
];

const OCR_NOISE = [/[|]{2,}/g, /_{3,}/g, /(?:^|\s)[^\w\s.,;:'"()\-/]{3,}(?=\s|$)/g];

export function scrubSeoText(text: unknown): string {
  let s = String(text ?? "").replace(CONTROL_CHARS, " ");
  for (const re of PDF_BOILERPLATE) s = s.replace(re, " ");
  for (const re of OCR_NOISE) s = s.replace(re, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length < 24) return "";
  if (/^page\s+\d+/i.test(s)) return "";
  return s;
}

export function jobSeoDescription(fields: {
  summary?: unknown;
  about?: unknown;
  title?: unknown;
  dept?: unknown;
  qualification?: unknown;
  maxLen?: number;
}): string {
  const raw = scrubSeoText(fields.summary || fields.about || "");
  const fallback = [fields.title, fields.dept, fields.qualification].filter(Boolean).join(" — ");
  const maxLen = fields.maxLen ?? 155;
  let out = raw || fallback;
  if (out.length > maxLen) out = `${out.slice(0, maxLen - 1)}…`;
  return out;
}
