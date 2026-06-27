import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Footer from '@/components/layout/Footer'
import type { FooterLinkTarget } from '@/hooks/useBrowseState'
import {
  fetchAdminDashboard,
  getStoredAdminKey,
  runIngest,
  setStoredAdminKey,
  type AdminDashboard,
} from '@/lib/adminApi'

type AdminDashboardPageProps = {
  onFooterLink?: (target: FooterLinkTarget) => void
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function formatWhen(value?: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

export default function AdminDashboardPage({ onFooterLink }: AdminDashboardPageProps) {
  const { t } = useTranslation()
  const [adminKey, setAdminKey] = useState(getStoredAdminKey)
  const [unlocked, setUnlocked] = useState(Boolean(getStoredAdminKey()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [ingestBusy, setIngestBusy] = useState(false)
  const [ingestMsg, setIngestMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const key = getStoredAdminKey()
    if (!key) return
    setLoading(true)
    setError(null)
    try {
      setData(await fetchAdminDashboard(key))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (unlocked) void load()
  }, [unlocked, load])

  const failedSources = useMemo(
    () => (data?.scrapers || []).filter((s) => s.enabled && s.last_error),
    [data?.scrapers]
  )

  const sync = data?.ingest?.last_sync as Record<string, unknown> | null | undefined

  const onUnlock = (e: FormEvent) => {
    e.preventDefault()
    const key = adminKey.trim()
    setStoredAdminKey(key)
    setUnlocked(Boolean(key))
  }

  const onRunIngest = async () => {
    const key = getStoredAdminKey()
    if (!key) return
    setIngestBusy(true)
    setIngestMsg(null)
    setError(null)
    try {
      await runIngest(key)
      setIngestMsg(t('admin.ingestStarted', { defaultValue: 'Ingest started. Refresh in a few minutes.' }))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIngestBusy(false)
    }
  }

  if (!API_BASE) {
    return (
      <div className="admin-dashboard admin-dashboard--gate">
        <h1>{t('admin.title', { defaultValue: 'Admin dashboard' })}</h1>
        <p>{t('admin.apiMissing', { defaultValue: 'Set VITE_API_URL to your backend API.' })}</p>
        <Footer onFooterLink={onFooterLink} />
      </div>
    )
  }

  if (!unlocked) {
    return (
      <div className="admin-dashboard admin-dashboard--gate">
        <h1>{t('admin.title', { defaultValue: 'Admin dashboard' })}</h1>
        <form className="admin-dashboard__gate-form" onSubmit={onUnlock}>
          <input
            type="password"
            autoComplete="off"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="admin-dashboard__key-input"
            placeholder={t('admin.apiKey', { defaultValue: 'Admin API key' })}
            aria-label={t('admin.apiKey', { defaultValue: 'Admin API key' })}
          />
          <button type="submit">{t('admin.unlock', { defaultValue: 'Unlock' })}</button>
        </form>
        <Footer onFooterLink={onFooterLink} />
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__header">
        <h1>{t('admin.title', { defaultValue: 'Admin dashboard' })}</h1>
        <div className="admin-dashboard__actions">
          <button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? t('admin.loading', { defaultValue: 'Loading…' }) : t('admin.refresh', { defaultValue: 'Refresh' })}
          </button>
          <button type="button" onClick={() => void onRunIngest()} disabled={ingestBusy}>
            {ingestBusy
              ? t('admin.ingestRunning', { defaultValue: 'Starting…' })
              : t('admin.runIngest', { defaultValue: 'Run ingest' })}
          </button>
        </div>
      </header>

      {error && <p className="admin-dashboard__error" role="alert">{error}</p>}
      {ingestMsg && <p className="account-page__status" role="status">{ingestMsg}</p>}

      {data?.jobs && (
        <section className="admin-dashboard__section">
          <h2>{t('admin.jobStats', { defaultValue: 'Job counts' })}</h2>
          <div className="admin-dashboard__cards">
            {(['total', 'live', 'draft', 'expired'] as const).map((key) => (
              <div key={key} className="admin-stat-card">
                <div className="admin-stat-card__meta">{key}</div>
                <div className="admin-stat-card__value">{data.jobs[key]}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {sync && (
        <section className="admin-dashboard__section">
          <h2>{t('admin.ingestSync', { defaultValue: 'Daily ingest' })}</h2>
          <ul className="admin-dashboard__counts">
            <li><span>Status</span><strong>{String(sync.status ?? '—')}</strong></li>
            <li><span>Last completed (IST)</span><strong>{formatWhen(sync.lastCompletedAtIst as string)}</strong></li>
            <li><span>Next run (IST)</span><strong>{formatWhen(sync.nextRunAtIst as string)}</strong></li>
            <li><span>Jobs after sync</span><strong>{String(sync.jobCount ?? '—')}</strong></li>
            <li><span>Sources scraped</span><strong>{String(sync.sourcesScraped ?? '—')}</strong></li>
          </ul>
        </section>
      )}

      {data?.sources && (
        <section className="admin-dashboard__section">
          <h2>{t('admin.sourceHealth', { defaultValue: 'Source health' })}</h2>
          <div className="admin-dashboard__cards">
            <div className="admin-stat-card">
              <div className="admin-stat-card__meta">Registered</div>
              <div className="admin-stat-card__value">{data.sources.total}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-card__meta">Active in DB</div>
              <div className="admin-stat-card__value">{data.sources.active}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-card__meta">With errors</div>
              <div className="admin-stat-card__value">{data.sources.with_errors}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-card__meta">Ran in 24h</div>
              <div className="admin-stat-card__value">{data.sources.last_run_within_24h}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-card__meta">Stale (&gt;7d)</div>
              <div className="admin-stat-card__value">{data.sources.stale ?? '—'}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-card__meta">Success rate</div>
              <div className="admin-stat-card__value">
                {data.sources.success_rate_pct != null ? `${data.sources.success_rate_pct}%` : '—'}
              </div>
            </div>
          </div>
          {failedSources.length > 0 && (
            <>
              <p className="admin-dashboard__warn">{failedSources.length} enabled source(s) with errors</p>
              <div className="admin-dashboard__table-wrap">
                <table className="admin-dashboard__table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Last run</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedSources.slice(0, 25).map((row) => (
                      <tr key={row.code} className="admin-dashboard__row--error">
                        <td>{row.code}</td>
                        <td>{formatWhen(row.last_run_at)}</td>
                        <td>{row.last_error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {data?.tables && Object.keys(data.tables).length > 0 && (
        <section className="admin-dashboard__section">
          <h2>{t('admin.supabaseTables', { defaultValue: 'Supabase tables' })}</h2>
          <ul className="admin-dashboard__counts">
            {Object.entries(data.tables).map(([key, value]) => (
              <li key={key}>
                <span>{key}</span>
                <strong>{value}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
