import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ExplorerRecords from '@/components/india/ExplorerRecords';
import { IndiaMap } from '@/components/Maps/IndiaMap/IndiaMap';
import { getExplorerState, EXPLORER_CATEGORIES } from '@/data/india/indiaExplorer';
import { toSvgStateId } from '@/data/states';
import ExplorerCategoryCard from '@/components/india/ExplorerCategoryCard';
import { useIndiaCategory, useIndiaDistricts, useIndiaState } from '@/hooks/useIndiaExplorer';
import '@/styles/india-explorer.css';
import { beginSeoHead } from '@/utils/seoHead';

export default function StateExplorerPage() {
  const { stateId: routeStateId = '', category: categoryId = '' } = useParams();
  const localState = getExplorerState(routeStateId);
  const stateId = localState?.id || routeStateId;
  const { data: apiState, loading: stateLoading, error: stateError } = useIndiaState(stateId);
  const [districtQuery, setDistrictQuery] = useState('');
  const { data: districts, loading: districtsLoading, error: districtsError } = useIndiaDistricts(stateId);
  const selectedCategory = EXPLORER_CATEGORIES.find(c => c.id === categoryId);
  const { data: categoryResult, loading: categoryLoading, error: categoryError } = useIndiaCategory(stateId, selectedCategory ? categoryId : '');
  useEffect(() => {
    const label = apiState?.name || localState?.n || stateId;
    const seo = beginSeoHead();
    seo.setTitle(`${selectedCategory ? `${selectedCategory.title} in ` : ''}${label} Explorer | Live Govt Jobs`);
    seo.upsertMeta('description', `Explore verified ${label} districts, cities, jobs, education, healthcare, companies, tourism, hotels, transport and government information.`);
    seo.upsertLink('canonical', `${window.location.origin}/india/${encodeURIComponent(stateId)}${selectedCategory ? `/${selectedCategory.id}` : ''}`);
    seo.upsertMeta('robots', (!localState && !apiState) || (categoryId && (!selectedCategory || !categoryResult?.items.length)) ? 'noindex,follow' : 'index,follow');
    return seo.restore;
  }, [apiState, localState, stateId, selectedCategory, categoryId, categoryResult]);

  if (!localState && !apiState) return <div className="india-explorer india-explorer--empty"><h1>State not found</h1><Link to="/india">Return to India Map</Link></div>;
  const name = apiState?.name || localState?.n || stateId;
  const abbreviation = apiState?.abbreviation || localState?.ab || '';
  return (
    <div className="india-explorer">
      <nav aria-label="Breadcrumb"><Link to="/india">India</Link> / <Link to={`/india/${stateId}`}>{name}</Link>{selectedCategory && <> / {selectedCategory.title}</>}</nav>
      {stateError && <p role="alert">{stateError}. Verified counts are unavailable.</p>}
      <section className="state-explorer__header">
        <div><Link to="/india" className="india-explorer__back">← India Map</Link><span className="india-explorer__eyebrow">STATE / UNION TERRITORY</span><h1>{name}</h1><p>{apiState?.administrative_type === 'union_territory' ? 'Union Territory' : 'State'} • {apiState?.region || localState?.reg || 'India'}</p></div>
        <div className="state-explorer__badge"><strong>{abbreviation}</strong><span>{stateLoading ? 'Loading verified profile…' : apiState ? (apiState.capital || 'Verified district directory') : 'Profile unavailable'}</span></div>
      </section>

      <section className="state-explorer__overview">
        <div className="state-explorer__map"><IndiaMap isolateStateId={toSvgStateId(stateId)} mapStyle={{ stroke: 'transparent', strokeWidth: 0, hoverColor: '#dbe4ef', backgroundColor: '#f4f7fb' }} /></div>
        <div className="state-explorer__facts"><h2>{name} at a glance</h2><div className="state-explorer__fact-grid"><div><span>Capital</span><strong>{apiState?.capital || 'Not yet verified'}</strong></div><div><span>Region</span><strong>{apiState?.region || 'Not yet verified'}</strong></div><div><span>Verified districts</span><strong>{stateLoading ? 'Loading…' : apiState?.counts.districts ?? 'Unavailable'}</strong></div>{!!apiState?.counts.cities && <div><span>Verified cities</span><strong>{apiState.counts.cities}</strong></div>}<div><span>Live jobs</span><strong>{stateLoading ? 'Loading…' : apiState?.counts.jobs ?? apiState?.job_count ?? 'Unavailable'}</strong></div><div><span>Verified directory records</span><strong>{stateLoading ? 'Loading…' : apiState?.counts.places ?? 'Unavailable'}</strong></div></div></div>
      </section>

      <section className="state-explorer__districts">
        <div className="india-explorer__section-head"><div><h2>Districts in {name}</h2><p>District browsing does not depend on jobs. Open any verified district for its schools, colleges, jobs, companies, hospitals, hotels, transport and other records.</p></div><strong>{districts?.length ?? 0}</strong></div>
        <label className="india-explorer__search india-explorer__search--compact"><input aria-label="Search districts" placeholder="Search districts" value={districtQuery} onChange={e => setDistrictQuery(e.target.value)} /></label><div className="state-explorer__district-grid">
          {districts && districts.length > 0 && !districts.some(d => d.name.toLowerCase().includes(districtQuery.trim().toLowerCase())) && <p role="status">No verified districts match your search.</p>}{districtsLoading && <div className="india-explorer__loading">Loading verified districts…</div>}
          {!districtsLoading && districtsError && <div className="india-explorer__status india-explorer__status--error"><strong>District service unavailable</strong><span>{districtsError}. The site will not substitute unverified district names.</span></div>}
          {!districtsLoading && !districtsError && districts?.length === 0 && <div className="india-explorer__status india-explorer__status--warning"><strong>Verified district data is not loaded for {name}</strong><span>This page intentionally stays empty until the official LGD district dataset is imported and verified.</span></div>}
          {districts?.filter(d => d.name.toLowerCase().includes(districtQuery.trim().toLowerCase())).map(d => <Link key={d.id} to={`/india/${stateId}/district/${d.id}`} className="state-explorer__district-card"><strong>{d.name}</strong><span>Open district →</span></Link>)}
        </div>
      </section>

      {selectedCategory && <section className="state-explorer__spotlight"><div className="state-explorer__spotlight-copy"><span className="india-explorer__eyebrow">VERIFIED DIRECTORY</span><h2>{selectedCategory.icon} {selectedCategory.title} in {name}</h2><p>{selectedCategory.description}</p></div><div className="state-explorer__spotlight-list"><ExplorerRecords items={categoryResult?.items} loading={categoryLoading} error={categoryError} message={categoryResult?.message} /></div></section>}

      <section><div className="india-explorer__section-head"><div><h2>Everything in {name}</h2><p>Category coverage varies. Only verified records are shown.</p></div></div><div className="india-explorer__category-grid india-explorer__category-grid--cards">{EXPLORER_CATEGORIES.map(category => <ExplorerCategoryCard key={category.id} category={category} stateId={stateId} />)}</div></section>
    </div>
  );
}
