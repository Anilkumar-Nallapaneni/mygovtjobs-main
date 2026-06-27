import type { JobRecord } from "@/types/job";

/** Shareable job detail path, e.g. /jobs/ssc-cgl-2026-apply-online-abc123 */
export function jobDetailPath(job: Pick<JobRecord, "slug" | "id"> | null | undefined): string | null {
  const slug = job?.slug || job?.id;
  if (!slug) return null;
  return `/jobs/${encodeURIComponent(String(slug))}`;
}

export function jobDetailUrl(job: Pick<JobRecord, "slug" | "id"> | null | undefined): string | null {
  const path = jobDetailPath(job);
  if (!path) return null;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}
