import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { useIndiaState } from "@/hooks/useIndiaExplorer";

type StateGlancePanelProps = {
  stateId: string;
  stateName: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
};

const StateGlancePanel = forwardRef<HTMLElement, StateGlancePanelProps>(function StateGlancePanel(
  { stateId, stateName, t }, ref
) {
  const { data, loading, error } = useIndiaState(stateId);
  return <aside ref={ref} className="state-glance india-glance" aria-label={t("home.stateGlance.aria", { state: stateName, defaultValue: "{{state}} at a glance" })}>
    <h2 className="india-glance__title">{stateName} directory</h2>
    {loading ? <p>Loading verified directory counts…</p> : error ? <p role="status">Verified directory counts are unavailable.</p> : data ? <dl className="india-glance__grid">
      <div className="india-glance__item"><dt>Verified districts</dt><dd>{data.counts.districts}</dd></div>
      <div className="india-glance__item"><dt>Verified cities</dt><dd>{data.counts.cities}</dd></div>
      <div className="india-glance__item"><dt>Verified places</dt><dd>{data.counts.places}</dd></div>
    </dl> : null}
    <p><Link to={`/india/${stateId}`}>Browse the state directory →</Link></p>
    <p>District identity comes from the <a href="https://lgdirectory.gov.in/" target="_blank" rel="noopener noreferrer">official Local Government Directory</a>. Local coverage depends on verified records.</p>
  </aside>;
});
StateGlancePanel.displayName = "StateGlancePanel";
export default StateGlancePanel;
