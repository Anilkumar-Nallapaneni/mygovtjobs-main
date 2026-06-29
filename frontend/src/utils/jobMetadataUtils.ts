/** Extract vacancies / last date from titles when DB fields are empty. */

const VACANCY_PATTERNS = [
  /[–—-]\s*([\d,]+)\s*(?:posts?|vacanc(?:ies|y)|bharti|positions?|seats?)\b/i,
  /\b([\d,]+)\s+(?:posts?|vacanc(?:ies|y)|positions?|seats?)\b/i,
  /\b([\d,]+)\s*posts?\b/i,
  /\b([\d,]+)\s*vacancies?\b/i,
  /(?:for|of)\s+([\d,]+)\s+(?:posts?|vacanc(?:ies|y))\b/i,
  /(?:total|maximum|max|upto|up\s+to)\s*[:-]?\s*([\d,]+)\s*(?:posts?|vacanc(?:ies|y)|positions?)?\b/i,
  /no\.?\s*of\s*(?:posts?|vacanc(?:ies|y))\s*[:-]?\s*([\d,]+)\b/i,
  /recruitment\s+(?:of|for)\s+([\d,]+)\b/i,
  /(?:notice|addendum|advertisement|recruitment)[:\s]+([\d,]+)\s+posts?\b/i,
  /:\s*([\d,]+)\s+posts?\s+of\b/i,
  /\b([\d,]+)\s+posts?\s+of\b/i,
  /\(([\d,]+)\s*(?:posts?|vacanc(?:ies|y))\)/i,
  /\b([\d,]+)\s*(?:\+\s*)?(?:regular|temporary)?\s*posts?\b/i,
];

const TOTAL_VACANCY_RE =
  /total\s*(?:no\.?\s*of\s*)?(?:posts?|vacanc(?:ies|y))\s*[:-]?\s*([\d,]+)/i;

const PINCODE_BEFORE_POSTS_RE = /[-–—]\s*(\d{6})\s*(?:\n\s*)?Posts\s*:/i;

const SALARY_NEARBY_RE = /(?:rs\.?|inr|₹|remuneration|emolument|pay\s*scale|per\s*month|p\.?m\.?)/i;

const ROLL_LIST_RE = /\bSl\s*No\.?\s*Roll\s*No\b/i;

const LAST_DATE_PATTERNS = [
  // Range — use closing date
  {
    re: /(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{4})\s*(?:TO|–|—|-)\s*(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{4})/i,
    pick: (m) => [m[4], m[5], m[6]],
  },
  {
    re: /(?:extended\s+)?(?:upto|until|up\s+to|by)\s+(\d{1,2})[./-](\d{1,2})[./-](\d{4})/i,
    pick: (m) => [m[1], m[2], m[3]],
  },
  {
    re: /(?:last\s*date|apply\s+(?:by|before|till)|closing\s+date)[:\s]+(\d{1,2})[./-](\d{1,2})[./-](\d{4})/i,
    pick: (m) => [m[1], m[2], m[3]],
  },
  {
    re: /dated\s+(\d{1,2})[.\s/-](\d{1,2})[.\s/-](\d{4})/i,
    pick: (m) => [m[1], m[2], m[3]],
  },
  {
    re: /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/,
    pick: (m) => [m[1], m[2], m[3]],
  },
];

function parseIntVacancy(raw) {
  const n = parseInt(String(raw || '').replace(/,/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Reject 4-digit years mistaken for post counts (e.g. Advt 2022). */
/** Prefer enriched vacancies (title/PDF resolved); fall back to DB raw value. */
export function effectiveVacancyCount(
  job: { vacancies?: number; rawVacancies?: number } | null | undefined
): number {
  return Number(job?.vacancies) || Number(job?.rawVacancies) || 0
}

export function sanitizeVacancyCount(count, title = '', context = '') {
  const n = Number(count) || 0
  if (n <= 0) return 0
  if (n > 250_000) return 0
  const ctx = `${title || ''} ${context || ''}`
  if (n >= 1900 && n <= 2035 && ctx.includes(String(n))) {
    const s = String(n)
    const usedAsPosts =
      new RegExp(`${s}\\s*(?:posts?|vacanc|positions?|seats?)`, 'i').test(ctx) ||
      new RegExp(`(?:posts?|vacanc|positions?|seats?)\\s*(?:of\\s*)?${s}\\b`, 'i').test(ctx)
    if (!usedAsPosts) return 0
  }
  return n
}

/** True when a year-sized number is likely an advert/calendar year, not a post count. */
export function isProbableYear(n, context = '') {
  const num = Number(n) || 0
  if (num < 1900 || num > 2035) return false
  const ctx = String(context || '')
  if (!ctx.includes(String(num))) return true
  const s = String(num)
  const usedAsPosts =
    new RegExp(`${s}\\s*(?:posts?|vacanc|positions?|seats?)`, 'i').test(ctx) ||
    new RegExp(`(?:posts?|vacanc|positions?|seats?)\\s*(?:of\\s*)?${s}\\b`, 'i').test(ctx)
  return !usedAsPosts
}

/** Prefer title/PDF-derived counts; posts breakdown is the floor when present. */
export function resolveVacancyCount(stored, title = '', summary = '', about = '', postsSum = 0) {
  const context = [title, summary, about].filter(Boolean).join(' ')
  const raw = Number(stored) || 0
  let storedN = sanitizeVacancyCount(raw, title, summary)
  if (isProbableYear(raw, context)) storedN = 0

  const titleOnly = sanitizeVacancyCount(extractVacanciesFromText(title), title, summary)

  if (postsSum > 0) {
    if (titleOnly >= postsSum) return titleOnly
    if (storedN >= postsSum && storedN <= Math.max(postsSum * 2, 5000)) return storedN
    return postsSum
  }

  const fromText = extractVacanciesFromText(title, summary, about)
  const safeFromText = fromText > 0 ? sanitizeVacancyCount(fromText, title, summary) : 0
  const anchor = storedN

  if (safeFromText > 0) {
    if (!anchor) {
      if (titleOnly > 0) return titleOnly
      if (safeFromText > 5000) return 0
      return safeFromText
    }
    if (safeFromText > anchor) {
      if (anchor < 5000 && safeFromText > anchor * 2) {
        if (titleOnly > 0 && titleOnly <= anchor * 3) return titleOnly
        return sanitizeVacancyCount(anchor, title, summary)
      }
      if (titleOnly > 0) return titleOnly
      return safeFromText
    }
    // Spurious small hits (e.g. "2) Senior Residents" list markers) must not beat stored count
    if (safeFromText < anchor && safeFromText < 10) {
      if (anchor >= 1900 && anchor <= 2035) return safeFromText > 0 ? safeFromText : titleOnly
      return anchor
    }
    return safeFromText
  }
  return anchor
}

/** @param {string} [d] @param {string} [m] @param {string} [y] */
function toIsoDate(d, m, y) {
  const day = parseInt(d, 10);
  const mon = parseInt(m, 10);
  const year = parseInt(y, 10);
  if (!day || !mon || !year || year < 2000 || year > 2100) return null;
  if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isProbableSalaryFalsePositive(match, blob) {
  const n = parseIntVacancy(match[1]);
  if (n < 1000 || n > 500_000) return false;
  const start = Math.max(0, match.index - 32);
  const end = Math.min(blob.length, match.index + match[0].length + 32);
  const window = blob.slice(start, end);
  return SALARY_NEARBY_RE.test(window);
}

function isProbablePincodePostsFalsePositive(match, blob) {
  const n = parseIntVacancy(match[1]);
  if (n < 100000 || n > 999999) return false;
  const start = Math.max(0, match.index - 24);
  const end = Math.min(blob.length, match.index + match[0].length + 16);
  const window = blob.slice(start, end);
  return PINCODE_BEFORE_POSTS_RE.test(window);
}

function isPlausibleVacancy(n, context, match = null, blob = '') {
  if (n < 1 || n > 250_000) return false;
  if (match && blob) {
    if (isProbablePincodePostsFalsePositive(match, blob)) return false;
    if (isProbableSalaryFalsePositive(match, blob)) return false;
  }
  return sanitizeVacancyCount(n, context) > 0;
}

/** @param {...string} chunks */
export function extractVacanciesFromText(...chunks) {
  const parts = chunks.filter(Boolean).map(String);
  const blob = parts.join(' ').trim();
  if (!blob) return 0;
  const titleCtx = parts[0] || blob;
  let scan = blob;
  if (ROLL_LIST_RE.test(blob) && !/\b\d{1,6}\s*(?:posts?|vacanc)/i.test(blob)) {
    scan = titleCtx;
  }
  const totals = [];
  const found = [];
  let m;
  const totalRe = new RegExp(TOTAL_VACANCY_RE.source, TOTAL_VACANCY_RE.flags + 'g');
  while ((m = totalRe.exec(scan)) !== null) {
    const n = parseIntVacancy(m[1]);
    if (isPlausibleVacancy(n, titleCtx, m, scan)) totals.push(n);
  }
  if (totals.length) return Math.max(...totals);
  for (const re of VACANCY_PATTERNS) {
    const g = new RegExp(re.source, re.flags + 'g');
    while ((m = g.exec(scan)) !== null) {
      const n = parseIntVacancy(m[1]);
      if (isPlausibleVacancy(n, titleCtx, m, scan)) found.push(n);
    }
  }

  let postsLineSum = 0;
  if (PINCODE_BEFORE_POSTS_RE.test(scan)) {
    const postsBlock = scan.split(PINCODE_BEFORE_POSTS_RE)[1]?.slice(0, 1200) || '';
    const numbered = postsBlock.match(/[-–—]\s*(\d{1,4})\s*(?:\n|$|\()/g) || [];
    const subtotals = numbered
      .map((chunk) => parseIntVacancy(chunk.replace(/[^\d]/g, '')))
      .filter((n) => n >= 1 && n <= 500);
    if (subtotals.length) postsLineSum = subtotals.reduce((a, b) => a + b, 0);
  }

  if (postsLineSum && (!found.length || postsLineSum > Math.max(...found))) {
    return sanitizeVacancyCount(postsLineSum, titleCtx, scan);
  }

  return found.length ? Math.max(...found) : 0;
}

export function extractLastDateFromTitle(title) {
  const t = String(title || '');
  for (const { re, pick } of LAST_DATE_PATTERNS) {
    const m = t.match(re);
    if (m) {
      const [d, mo, y] = pick(m);
      const iso = toIsoDate(d, mo, y);
      if (iso) return iso;
    }
  }
  return null;
}

export function normalizeIsoDate(value) {
  if (!value || value === '—') return null;
  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly) return dateOnly[1];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** True when two date strings refer to the same calendar day (YYYY-MM-DD). */
export function isSameCalendarDay(a, b) {
  const da = normalizeIsoDate(a);
  const db = normalizeIsoDate(b);
  return Boolean(da && db && da === db);
}

import { resolveJobQualification } from '@/utils/jobQualification'

function titleOnlyPosts(title = '') {
  return extractVacanciesFromText(title)
}

/** Merge DB fields with title/detail fallbacks for display. */
export function enrichJobMetadata(job) {
  const title = job?.title || '';
  const summary = job?.detail?.summary || job?.summary || '';
  const about = job?.about || '';

  let vacancies = Number(job?.vacancies) || 0;
  const postRows = Array.isArray(job?.posts)
    ? job.posts
    : Array.isArray(job?.detail?.posts)
      ? job.detail.posts
      : [];
  const postsSum = postRows.reduce((s, p) => s + (Number(p?.vacancies) || 0), 0);
  if (postsSum > 0 && (vacancies <= 0 || vacancies > 500 || vacancies > postsSum * 3)) {
    vacancies = postsSum;
  } else if (!vacancies && postsSum > 0) {
    vacancies = postsSum;
  }
  if (vacancies > 5000 && titleOnlyPosts(title) === 0) {
    vacancies = postsSum > 0 ? postsSum : 0;
  }
  vacancies = resolveVacancyCount(vacancies, title, summary, about, postsSum);

  let lastDate = job?.lastDate;
  if (!lastDate || lastDate === '—') {
    lastDate =
      extractLastDateFromTitle(title) ||
      normalizeIsoDate(job?.last_date) ||
      null;
  } else {
    lastDate = normalizeIsoDate(lastDate) || lastDate;
  }

  let publishedDate =
    normalizeIsoDate(job?.publishedDate) ||
    normalizeIsoDate(job?.published_at) ||
    normalizeIsoDate(job?.detail?.published) ||
    null;

  const updatedDate =
    normalizeIsoDate(job?.updatedDate) ||
    normalizeIsoDate(job?.updated_at) ||
    null;

  const qualResolved = resolveJobQualification(job)

  return {
    ...job,
    vacancies,
    lastDate: lastDate || '—',
    publishedDate,
    updatedDate,
    qual: qualResolved.label || job?.qual || 'See notification',
    eduFilterKey: qualResolved.key || job?.eduFilterKey || null,
    _enriched: true,
    _metaFromTitle: Boolean(
      (!Number(job?.vacancies) && vacancies > 0) ||
        ((job?.lastDate === '—' || !job?.lastDate) && lastDate && lastDate !== '—') ||
        qualResolved.key
    ),
  };
}
