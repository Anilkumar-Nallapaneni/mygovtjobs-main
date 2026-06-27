import { CATS, RESULTS_HUB_BOARD_CAT_IDS, type CategoryId } from "@/data/categories";
import { buildResultsHubUrl } from "@/utils/browseRoutes";
import { resolveJobDept } from "@/utils/resolveJobDept";
import type { JobRecord } from "@/types/job";

export type BoardExamLink = {
  kind: "admit" | "results";
  boardLabel: string;
  href: string;
};

function boardCategoryId(job: JobRecord): CategoryId | null {
  const cat = job.category;
  if (!cat) return null;
  return (RESULTS_HUB_BOARD_CAT_IDS as readonly string[]).includes(cat) ? (cat as CategoryId) : null;
}

function displayBoardName(job: JobRecord, categoryId: CategoryId | null): string {
  if (categoryId) {
    const cat = CATS.find((c) => c.id === categoryId);
    if (cat?.name) return cat.name;
  }
  const { label } = resolveJobDept(job);
  return label.replace(/\s*\([^)]*\)\s*$/, "").trim() || "this board";
}

/** Internal links from a job detail to filtered admit-card / results hubs. */
export function boardExamLinksForJob(job: JobRecord): BoardExamLink[] {
  const categoryId = boardCategoryId(job);
  const boardLabel = displayBoardName(job, categoryId);
  const query = categoryId ? { categoryId } : {};

  return [
    {
      kind: "admit",
      boardLabel,
      href: buildResultsHubUrl("/results/admit-card", query),
    },
    {
      kind: "results",
      boardLabel,
      href: buildResultsHubUrl("/results", query),
    },
  ];
}
