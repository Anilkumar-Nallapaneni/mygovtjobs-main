/**
 * Shared loader for official-feed-items.json (single network call per session).
 */

/** Row shape from official-feed-items.json and official-archives/*.json */
export type OfficialFeedItem = {
  id: string
  title: string
  link: string
  publishedAt?: string | null
  summary?: string | null
  pdfUrls?: string[]
  sourceId?: string
  sourceName?: string
  dept?: string
  state?: string
  category?: string | null
  stateIds?: string[]
  fetchMethod?: string
  vacancies?: number | string | null
}

/** Table row for exam-updates hub (Post Date, Board, Title, Topic, Link). */
export type OfficialHeadlineRow = {
  id: string
  postDate: string | null
  board: string
  title: string
  statusBadge: HeadlineStatusBadge
  topicKey: string | null
  topicLabel: string
  link: string
  pdfUrls: string[]
}

export type HeadlineStatusBadge = 'out' | 'declared' | 'download' | null

export type HeadlinesViewMode = "feed" | "table"

export type OfficialFeedSnapshot = {
  generatedAt?: string | null
  count?: number
  items?: OfficialFeedItem[]
}

let CACHE: OfficialFeedSnapshot | null = null;
let INFLIGHT = null;
let CACHE_AT = 0;

const DEFAULT_MAX_AGE_MS = 15 * 60 * 1000;

/** Coerce unknown archive/feed payload into OfficialFeedItem[]. */
export function asOfficialFeedItems(items: unknown): OfficialFeedItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter((row): row is OfficialFeedItem => {
    const it = row as OfficialFeedItem;
    return Boolean(it?.title && (it.link || it.id));
  });
}

/** @param {{ cache?: RequestCache, maxAgeMs?: number }} [opts] */
export async function loadOfficialFeed({ cache = "no-cache", maxAgeMs = DEFAULT_MAX_AGE_MS } = {}) {
  if (CACHE && Date.now() - CACHE_AT < maxAgeMs) return CACHE;
  if (!INFLIGHT) {
    INFLIGHT = (async () => {
      try {
        const cacheBust = cache === "no-cache" || cache === "no-store" || cache === "reload";
        const res = await fetch(`/data/official-feed-items.json${cacheBust ? `?t=${Date.now()}` : ""}`, {
          cache: cache as RequestCache,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        CACHE = json;
        CACHE_AT = Date.now();
        return json;
      } finally {
        INFLIGHT = null;
      }
    })();
  }
  return INFLIGHT;
}
