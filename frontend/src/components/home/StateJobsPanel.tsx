import { useTranslation } from "react-i18next";
import JobCard from "@/components/jobs/JobCard";
import JobCardGrid from "@/components/jobs/JobCardGrid";
import { VIRTUAL_GRID_MIN } from "@/data/homePageConstants";
import { formatDistrictName } from "@/data/stateDistricts";
import type { JobRecord } from "@/types/job";

function jobMentionsDistrict(job: JobRecord, district: string): boolean {
  const needle = district.replace(/\s+/g, " ").trim();
  if (needle.length < 3) return false;
  const extra = job as JobRecord & { location?: string; city?: string; district?: string };
  const hay = [job.title, job.post_name, job.dept, job.about, job.detail?.summary, extra.location, extra.city, extra.district]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
  const pattern = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|[^A-Za-z])${pattern}(?=$|[^A-Za-z])`, "i").test(hay);
}

type StateJobsPanelProps = {
  stateName: string;
  districtName?: string | null;
  stateJobs: Parameters<typeof JobCard>[0]["job"][];
  nationwideJobs: Parameters<typeof JobCard>[0]["job"][];
  sort: string;
  onSortChange: (sort: string) => void;
  onJobClick: (job: Parameters<typeof JobCard>[0]["job"]) => void;
  onEducationClick?: (eduKey: string) => void;
  onStateClick?: (stateId: string | null) => void;
};

function JobGridBlock({
  jobs,
  onJobClick,
  jobCardFilterProps,
}: {
  jobs: StateJobsPanelProps["stateJobs"];
  onJobClick: StateJobsPanelProps["onJobClick"];
  jobCardFilterProps: Record<string, unknown>;
}) {
  if (jobs.length >= VIRTUAL_GRID_MIN) {
    return <JobCardGrid jobs={jobs} onJobClick={onJobClick} jobCardFilterProps={jobCardFilterProps} animateList />;
  }
  return (
    <div className="home-jobs-grid home-jobs-grid--scroll state-jobs-panel__grid">
      {jobs.map((job, index) => (
        <JobCard key={job.id} job={job} onClick={() => onJobClick(job)} enterIndex={index} {...jobCardFilterProps} />
      ))}
    </div>
  );
}

export default function StateJobsPanel({
  stateName,
  districtName = null,
  stateJobs,
  nationwideJobs,
  sort,
  onSortChange,
  onJobClick,
  onEducationClick,
  onStateClick,
}: StateJobsPanelProps) {
  const { t } = useTranslation();
  const districtJobs = districtName ? stateJobs.filter((job) => jobMentionsDistrict(job, districtName)) : [];
  const otherStateJobs = districtName ? stateJobs.filter((job) => !jobMentionsDistrict(job, districtName)) : stateJobs;
  const primaryJobs = districtName && districtJobs.length > 0 ? districtJobs : otherStateJobs;
  const extraStateJobs = districtName && districtJobs.length > 0 ? otherStateJobs : [];
  const placeName = districtName ? formatDistrictName(districtName) : stateName;
  const stateVac = primaryJobs.reduce((s, j) => s + (Number(j.vacancies) || 0), 0);
  const nwVac = nationwideJobs.reduce((s, j) => s + (Number(j.vacancies) || 0), 0);
  const jobCardFilterProps = { onEducationClick, onStateClick };

  return (
    <section className="state-jobs-panel" aria-label={t("home.jobsInState", { state: placeName })}>
      <header className="state-jobs-panel__header">
        <div>
          <h2 className="state-jobs-panel__title">{t("home.jobsInState", { state: placeName })}</h2>
          <p className="state-jobs-panel__meta">
            {districtName && districtJobs.length === 0
              ? `No notice names ${formatDistrictName(districtName)} yet. Showing ${stateName} jobs you can still apply for.`
              : primaryJobs.length > 0
              ? t("home.stateJobsCount", {
                  count: primaryJobs.length,
                  vacancies: stateVac.toLocaleString("en-IN"),
                  defaultValue: "{{count}} state listings · {{vacancies}} vacancies",
                })
              : t("home.noStateListingsShort", { defaultValue: "No state-specific listings yet" })}
            {nationwideJobs.length > 0 &&
              ` · ${t("home.nationwideCount", {
                count: nationwideJobs.length,
                defaultValue: "{{count}} all-India",
              })}`}
          </p>
        </div>
        <div className="state-jobs-panel__sort">
          <span>{t("home.sort")}</span>
          {["lastDate", "vacancies"].map((s) => (
            <button
              key={s}
              type="button"
              className={`state-jobs-panel__sort-btn${sort === s ? " is-active" : ""}`}
              onClick={() => onSortChange(s)}
            >
              {s === "lastDate" ? t("home.deadline") : t("home.vacancies")}
            </button>
          ))}
        </div>
      </header>

      <div
        key={`${placeName}-${sort}-${primaryJobs.length}`}
        className="state-jobs-panel__body home-jobs-section__panel home-jobs-section__panel--animate"
      >
        {primaryJobs.length === 0 ? (
          <div className="state-jobs-panel__empty">
            <div className="state-jobs-panel__empty-icon">📋</div>
            <p>{t("home.noStateListings")}</p>
            {nationwideJobs.length > 0 && (
              <p className="state-jobs-panel__empty-hint">{t("home.seeNationwideBelow")}</p>
            )}
          </div>
        ) : (
          <JobGridBlock
            jobs={primaryJobs}
            onJobClick={onJobClick}
            jobCardFilterProps={jobCardFilterProps}
          />
        )}

        {extraStateJobs.length > 0 && (
          <div className="state-jobs-panel__nationwide">
            <h3 className="state-jobs-panel__section-label">Other jobs in {stateName}</h3>
            <JobGridBlock
              jobs={extraStateJobs}
              onJobClick={onJobClick}
              jobCardFilterProps={jobCardFilterProps}
            />
          </div>
        )}

        {nationwideJobs.length > 0 && (
          <div className="state-jobs-panel__nationwide">
            <h3 className="state-jobs-panel__section-label">{t("home.nationwideSection")}</h3>
            <p className="state-jobs-panel__section-meta">
              {t("home.nationwideMeta", {
                count: nationwideJobs.length,
                vacancies: nwVac.toLocaleString("en-IN"),
                defaultValue: "{{count}} central notifications · {{vacancies}} vacancies",
              })}
            </p>
            <JobGridBlock
              jobs={nationwideJobs}
              onJobClick={onJobClick}
              jobCardFilterProps={jobCardFilterProps}
            />
          </div>
        )}
      </div>
    </section>
  );
}
