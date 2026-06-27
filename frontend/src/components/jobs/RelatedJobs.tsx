import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CATS } from "@/data/categories";
import { DS } from "@/theme/designSystem";
import { boardExamLinksForJob } from "@/utils/jobBoardExamLinks";
import type { JobRecord } from "@/types/job";

type RelatedJobsProps = {
  jobs: JobRecord[];
  onSelect: (job: JobRecord) => void;
  /** Current job — used for board-scoped admit / results cross-links (Week 6). */
  sourceJob?: JobRecord | null;
};

export default function RelatedJobs({ jobs, onSelect, sourceJob = null }: RelatedJobsProps) {
  const { t } = useTranslation();
  const boardLinks = sourceJob ? boardExamLinksForJob(sourceJob) : [];

  if (!jobs.length && !boardLinks.length) return null;

  return (
    <section className="job-detail-section job-detail-related" aria-label={t("jobDetail.relatedJobs")}>
      {boardLinks.length > 0 ? (
        <nav
          className="job-detail-board-links job-detail-board-links--related"
          aria-label={t("jobDetail.boardExamLinksAria", { defaultValue: "Exam updates for this board" })}
        >
          <ul className="job-detail-board-links__list">
            {boardLinks.map((link) => (
              <li key={link.kind}>
                <Link to={link.href} className="job-detail-board-links__item">
                  {link.kind === "admit"
                    ? t("jobDetail.checkAdmitCards", {
                        board: link.boardLabel,
                        defaultValue: "Check admit cards for {{board}}",
                      })
                    : t("jobDetail.checkResults", {
                        board: link.boardLabel,
                        defaultValue: "Check results for {{board}}",
                      })}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {jobs.length > 0 ? (
        <>
          <h3 className="job-detail-section-title">{t("jobDetail.relatedJobs")}</h3>
          <p className="job-detail-related-hint">{t("jobDetail.relatedJobsHint")}</p>
          <ul className="job-detail-related-list">
            {jobs.map((job) => {
              const cat = CATS.find((c) => c.id === job.category);
              const vac = Number(job.vacancies) || 0;
              return (
                <li key={job.slug || job.id}>
                  <button
                    type="button"
                    className="job-detail-related-item"
                    onClick={() => onSelect(job)}
                  >
                    <span className="job-detail-related-title">{job.title}</span>
                    <span className="job-detail-related-meta">
                      {job.dept ? <span>{job.dept}</span> : null}
                      {vac > 0 ? (
                        <span>
                          {vac.toLocaleString()} {t("job.posts")}
                        </span>
                      ) : null}
                      {job.lastDate || job.last_date ? (
                        <span>
                          {t("jobDetail.lastDate")} {job.lastDate || job.last_date}
                        </span>
                      ) : null}
                      {cat ? (
                        <span className="job-detail-related-cat" style={{ color: cat.color || DS.saffron }}>
                          {t(`category.${cat.id}`)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}
