import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { IndiaMap } from '@/components/Maps/IndiaMap/IndiaMap';
import { getExplorerState, EXPLORER_CATEGORIES } from '@/data/india/indiaExplorer';
import { toSvgStateId } from '@/data/states';
import ExplorerCategoryCard from '@/components/india/ExplorerCategoryCard';
import { useIndiaCategory, useIndiaDistricts, useIndiaState } from '@/hooks/useIndiaExplorer';
import '@/styles/india-explorer.css';
import { beginSeoHead } from '@/utils/seoHead';

export default function StateExplorerPage() {
  const { stateId = '', category: categoryId = '' } = useParams();
  const localState = getExplorerState(stateId);
  const { data: apiState, loading: stateLoading } = useIndiaState(stateId);
  const { data: districts, loading: districtsLoading } = useIndiaDistricts(stateId);
  const selectedCategory = EXPLORER_CATEGORIES.find(c => c.id === categoryId);
  const { data: categoryResult, loading: categoryLoading } = useIndiaCategory(stateId, categoryId);
  useEffect(() => {
    const label = apiState?.name || localState?.n || stateId;
    const seo = beginSeoHead();
    seo.setTitle(`${label} Explorer — Districts, Jobs, Education & Local Information | Live Govt Jobs`);
    seo.upsertMeta('description', `Explore verified ${label} districts, cities, jobs, education, healthcare, companies, tourism, hotels, transport and government information.`);
    seo.upsertLink('canonical', `${window.location.origin}/india/${encodeURIComponent(stateId)}`);
    return seo.restore;
  }, [apiState?.name, localState?.n, stateId]);

  if (!localState && !apiState) return <main className="india-explorer india-explorer--empty"><h1>State not found</h1><Link to="/india">Return to India Map</Link></main>;
  const name = apiState?.name || localState?.n || stateId;
  const abbreviation = apiState?.abbreviation || localState?.ab || '';
  return (
    <main className="india-explorer">
      <section className="state-explorer__header">
        <div><Link to="/india" className="india-explorer__back">← India Map</Link><span className="india-explorer__eyebrow">STATE / UNION TERRITORY</span><h1>{name}</h1><p>{apiState?.administrative_type === 'union_territory' ? 'Union Territory' : 'State'} • {apiState?.region || localState?.reg || 'India'}</p></div>
        <div className="state-explorer__badge"><strong>{abbreviation}</strong><span>{stateLoading ? 'Loading verified profile…' : apiState?.capital || 'Verified profile'}</span></div>
      </section>

      <section className="state-explorer__overview">
        <div className="state-explorer__map"><IndiaMap isolateStateId={toSvgStateId(stateId)} mapStyle={{ stroke: 'transparent', strokeWidth: 0, hoverColor: '#dbe4ef', backgroundColor: '#f4f7fb' }} /></div>
        <div className="state-explorer__facts"><h2>{name} at a glance</h2><div className="state-explorer__fact-grid"><div><span>Capital</span><strong>{apiState?.capital || 'Not yet verified'}</strong></div><div><span>Region</span><strong>{apiState?.region || 'Not yet verified'}</strong></div><div><span>Verified districts</span><strong>{stateLoading ? 'Loading…' : apiState?.counts.districts ?? 0}</strong></div><div><span>Verified cities</span><strong>{stateLoading ? 'Loading…' : apiState?.counts.cities ?? 0}</strong></div><div><span>Live jobs</span><strong>{stateLoading ? 'Loading…' : apiState?.counts.jobs ?? apiState?.job_count ?? 0}</strong></div><div><span>Verified directory records</span><strong>{stateLoading ? 'Loading…' : apiState?.counts.places ?? 0}</strong></div></div></div>
      </section>

      <section className="state-explorer__districts">
        <div className="india-explorer__section-head"><div><h2>Districts in {name}</h2><p>District browsing does not depend on jobs. Open any verified district for its schools, colleges, jobs, companies, hospitals, hotels, transport and other records.</p></div><strong>{districts?.length ?? 0}</strong></div>
        <div className="state-explorer__district-grid">
          {districtsLoading && <div className="india-explorer__loading">Loading verified districts…</div>}
          {!districtsLoading && districts?.length === 0 && <div className="india-explorer__empty-card">No verified district records have been imported yet. Import LGD data before publishing this area.</div>}
          {districts?.map(d => <Link key={d.id} to={`/india/${stateId}/district/${d.id}`} className="state-explorer__district-card"><strong>{d.name}</strong><span>Open district →</span></Link>)}
        </div>
      </section>

      {selectedCategory && <section className="state-explorer__spotlight"><div className="state-explorer__spotlight-copy"><span className="india-explorer__eyebrow">VERIFIED DIRECTORY</span><h2>{selectedCategory.icon} {selectedCategory.title} in {name}</h2><p>{selectedCategory.description}</p></div><div className="state-explorer__spotlight-list">{categoryLoading && <span>Loading verified records…</span>}{!categoryLoading && categoryResult?.items?.length ? categoryResult.items.slice(0, 12).map(item => <a key={item.id} href={item.website || item.source_url || '#'} target={item.website || item.source_url ? '_blank' : undefined} rel="noreferrer"><strong>{item.name}</strong><small>{[item.city_name, item.district_name].filter(Boolean).join(' • ') || item.category}</small></a>) : !categoryLoading && <span>No verified records yet.</span>}</div></section>}

      <section><div className="india-explorer__section-head"><div><h2>Everything in {name}</h2><p>Every category uses the same state → district → city hierarchy.</p></div></div><div className="india-explorer__category-grid india-explorer__category-grid--cards">{EXPLORER_CATEGORIES.map(category => <ExplorerCategoryCard key={category.id} category={category} stateId={stateId} />)}</div></section>
    </main>
  );
}
