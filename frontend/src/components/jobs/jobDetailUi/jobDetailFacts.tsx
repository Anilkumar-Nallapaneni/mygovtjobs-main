import { isJunkKvFact } from "@/utils/jobDetailStructured";

export function displayValue(v: unknown, fallback = "") {
  const s = String(v ?? "").trim();
  if (!s || /^(?:-|—|tba|pending|null|undefined)$/i.test(s)) return fallback;
  return s;
}

function isKvRow(row: Record<string, string>) {
  const label = row.label || row.Label;
  const value = row.value || row.Value;
  return Boolean(label && value);
}

function isKvTable(rows: Record<string, string>[]) {
  return rows?.length > 0 && rows.every(isKvRow);
}

export function isDateTable(rows: Record<string, string>[]) {
  return (
    rows?.length > 0 &&
    rows.every((row) => {
      const event = row.event || row.Event;
      const date = row.date || row.Date;
      return Boolean(event && date);
    })
  );
}

export function FactsGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  const clean = items.filter((item) => item.label && item.value && !isJunkKvFact(item));
  if (!clean.length) return null;
  // Prefer a readable definition list over a dense card wall (long PDF values truncate poorly in cards).
  return (
    <dl className="job-detail-facts-list">
      {clean.map((item) => (
        <div key={`${item.label}-${item.value}`} className="job-detail-facts-list__row">
          <dt className="job-detail-facts-list__label">{item.label}</dt>
          <dd className="job-detail-facts-list__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function renderDataTable(rows: unknown) {
  const tableRows = Array.isArray(rows)
    ? rows
    : rows && typeof rows === "object"
      ? [rows as Record<string, string>]
      : [];
  if (!tableRows.length) return null;

  if (isKvTable(tableRows)) {
    return (
      <FactsGrid
        items={tableRows.map((row) => ({
          label: row.label || row.Label || "",
          value: row.value || row.Value || "",
        }))}
      />
    );
  }

  const keys = Object.keys(tableRows[0] || {});
  if (!keys.length) return null;

  return (
    <div className="job-detail-table-wrap">
      <table className="job-detail-table job-detail-table--data">
        <thead>
          <tr>
            {keys.map((key) => (
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, i) => (
            <tr key={i}>
              {keys.map((key) => (
                <td key={key}>{row[key] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Make raw PDF / ALL-CAPS notification text easier to read in the UI. */
export function formatSummaryForDisplay(text: string): string {
  let s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";

  if (/^page\s+\d+\s+of\s+\d+/i.test(s)) {
    s = s.replace(/^page\s+\d+\s+of\s+\d+\s*/i, "").trim();
  }

  if (/manual under right to information/i.test(s)) {
    const useful = s.match(
      /(?:teacher|recruitment|notification|hall\s*ticket|eligibility|examination|apply|release)[^.!?]{12,}[.!?]/i
    );
    if (useful) s = useful[0];
    else if (/^1\s+manual/i.test(s)) return "";
  }

  // Drop mostly-broken OCR / bilingual font strings.
  const bad = (s.match(/\uFFFD|[�?]{2,}|\?{3,}/g) || []).join("").length;
  if (bad >= 8 && bad / Math.max(s.length, 1) > 0.05) return "";
  const broken = (s.match(/[\u0100-\u024F\u1E00-\u1EFF\u0250-\u02AF]/g) || []).length;
  if (broken >= 8 && broken / Math.max(s.length, 1) > 0.04) {
    const parts = s.split(/(?<=[.!?])\s+/).filter((p) => {
      const b = (p.match(/[\u0100-\u024F\u1E00-\u1EFF\u0250-\u02AF]/g) || []).length;
      const latin = (p.match(/[A-Za-z]/g) || []).length;
      return latin >= 24 && b / Math.max(p.length, 1) < 0.02;
    });
    if (!parts.length) return "";
    s = parts.join(" ");
  }

  const alpha = s.replace(/[^a-zA-Z]/g, "");
  if (alpha.length > 40 && s === s.toUpperCase()) {
    s = s
      .toLowerCase()
      .replace(/(^|[.!?]\s+)(\w)/g, (_, sep, ch) => `${sep}${ch.toUpperCase()}`);
  }

  return s;
}
