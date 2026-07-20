export function JobDetailHighlights({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="job-detail-highlights" role="list">
      {items.map((item) => (
        <span key={item} role="listitem">
          {item}
        </span>
      ))}
    </div>
  );
}

export function ImportantDatesTimeline({
  entries,
  translateEvent,
}: {
  entries: Array<[string, string]>;
  translateEvent: (event: string) => string;
}) {
  if (!entries.length) return null;
  return (
    <ol className="job-detail-timeline">
      {entries.map(([event, dateVal], idx) => (
        <li key={`${event}-${dateVal}`} className="job-detail-timeline__item">
          <div className="job-detail-timeline__marker" aria-hidden>
            <span className="job-detail-timeline__dot" />
            {idx < entries.length - 1 ? <span className="job-detail-timeline__line" /> : null}
          </div>
          <div className="job-detail-timeline__body">
            <div className="job-detail-timeline__event">{translateEvent(event)}</div>
            <div className="job-detail-timeline__date">{String(dateVal)}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FeeGrid({
  entries,
  translateKey,
}: {
  entries: Array<[string, string]>;
  translateKey: (key: string) => string;
}) {
  if (!entries.length) return null;
  return (
    <div className="job-detail-fee-grid">
      {entries.map(([key, value]) => (
        <div key={key} className="job-detail-fee-card">
          <div className="job-detail-fee-card__label">{translateKey(key)}</div>
          <div className="job-detail-fee-card__value">{String(value)}</div>
        </div>
      ))}
    </div>
  );
}

export function ExtraDetailsGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  if (!items.length) return null;
  return (
    <div className="job-detail-extra-grid">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="job-detail-extra-card">
          <div className="job-detail-extra-label">{item.label}</div>
          <div className="job-detail-extra-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function EligibilityBlock({
  items,
  rows,
}: {
  items: string[];
  rows: Array<{ label: string; value: string }>;
}) {
  const hasList = items.length > 0;
  const hasRows = rows.some((r) => r.value && r.value !== "—");
  if (!hasList && !hasRows) return null;

  return (
    <div className="job-detail-eligibility">
      {hasRows ? (
        <dl className="job-detail-eligibility-grid">
          {rows
            .filter((r) => r.value && r.value !== "—")
            .map((row) => (
              <div key={row.label} className="job-detail-eligibility-grid__row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
        </dl>
      ) : null}
      {hasList ? (
        <ul className="job-detail-eligibility-list">
          {items.map((item, i) => (
            <li key={i} className="job-detail-eligibility-list__item">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
