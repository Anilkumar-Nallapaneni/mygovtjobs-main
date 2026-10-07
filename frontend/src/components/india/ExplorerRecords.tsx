import { Link } from 'react-router-dom';
import type { IndiaRecord } from '@/lib/indiaApi';
import { jobDetailPath } from '@/utils/jobRoutes';

function safeLink(value?: string | null) {
  try { const url = new URL(value || ''); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

export default function ExplorerRecords({ items, loading, error, message }: {
  items?: IndiaRecord[]; loading: boolean; error?: string | null; message?: string;
}) {
  if (loading) return <p role="status">Loading verified records…</p>;
  if (error) return <p role="alert">{error}. Please try again later.</p>;
  if (!items?.length) return <p>{message || 'No verified records yet.'}</p>;
  return <>{items.map(item => {
    const content = <><strong>{item.name}</strong><small>{[item.city_name, item.district_name].filter(Boolean).join(' • ') || item.category}</small></>;
    const detail = item.category === 'jobs' && item.job_slug ? jobDetailPath({ slug: item.job_slug, id: item.id }) : null;
    const href = safeLink(item.website) || safeLink(item.source_url);
    return detail ? <Link key={item.id} to={detail}>{content}</Link>
      : href ? <a key={item.id} href={href} target="_blank" rel="noopener noreferrer">{content}</a>
        : <div key={item.id}>{content}</div>;
  })}</>;
}
