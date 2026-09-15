/**
 * Single display format for job dates in listing UIs: `4 Sep 2026`.
 * ISO calendar dates are parsed as India calendar dates (no UTC day-shift).
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function fromUtcParts(year: number, monthIndex: number, day: number): Date | null {
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) {
    return null;
  }
  const d = new Date(Date.UTC(year, monthIndex, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== monthIndex ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
}

/** Parse a job date string into UTC calendar parts (YYYY-MM-DD preferred). */
export function parseJobDate(value: string | null | undefined): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "—" || /^(tba|pending)$/i.test(raw)) return null;

  const iso = ISO_DATE.exec(raw);
  if (iso) {
    return fromUtcParts(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);
  if (dmy) {
    return fromUtcParts(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return fromUtcParts(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function formatJobDate(
  value: string | null | undefined,
  opts?: { compact?: boolean }
): string {
  const d = parseJobDate(value);
  if (!d) {
    const raw = String(value ?? "").trim();
    return raw && raw !== "—" ? raw : "—";
  }
  const day = d.getUTCDate();
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  if (opts?.compact) return `${day} ${month} '${String(year).slice(-2)}`;
  return `${day} ${month} ${year}`;
}

/** ISO calendar date `YYYY-MM-DD` when parseable. */
export function jobDateIso(value: string | null | undefined): string | undefined {
  const d = parseJobDate(value);
  if (!d) return undefined;
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
