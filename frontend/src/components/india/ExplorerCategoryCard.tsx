import { Link } from 'react-router-dom';
import type { ExplorerCategory } from '@/data/india/indiaExplorer';

type Props = { category: ExplorerCategory; stateId?: string; districtId?: string };

export default function ExplorerCategoryCard({ category, stateId, districtId }: Props) {
  const target = districtId && stateId ? `/india/${stateId}/district/${districtId}/${category.id}` : stateId ? `/india/${stateId}/${category.id}` : category.route ?? `/india?layer=${category.id}`;
  return (
    <Link to={target} className="india-explorer-card" aria-label={`Explore ${category.title}`}>
      <span className="india-explorer-card__icon" aria-hidden="true">{category.icon}</span>
      <span className="india-explorer-card__body">
        <strong>{category.title}</strong>
        <span>{category.description}</span>
      </span>
      <span className="india-explorer-card__arrow" aria-hidden="true">→</span>
    </Link>
  );
}
