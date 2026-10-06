import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IndiaMap } from '@/components/Maps/IndiaMap/IndiaMap';
import { BROWSE_STATES, toSvgStateId } from '@/data/states';
import { EXPLORER_CATEGORIES, EXPLORER_STATE_IDS } from '@/data/india/indiaExplorer';
import { useIndiaDistrictDirectory, useIndiaOverview, useIndiaStates } from '@/hooks/useIndiaExplorer';
import ExplorerCategoryCard from '@/components/india/ExplorerCategoryCard';
import '@/styles/india-explorer.css';
import { beginSeoHead } from '@/utils/seoHead';

export default function IndiaExplorerPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [districtQuery, setDistrictQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeLayer, setActiveLayer] = useState(searchParams.get('layer') || '');
  const { data: apiOverview } = useIndiaOverview();
  const { data: apiStates, loading: statesLoading } = useIndiaStates();
  const { data: districtDirectory, loading: districtsLoading } = useIndiaDistrictDirectory({ q: districtQuery, limit: 72 });
  useEffect(() => {
    const seo = beginSeoHead();
    seo.setTitle('Explore India — States, Districts, Jobs & Local Information | Live Govt Jobs');
    seo.upsertMeta('description', 'Explore all 28 states and 8 Union Territories, verified districts, cities, jobs, education, healthcare, tourism, companies, hotels and transport.');
    seo.upsertLink('canonical', `${window.location.origin}/india`);
    seo.upsertJsonLd('india-explorer-schema', { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Explore India', url: `${window.location.origin}/india`, description: 'Location-first India directory for states, districts, cities and verified categories.' });
    return seo.restore;
  }, []);


  // The public directory always starts from the authoritative 36-unit master.
  // API data only enriches it with verified counts; it never removes a state because a feed is empty.
  const states = useMemo(() => {
    const verified = new Map((apiStates || []).map((state) => [state.id, state]));
    return BROWSE_STATES.filter((state) => EXPLORER_STATE_IDS.includes(state.id)).map((local) => {
      const remote = verified.get(local.id);
      return { ...local, n: remote?.name || local.n, ab: remote?.abbreviation || local.ab, reg: remote?.region || local.reg,
        district_count: remote?.district_count ?? 0, city_count: remote?.city_count ?? 0, place_count: remote?.place_count ?? 0, job_count: remote?.job_count ?? 0 };
    });
  }, [apiStates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? states.filter((state) => `${state.n} ${state.ab}`.toLowerCase().includes(q)) : states;
  }, [query, states]);

  const setLayer = (layer: string) => {
    const next = layer === activeLayer ? '' : layer;
    setActiveLayer(next);
    const params = new URLSearchParams(searchParams);
    if (next) params.set('layer', next); else params.delete('layer');
    setSearchParams(params, { replace: true });
  };

  const stateData = useMemo(() => states.map((state) => ({
    id: toSvgStateId(state.id),
    name: state.n,
    fill: '#e9eef5',
    customData: { name: state.n, jobCount: state.job_count, listings: `${state.district_count} districts` },
  })), [states]);

  return (
    <main className="india-explorer">
      <section className="india-explorer__hero">
        <div>
          <span className="india-explorer__eyebrow">ONE INDIA PLATFORM</span>
          <h1>Explore India beyond jobs</h1>
          <p>Start with any of India's 28 states or 8 Union Territories. Browse verified districts, cities and local information for education, jobs, healthcare, hotels, companies, tourism, transport and more.</p>
          <label className="india-explorer__search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a state or Union Territory" aria-label="Search state or Union Territory" /></label>
        </div>
        <div className="india-explorer__hero-stat"><strong>{apiOverview?.states ?? 36}</strong><span>Official States & Union Territories</span><small>Jobs are one category — directory coverage is independent.</small></div>
      </section>

      <section className="india-explorer__map-layout">
        <div className="india-explorer__map-card">
          <div className="india-explorer__section-head"><div><h2>India map</h2><p>Select a state or UT to open its full profile.</p></div><span className="india-explorer__live-dot">● Interactive</span></div>
          <IndiaMap stateData={stateData} mapStyle={{ stroke: '#94a3b8', strokeWidth: 1.2, hoverColor: '#cbd5e1', backgroundColor: '#eef2f7' }} onStateClick={(svgId) => { const id = BROWSE_STATES.find((state) => toSvgStateId(state.id) === svgId)?.id; if (id) navigate(`/india/${id}`); }} />
        </div>
        <aside className="india-explorer__state-list">
          <div className="india-explorer__section-head"><div><h2>All 36 States & UTs</h2><p>{filtered.length} shown · every unit remains visible without jobs</p></div></div>
          <div className="india-explorer__state-grid">
            {statesLoading && <div className="india-explorer__loading">Enriching state counts from verified data…</div>}
            {filtered.map((state) => <button key={state.id} type="button" onClick={() => navigate(`/india/${state.id}`)}><strong>{state.n}</strong><span>{state.ab}</span><small>{state.district_count || '—'} districts · {state.city_count || '—'} cities</small></button>)}
          </div>
        </aside>
      </section>

      <section className="india-explorer__directory-glance">
        <div className="india-explorer__section-head"><div><h2>Districts at a glance</h2><p>District browsing is independent of job availability. Only verified imported district records are displayed.</p></div><span className="india-explorer__verified-badge">✓ Source-attributed</span></div>
        <label className="india-explorer__search india-explorer__search--compact"><span aria-hidden="true">⌕</span><input value={districtQuery} onChange={(e) => setDistrictQuery(e.target.value)} placeholder="Search district or state" aria-label="Search district or state" /></label>
        <div className="india-explorer__district-glance-grid">
          {districtsLoading && <div className="india-explorer__loading">Loading verified districts…</div>}
          {!districtsLoading && districtDirectory?.items?.map((district) => <button key={district.id} type="button" onClick={() => navigate(`/india/${district.state_id}/district/${district.id}`)}><strong>{district.name}</strong><span>{district.state_name}</span><small>{district.city_count} cities · {district.place_count} places</small></button>)}
          {!districtsLoading && !districtDirectory?.items?.length && <div className="india-explorer__empty-card">No verified district records match this search yet. Import the current LGD district dataset to populate this directory.</div>}
        </div>
      </section>

      <section className="india-explorer__layers">
        <div className="india-explorer__section-head"><div><h2>Everything by location</h2><p>Each state and district can expose the same common categories. Empty categories are clearly labelled instead of filled with invented records.</p></div></div>
        <div className="india-explorer__category-grid">{EXPLORER_CATEGORIES.map((category) => <button key={category.id} type="button" className={activeLayer === category.id ? 'india-layer-filter india-layer-filter--active' : 'india-layer-filter'} onClick={() => setLayer(category.id)}>{category.icon} {category.title}</button>)}</div>
        <div className="india-explorer__category-grid india-explorer__category-grid--cards">{EXPLORER_CATEGORIES.filter((category) => !activeLayer || category.id === activeLayer).map((category) => <ExplorerCategoryCard key={category.id} category={category} />)}</div>
      </section>
    </main>
  );
}
