import { Link } from 'react-router-dom';
import { BROWSE_STATES } from '@/data/states';

export default function IndiaGlancePanel() {
  return <aside className="india-glance" aria-label="India directory">
    <h2 className="india-glance__title">Explore India</h2>
    <p>Browse all {BROWSE_STATES.length} States and Union Territories. District records come from the official Local Government Directory; category coverage depends on verified data.</p>
    <Link to="/india">Browse the verified district directory →</Link>
    <p><a href="https://lgdirectory.gov.in/" target="_blank" rel="noopener noreferrer">Official LGD source</a></p>
  </aside>;
}
