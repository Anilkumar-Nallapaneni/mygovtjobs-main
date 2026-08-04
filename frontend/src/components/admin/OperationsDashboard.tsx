import type { AdminOperations } from '@/lib/adminApi'

type Props = { data: AdminOperations }

function value(v: number | string | null | undefined) {
  return v == null ? '—' : String(v)
}

export default function OperationsDashboard({ data }: Props) {
  const cards = [
    ['Live jobs', data.jobs.live], ['Published', data.jobs.published],
    ['Needs review', data.jobs.needs_review], ['Closing today', data.jobs.closing_today],
    ['Closing in 3 days', data.jobs.closing_3_days], ['Broken links', data.jobs.broken_links],
    ['Missing apply link', data.jobs.missing_apply], ['Missing PDF', data.jobs.missing_pdf],
    ['Unhealthy sources', data.sources.unhealthy], ['Stale sources', data.sources.stale_24h],
  ] as const

  return (
    <section className="admin-dashboard__section" aria-labelledby="operations-title">
      <h2 id="operations-title">Operations control room</h2>
      <div className="admin-dashboard__cards">
        {cards.map(([label, metric]) => (
          <article className="admin-stat-card" key={label}>
            <div className="admin-stat-card__meta">{label}</div>
            <div className="admin-stat-card__value">{value(metric)}</div>
          </article>
        ))}
      </div>
      <h3>Latest pipeline</h3>
      <ul className="admin-dashboard__counts">
        <li><span>Status</span><strong>{value(data.last_pipeline?.status)}</strong></li>
        <li><span>Type</span><strong>{value(data.last_pipeline?.run_type)}</strong></li>
        <li><span>Published</span><strong>{value(data.last_pipeline?.published_count)}</strong></li>
        <li><span>Errors</span><strong>{value(data.last_pipeline?.error_count)}</strong></li>
      </ul>
      {data.sources.items.length > 0 && (
        <div className="admin-dashboard__table-wrap">
          <table className="admin-dashboard__table">
            <thead><tr><th>Source</th><th>Status</th><th>Checked</th><th>Error</th></tr></thead>
            <tbody>{data.sources.items.map((source) => (
              <tr key={source.source_code} className="admin-dashboard__row--error">
                <td>{source.source_code}</td><td>{source.health_status}</td>
                <td>{source.last_checked_at ? new Date(source.last_checked_at).toLocaleString() : '—'}</td>
                <td>{source.last_error || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}
