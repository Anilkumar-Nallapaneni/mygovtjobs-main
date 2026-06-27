import type { OfficialFeedItem } from "@/lib/officialFeed";
import type { JobRecord } from "@/types/job";
import {
  buildLatestNotificationsData,
  sortNotificationRows,
} from "@/utils/latestNotificationsTable";
import { filterOfficialItems } from "@/utils/officialFilters";
import { jobDetailPath } from "@/utils/jobRoutes";

export type EmploymentNewsItem = {
  id: string;
  title: string;
  board?: string;
  href: string;
  external: boolean;
};

/** Marquee shows newest headlines only — full list lives on Latest Notifications. */
export const EMPLOYMENT_NEWS_TICKER_LIMIT = 48;

function isNoiseTitle(title: string): boolean {
  const t = title.trim();
  if (!t || t.length < 4) return true;
  if (/^home\.aspx$/i.test(t)) return true;
  if (/^\{\{/.test(t)) return true;
  return false;
}

/** All live employment notifications: synced jobs + official recruitment feed. */
export function buildEmploymentNewsItems(
  jobs: JobRecord[],
  feedItems: OfficialFeedItem[]
): EmploymentNewsItem[] {
  const seen = new Set<string>();
  const out: EmploymentNewsItem[] = [];

  const push = (item: EmploymentNewsItem) => {
    const key = item.href || item.title.toLowerCase();
    if (isNoiseTitle(item.title) || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  };

  for (const row of sortNotificationRows(buildLatestNotificationsData(jobs).items, "newest")) {
    const internal = row._job ? jobDetailPath(row._job) : null;
    const externalUrl = row.detailUrl || null;
    push({
      id: String(row.id),
      title: row.postName,
      board: row.board || undefined,
      href: internal || externalUrl || "#",
      external: !internal && Boolean(externalUrl),
    });
  }

  const fromEmploymentSource = feedItems.filter((it) => it.sourceId === "employment-news");
  const fromRecruitmentTopic = filterOfficialItems(feedItems, {
    topicKey: "search-jobs",
  }) as OfficialFeedItem[];

  for (const item of [...fromEmploymentSource, ...fromRecruitmentTopic]) {
    const link = String(item.link || "").trim();
    if (!link || link === "#") continue;
    push({
      id: item.id || link,
      title: String(item.title || "").trim(),
      board: (item.sourceName || item.dept || undefined)?.trim(),
      href: link,
      external: true,
    });
  }

  return out.slice(0, EMPLOYMENT_NEWS_TICKER_LIMIT);
}
