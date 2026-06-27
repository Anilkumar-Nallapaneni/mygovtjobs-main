import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { fetchJobBySlug } from "@/lib/jobsApi";
import { adaptLiveJob } from "@/utils/liveJobAdapter";
import { applyJobSeo } from "@/utils/jobSeo";
import { pickRelatedJobs } from "@/utils/relatedJobs";
import { jobDetailPath } from "@/utils/jobRoutes";
import { useNow } from "@/hooks/useNow";
import PageFallback from "@/components/PageFallback";
import type { JobRecord } from "@/types/job";

const JobDetail = lazy(() => import("@/components/jobs/JobDetail"));

function hasFullDetail(job: JobRecord | null): boolean {
  const detail = job?.detail;
  if (!detail || typeof detail !== "object") return false;
  const d = detail as Record<string, unknown>;
  const sections = d.content_sections;
  if (Array.isArray(sections) && sections.length > 0) return true;
  const summary = String(d.summary || "").trim();
  if (summary.length < 40) return false;
  const source = String(d.detail_source || "").toLowerCase();
  return source === "notification" || source === "pdf" || Boolean(d.memorized_at);
}

/** Prevent showing a fetched job when the URL slug has already changed. */
function jobMatchesSlug(job: JobRecord | null | undefined, slug: string): boolean {
  if (!job || !slug) return false;
  return job.slug === slug || job.id === slug;
}

function needsAuthoritativeDetail(listJob: JobRecord | null): boolean {
  return Boolean(listJob && !hasFullDetail(listJob));
}

type JobDetailPageProps = {
  jobs: JobRecord[];
  loading: boolean;
};

export default function JobDetailPage({ jobs, loading }: JobDetailPageProps) {
  const { slug: slugParam } = useParams();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const now = useNow();
  const [resolvedJob, setResolvedJob] = useState<JobRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const slug = slugParam ? decodeURIComponent(slugParam) : "";

  const listJob = useMemo(() => {
    if (!slug) return null;
    return jobs.find((row) => row.slug === slug || row.id === slug) || null;
  }, [jobs, slug]);

  const job = useMemo(() => {
    if (resolvedJob && jobMatchesSlug(resolvedJob, slug)) return resolvedJob;
    if (detailLoading) return null;
    return listJob;
  }, [resolvedJob, listJob, slug, detailLoading]);

  const relatedJobs = useMemo(() => {
    const anchor = job || listJob;
    if (!anchor) return [];
    return pickRelatedJobs(anchor, jobs, { nowMs: now });
  }, [job, listJob, jobs, now]);

  useEffect(() => {
    setResolvedJob(null);
    if (!slug) {
      setDetailLoading(false);
      return;
    }
    setDetailLoading(needsAuthoritativeDetail(listJob));
  }, [slug, listJob]);

  useEffect(() => {
    if (!slug) return;
    if (listJob && hasFullDetail(listJob)) return;

    let cancelled = false;
    setDetailLoading(true);
    fetchJobBySlug(slug)
      .then((row) => {
        if (cancelled || !row) return;
        if (row.slug !== slug && row.id !== slug) return;
        setResolvedJob(adaptLiveJob(row, 0));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, listJob]);

  useEffect(() => {
    if (!job?.title) return;
    return applyJobSeo(job);
  }, [job]);

  if (loading || detailLoading || !job) {
    if (!loading && !detailLoading && !job) {
      return (
        <div className="page-fallback">
          <p>{t("jobDetail.notFound", { defaultValue: "Job not found or no longer listed." })}</p>
          <button type="button" className="job-detail-back-btn" onClick={() => navigate("/")}>
            {t("jobDetail.back")}
          </button>
        </div>
      );
    }
    return <PageFallback />;
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <JobDetail
        key={`${slug}-${job.id}-${i18n.language}`}
        job={job}
        relatedJobs={relatedJobs}
        onRelatedJobClick={(row) => {
          const path = jobDetailPath(row);
          if (path) navigate(path);
        }}
        onClose={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate("/");
        }}
      />
    </Suspense>
  );
}
