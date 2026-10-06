import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import ExplorerCategoryCard from '@/components/india/ExplorerCategoryCard';
import { EXPLORER_CATEGORIES } from '@/data/india/indiaExplorer';
import { useIndiaDistrict, useIndiaDistrictCategory, useIndiaDistrictCities, useIndiaState } from '@/hooks/useIndiaExplorer';
import '@/styles/india-explorer.css';
import { beginSeoHead } from '@/utils/seoHead';

export default function DistrictExplorerPage() {
  const { stateId = '', districtId = '', category: categoryId = '' } = useParams();
  const { data: state } = useIndiaState(stateId);
  const { data: district, loading } = useIndiaDistrict(stateId, districtId);
  const { data: cities, loading: citiesLoading } = useIndiaDistrictCities(stateId, districtId);
  const selected = EXPLORER_CATEGORIES.find(c => c.id === categoryId);
  const { data: result, loading: categoryLoading } = useIndiaDistrictCategory(stateId, districtId, categoryId);
  useEffect(() => {
    if (!district) return;
    const seo = beginSeoHead();
    seo.setTitle(`${district.name} District — Jobs, Education, Hospitals, Hotels & More | Live Govt Jobs`);
    seo.upsertMeta('description', `Explore verified information for ${district.name} district: cities, jobs, education, healthcare, companies, tourism, hotels, transport and local records.`);
    seo.upsertLink('canonical', `${window.location.origin}/india/${encodeURIComponent(stateId)}/district/${encodeURIComponent(districtId)}`);
    seo.upsertJsonLd('district-explorer-schema', { '@context': 'https://schema.org', '@type': 'Place', name: district.name, containedInPlace: { '@type': 'AdministrativeArea', name: state?.name || district.state_name || 'India' }, url: `${window.location.origin}/india/${encodeURIComponent(stateId)}/district/${encodeURIComponent(districtId)}` });
    return seo.restore;
  }, [district, state?.name, stateId, districtId]);

  if (!loading && !district) return <main className="india-explorer india-explorer--empty"><h1>District not found</h1><Link to={`/india/${stateId}`}>Return to {state?.name || 'state'}</Link></main>;
  const name = district?.name || 'District';
  return <main className="india-explorer">
    <section className="state-explorer__header"><div><Link to={`/india/${stateId}`} className="india-explorer__back">← {state?.name || 'State'}</Link><span className="india-explorer__eyebrow">DISTRICT EXPLORER</span><h1>{name}</h1><p>{state?.name || district?.state_name || 'India'} • Verified local directory</p></div><div className="state-explorer__badge"><strong>{district?.city_count ?? 0}</strong><span>Verified cities</span></div></section>
    <section className="state-explorer__facts"><h2>{name} profile</h2><div className="state-explorer__fact-grid"><div><span>State / UT</span><strong>{state?.name || district?.state_name || '—'}</strong></div><div><span>Cities</span><strong>{cities?.length ?? district?.city_count ?? 0}</strong></div><div><span>Verified places</span><strong>{district?.place_count ?? 0}</strong></div><div><span>Source</span><strong>Official/source-attributed records</strong></div></div></section>
    <section><div className="india-explorer__section-head"><div><h2>Cities & localities</h2><p>Only verified records are shown.</p></div></div><div className="state-explorer__district-grid">{citiesLoading && <div className="india-explorer__loading">Loading verified cities…</div>}{!citiesLoading && cities?.length === 0 && <div className="india-explorer__empty-card">No verified city records yet.</div>}{cities?.map(c => <div key={c.id} className="state-explorer__district-card"><strong>{c.name}</strong><span>Verified city</span></div>)}</div></section>
    {selected && <section className="state-explorer__spotlight"><div className="state-explorer__spotlight-copy"><span className="india-explorer__eyebrow">DISTRICT CATEGORY</span><h2>{selected.icon} {selected.title} in {name}</h2><p>{selected.description}</p></div><div className="state-explorer__spotlight-list">{categoryLoading && <span>Loading verified records…</span>}{!categoryLoading && result?.items?.length ? result.items.slice(0, 30).map(item => <a key={item.id} href={item.website || item.source_url || '#'} target={item.website || item.source_url ? '_blank' : undefined} rel="noreferrer"><strong>{item.name}</strong><small>{[item.city_name, item.district_name].filter(Boolean).join(' • ') || item.category}</small></a>) : !categoryLoading && <span>No verified records yet.</span>}</div></section>}
    <section><div className="india-explorer__section-head"><div><h2>Everything in {name}</h2><p>Schools, colleges, universities, jobs, agriculture, companies, industries, tourism, temples, hotels, hospitals and transport.</p></div></div><div className="india-explorer__category-grid india-explorer__category-grid--cards">{EXPLORER_CATEGORIES.map(c => <ExplorerCategoryCard key={c.id} category={c} stateId={stateId} districtId={districtId} />)}</div></section>
  </main>;
}
