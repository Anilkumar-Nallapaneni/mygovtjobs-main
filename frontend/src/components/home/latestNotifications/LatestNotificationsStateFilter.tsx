import { LATEST_NOTIF_STATE_CHIPS } from '@/data/statesChips'

type TranslateFn = (key: string, opts?: Record<string, unknown>) => string

export function LatestNotificationsStateFilter({
  total,
  stateCounts,
  activeStateId,
  onSelect,
  t,
}: {
  total: number
  stateCounts: Record<string, number>
  activeStateId: string | null
  onSelect: (stateId: string | null) => void
  t: TranslateFn
}) {
  return (
    <div className="latest-notif__state-filter">
      <span className="latest-notif__state-filter-label">
        {t('latestNotif.browseState', { defaultValue: 'Browse by state' })}
      </span>
      <div className="latest-notif__state-filter-pills" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={!activeStateId}
          className={`latest-notif__state-pill${!activeStateId ? ' latest-notif__state-pill--active' : ''}`}
          onClick={() => onSelect(null)}
        >
          {t('latestNotif.allStates', { defaultValue: 'All' })}
          <span className="latest-notif__state-pill-count">({total})</span>
        </button>
        {(stateCounts.all ?? 0) > 0 ? (
          <button
            type="button"
            role="tab"
            aria-selected={activeStateId === 'all'}
            className={`latest-notif__state-pill${activeStateId === 'all' ? ' latest-notif__state-pill--active' : ''}`}
            onClick={() => onSelect(activeStateId === 'all' ? null : 'all')}
          >
            {t('common.allIndia', { defaultValue: 'All India' })}
            <span className="latest-notif__state-pill-count">({stateCounts.all})</span>
          </button>
        ) : null}
        {LATEST_NOTIF_STATE_CHIPS.map((st) => {
          const cnt = stateCounts[st.id] ?? 0
          const active = activeStateId === st.id
          return (
            <button
              key={st.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={st.n}
              className={`latest-notif__state-pill${active ? ' latest-notif__state-pill--active' : ''}${cnt === 0 ? ' latest-notif__state-pill--empty' : ''}`}
              onClick={() => onSelect(active ? null : st.id)}
            >
              {st.ab}
              <span className="latest-notif__state-pill-count">({cnt})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
