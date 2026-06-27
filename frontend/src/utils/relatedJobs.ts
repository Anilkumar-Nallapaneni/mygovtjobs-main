import type { JobRecord } from "@/types/job";

const MAX_RELATED = 6;

function jobKey(job: JobRecord): string {
  return String(job.slug || job.id || "").toLowerCase();
}

function sourceCode(job: JobRecord): string {
  const detail = job.detail as Record<string, unknown> | undefined;
  return String(detail?.source || job.source || "").toLowerCase().trim();
}

function normDept(job: JobRecord): string {
  return String(job.dept || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function stateSet(job: JobRecord): Set<string> {
  const ids = job.stateIds?.length ? job.stateIds : job.state ? [job.state] : [];
  return new Set(ids.map((s) => String(s).toLowerCase()));
}

function isExpired(job: JobRecord, nowMs: number): boolean {
  const raw = job.lastDate || job.last_date;
  if (!raw) return false;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) && ms < nowMs;
}

function scoreRelated(current: JobRecord, candidate: JobRecord): number {
  let score = 0;
  const curSource = sourceCode(current);
  const candSource = sourceCode(candidate);
  if (curSource && candSource && curSource === candSource) score += 50;

  const curDept = normDept(current);
  const candDept = normDept(candidate);
  if (curDept && candDept && (curDept === candDept || curDept.includes(candDept) || candDept.includes(curDept))) {
    score += 30;
  }

  if (current.category && candidate.category && current.category === candidate.category) score += 15;

  const curStates = stateSet(current);
  const candStates = stateSet(candidate);
  if (curStates.has("all") && candStates.has("all")) {
    score += 10;
  } else {
    for (const s of candStates) {
      if (s !== "all" && curStates.has(s)) {
        score += 10;
        break;
      }
    }
  }

  const vac = Number(candidate.vacancies) || 0;
  if (vac > 0) score += Math.min(5, Math.floor(vac / 100));

  return score;
}

/** Pick related live jobs from the same board, dept, category, or state. */
export function pickRelatedJobs(
  current: JobRecord,
  allJobs: JobRecord[],
  options?: { nowMs?: number; limit?: number },
): JobRecord[] {
  const nowMs = options?.nowMs ?? Date.now();
  const limit = options?.limit ?? MAX_RELATED;
  const currentKey = jobKey(current);
  if (!currentKey || !allJobs.length) return [];

  const scored: Array<{ job: JobRecord; score: number }> = [];

  for (const job of allJobs) {
    const key = jobKey(job);
    if (!key || key === currentKey) continue;
    if (job.status === "expired" || job.status === "draft") continue;
    if (isExpired(job, nowMs)) continue;

    const score = scoreRelated(current, job);
    if (score < 10) continue;
    scored.push({ job, score });
  }

  scored.sort((a, b) => b.score - a.score || String(a.job.title).localeCompare(String(b.job.title)));

  const seen = new Set<string>();
  const out: JobRecord[] = [];
  for (const { job } of scored) {
    const key = jobKey(job);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(job);
    if (out.length >= limit) break;
  }
  return out;
}
