import { OFFICIAL_SITES } from "@/data/officialSites";
import { cleanDept } from "@/utils/jobNoiseFilter";
import type { JobRecord } from "@/types/job";

const SITE_BY_ID = new Map(OFFICIAL_SITES.map((s) => [s.id, s]));

const GENERIC_DEPT = /^(official notification|see notification|government recruitment)$/i;

const ORG_FACT_LABEL =
  /^(company name|organization name|organisation name|recruiting body|recruitment board|department|name of (?:the )?organization|issuing authority)$/i;

function detailBlob(job: JobRecord): Record<string, unknown> {
  const d = job.detail;
  return d && typeof d === "object" ? (d as Record<string, unknown>) : {};
}

function fromStructuredOverview(job: JobRecord): string {
  const sections = detailBlob(job).content_sections;
  if (!Array.isArray(sections)) return "";
  for (const section of sections) {
    if (!section || typeof section !== "object") continue;
    const tables = (section as { tables?: Record<string, string>[][] }).tables;
    if (!Array.isArray(tables)) continue;
    for (const table of tables) {
      if (!Array.isArray(table)) continue;
      for (const row of table) {
        if (!row || typeof row !== "object") continue;
        const label = String(row.label || row.Label || "").trim();
        const value = String(row.value || row.Value || "").trim();
        if (label && value && ORG_FACT_LABEL.test(label)) return value;
      }
    }
  }
  return "";
}

function isUsableDept(value: string): boolean {
  const s = String(value || "").trim();
  if (!s || s.length < 3) return false;
  if (GENERIC_DEPT.test(s)) return false;
  if (/^www\./i.test(s)) return false;
  return true;
}

export type ResolvedJobDept = {
  label: string;
  sourceId: string | null;
  portalUrl: string | null;
};

/** Best display name for the recruiting organisation on job detail. */
export function resolveJobDept(job: JobRecord | null | undefined): ResolvedJobDept {
  if (!job) {
    return { label: "Official notification", sourceId: null, portalUrl: null };
  }

  const detail = detailBlob(job);
  const sourceRaw = String(detail.source || job.source || "").trim();
  const sourceId = sourceRaw.replace(/-rss$/, "") || null;
  const site = sourceId ? SITE_BY_ID.get(sourceId) : undefined;

  const candidates = [
    cleanDept(job.dept, sourceId || undefined),
    String(detail.sourceName || "").trim(),
    String(detail.recruitment_board || "").trim(),
    fromStructuredOverview(job),
    site?.name || "",
  ];

  let label = "";
  for (const c of candidates) {
    if (isUsableDept(c)) {
      label = c;
      break;
    }
  }

  if (!label) {
    label = site?.name || "Official notification";
  }

  return {
    label,
    sourceId,
    portalUrl: site?.latestUrl || site?.url || null,
  };
}
