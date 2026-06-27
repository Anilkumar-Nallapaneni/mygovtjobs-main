/**
 * Shared 2-month (default) notification window for fetch scripts.
 * CLI: --days=60
 */

export const DEFAULT_LOOKBACK_DAYS = 60;

export function parseDaysArg(argv = process.argv, fallback = DEFAULT_LOOKBACK_DAYS) {
  const flag = argv.find((a) => a.startsWith("--days="));
  if (flag) {
    const n = Number(flag.split("=")[1]);
    if (Number.isFinite(n) && n > 0) return Math.min(365, Math.floor(n));
  }
  return fallback;
}

export function lookbackCutoffIso(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/** @param {string|null|undefined} publishedAtIso */
export function isWithinLookback(publishedAtIso, days, { includeUnknown = true } = {}) {
  if (!publishedAtIso) return includeUnknown;
  const t = Date.parse(publishedAtIso);
  if (!Number.isFinite(t)) return includeUnknown;
  return t >= Date.parse(lookbackCutoffIso(days));
}

export function filterByLookback(items, days, opts = {}) {
  return items.filter((row) => isWithinLookback(row.publishedAt || row.published, days, opts));
}
