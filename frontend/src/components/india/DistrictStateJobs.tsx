import { Link } from "react-router-dom";
import { useLiveJobs } from "@/hooks/useLiveJobs";
import { jobDetailPath } from "@/utils/jobRoutes";
import { resolveStateCodes } from "@/utils/jobStateResolve";
import type { JobRecord } from "@/types/job";

function mentionsDistrict(job: JobRecord, districtName: string) {
  const needle = districtName.trim().toLowerCase();
  if (needle.length < 3) return false;
  return `${job.title || ""} ${job.dept || ""}`.toLowerCase().includes(needle);
}

/** Public catalog jobs for this state when the district has no verified cities. */
export default function DistrictStateJobs({
  stateId,
  stateName,
  districtName,
}: {
  stateId: string;
  stateName: string;
  districtName: string;
}) {
  const { jobs, loading } = useLiveJobs();
  const stateJobs = jobs.filter((job) => resolveStateCodes(job).includes(stateId));
  const named = stateJobs.filter((job) => mentionsDistrict(job, districtName));
  const shown = named.length > 0 ? named : stateJobs;
  const heading = named.length > 0 ? `Jobs that name ${districtName}` : `Jobs in ${stateName}`;

  return (
    <section>
      <div className="india-explorer__section-head">
        <div>
          <h2>{heading}</h2>
          <p>
            Verified city records are not loaded for {districtName}. These are the current public
            jobs for {stateName}.
          </p>
        </div>
      </div>
      {loading && <div className="india-explorer__loading">Loading public jobs…</div>}
      {!loading && shown.length === 0 && (
        <div className="india-explorer__empty-card">No current public jobs for {stateName}.</div>
      )}
      {!loading && shown.length > 0 && (
        <div className="state-explorer__district-grid">
          {shown.slice(0, 12).map((job) => {
            const path = jobDetailPath(job);
            const title = job.title || "Government job";
            if (!path) return null;
            return (
              <Link key={path} to={path} className="state-explorer__district-card">
                <strong>{title}</strong>
                <span>{job.dept || stateName}</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
