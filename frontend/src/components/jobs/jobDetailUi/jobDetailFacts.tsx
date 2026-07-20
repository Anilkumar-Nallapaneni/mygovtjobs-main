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
  if (!items.length) return null;
  return (
    <div className="job-detail-facts-grid">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="job-detail-fact-card">
          <div className="job-detail-fact-label">{item.label}</div>
          <div className="job-detail-fact-value">{item.value}</div>
        </div>
      ))}
    </div>
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

  if (/manual under right to information/i.test(s)) {
    const useful = s.match(
      /(?:teacher|recruitment|notification|hall\s*ticket|eligibility|examination|apply|release)[^.!?]{12,}[.!?]/i
    );
    if (useful) s = useful[0];
    else if (/^1\s+manual/i.test(s)) return "";
  }

  const alpha = s.replace(/[^a-zA-Z]/g, "");
  if (alpha.length > 40 && s === s.toUpperCase()) {
    s = s
      .toLowerCase()
      .replace(/(^|[.!?]\s+)(\w)/g, (_, sep, ch) => `${sep}${ch.toUpperCase()}`);
  }

  return s;
}
