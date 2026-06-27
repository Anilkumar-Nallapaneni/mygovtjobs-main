import { STATES } from "@/data/states";
import { CATS } from "@/data/categories";
import {
  type HeadlineStatusBadge,
  type OfficialFeedItem,
  type OfficialHeadlineRow,
} from "@/lib/officialFeed";

/**
 * Maps a results-hub / headlines topic key (see `data/resultTopics.ts`) to a regex
 * evaluated against the feed item's title / summary / dept.
 * `null` means "no topic narrowing".
 */
const TOPIC_PATTERNS = {
  /* Notifications column */
  latest:           null,
  "employment-news": /\bemployment\s*news\b|rojgar\s*samachar/i,
  "search-jobs":    /\b(recruit|vacanc|appointment|hiring)\b/i,
  "sarkari-job":    /\b(recruit|vacanc|notification|advertisement)\b/i,
  "sarkari-naukri": /\b(recruit|vacanc|notification|naukri)\b/i,
  anganwadi:        /anganwadi|icds/i,
  forest:           /\bforest\b|wildlife|ranger/i,
  education:        /\b(education|school|university|college|teacher|professor|faculty|ugc|aicte|cbse|ncert|kvs|nvs)\b/i,
  "mock-test":      /\b(mock|practice|preparation|free\s*test)\b/i,

  /* Latest Announcements column */
  "sarkari-result":
    /\b(result|merit|cut[\s-]*off|cutoff|selection\s*list|provisional|scorecard|marks|recommended|written\s*result)\b|परिणाम|कट[\s-]*ऑफ|चयन|अंक|मेरिट/i,
  "admit-card":
    /(?:admit\s*cards?|hall\s*tickets?|hallticket|call\s*letters?|e[\s-]*admit|download\s+hall|download\s+admit|intimation\s+letters?|entry\s+certificates?|entry\s+card|permission\s+slip|e[\s-]*call)|एडमिट|हॉल\s*टिकट|प्रवेश\s*पत्र|admitcard/i,
  "exam-results":   /\b(exam(?:ination)?\s*result|result\s*declared|scorecard)\b/i,
  "answer-key":     /\banswer\s*key\b/i,
  cutoff:           /\bcut[\s-]*off\b|cutoff/i,
  "written-marks":  /\b(written\s*(?:exam(?:ination)?|test)\s*marks|main(?:s)?\s*marks|marks\s*of\s*(?:written|qualified|candidates)|cbt\s*marks|tier[\s-]*[i1-3]+\s*marks|stage[\s-]*[i1-3]+\s*marks|written\s*examination\s*marks)\b/i,
  interview:        /\binterview\b|viva|personality\s*test/i,
  "last-date":      /\b(last\s*date|extension|extended|deadline|closing)\b/i,

  /* Others column (mostly tooling — no feed mapping by default) */
  eligibility:      /\beligibility|qualification|age\s*limit\b/i,
  syllabus:         /\bsyllabus\b/i,
  "exam-pattern":   /\bexam\s*pattern|scheme\s*of\s*exam/i,
  selection:        /\bselection\s*process|selection\s*procedure/i,
  "previous-papers":/\b(previous\s*(?:year)?\s*(?:question)?\s*papers?|sample\s*papers?|model\s*papers?|old\s*papers?|pyq|question\s*bank|past\s*papers?|specimen\s*question|question\s*cum|model\s*question)\b/i,
  games:            null,
  "image-resizer":  null,
  "pdf-to-word":    null,
  "image-to-pdf":   null,
  "word-to-pdf":    null,
  "ai-interview":   /\bai\s*interview|mock\s*interview\b/i,
};

/**
 * @returns string[] of distinct state.n values (e.g. "Bihar", "All India") that
 *          the feed's `state` field may match against. We compare loosely so
 *          a feed item set to "Bihar" filters when `stateId="br"`, and an
 *          item set to "All India" passes for any state-context filter only if
 *          `includeAllIndia` is true.
 */
function stateLabelsForId(stateId) {
  if (!stateId) return null;
  const st = STATES.find((s) => s.id === stateId);
  return st ? [st.n] : null;
}

/**
 * Build a haystack string used for state/category/topic matching.
 */
function haystack(item) {
  return `${item.title || ""} ${item.summary || ""} ${item.dept || ""} ${item.sourceName || ""} ${item.state || ""}`;
}

/**
 * Apply state + category + sidebar-topic filters to the official feed items.
 *
 *  - `stateId`   – STATES[].id   (null = no state narrowing)
 *  - `categoryId`– CATS[].id     (null = no category narrowing)
 *  - `topicKey`  – result topic / headlines key (null = no topic narrowing)
 *  - `search`    – freeform query string from the navbar (optional)
 */
export type OfficialFilterOpts = {
  stateId?: string | null
  categoryId?: string | null
  topicKey?: string | null
  search?: string
}

export function filterOfficialItems(items: unknown[], { stateId, categoryId, topicKey, search }: OfficialFilterOpts = {}) {
  if (!Array.isArray(items)) return [];

  const stateLabels = stateLabelsForId(stateId);
  const category = categoryId ? CATS.find((c) => c.id === categoryId) : null;
  const topicRe = topicKey ? TOPIC_PATTERNS[topicKey] ?? null : null;
  const searchRe = search?.trim() ? new RegExp(escapeRegex(search.trim()), "i") : null;

  const narrowed = items.filter((it) => {
    const row = it as {
      state?: string
      title?: string
      dept?: string
      summary?: string
      link?: string
      sourceId?: string
    }
    let hay = haystack(row)
    if (topicKey === "previous-papers") {
      hay = `${hay} ${row.link || ""}`
    }

    if (stateLabels) {
      const itState = (row.state || "").trim();
      const matches = stateLabels.some((label) => itState === label) || new RegExp(`\\b${escapeRegex(stateLabels[0])}\\b`, "i").test(hay);
      if (!matches) return false;
    }

    if (category) {
      const catRe = new RegExp(`\\b${escapeRegex(category.name)}\\b|\\b${escapeRegex(category.id)}\\b`, "i");
      if (!catRe.test(hay)) return false;
    }

    if (topicKey === "written-marks") {
      if (!/\bmarks\b/i.test(hay)) return false;
      if (topicRe && !topicRe.test(hay)) return false;
    } else if (topicKey === "admit-card") {
      const linkHay = `${hay} ${row.link || ""}`;
      const linkRe =
        /admit|hallticket|hall-ticket|call-letter|call_letter|e-admit|admitcards|candidate-corner|intimation|Download_HallTickets|hall_tickets|e-call|\/AC_|CandidateAdmitCard|HallTicket/i;
      if (
        /\/admit|hallticket|HallTicket|Download_HallTickets|CandidateAdmitCard|call-letter|call_letter/i.test(
          row.link || ""
        )
      ) {
        /* official admit URL path */
      } else if (topicRe && topicRe.test(linkHay)) {
        /* matched */
      } else if (linkRe.test(row.link || "")) {
        /* official admit URL */
      } else if (/\bdownload\b.{0,40}\bletter\b/i.test(linkHay)) {
        /* download call letter */
      } else if (
        /\.(gov|nic)\.in/i.test(row.link || "") &&
        /\bdownload\b/i.test(linkHay) &&
        /\b(card|letter|ticket)\b/i.test(linkHay)
      ) {
        /* download card / letter / ticket */
      } else if (topicRe) {
        return false;
      }
    } else if (topicKey === "sarkari-result") {
      const linkHay = `${hay} ${row.link || ""}`;
      const linkRe = /result|merit|scorecard|cutoff|cut-off|selection|recommended|marks-of|markslist/i;
      if (topicRe && topicRe.test(linkHay)) {
        /* matched */
      } else if (linkRe.test(row.link || "")) {
        /* official result URL */
      } else if (topicRe) {
        return false;
      }
    } else if (topicKey === "previous-papers") {
      if (topicRe && topicRe.test(hay)) {
        /* matched */
      } else if (
        row.sourceId === "upsc-previous-papers" &&
        /upsc\.gov\.in/i.test(row.link || "") &&
        /question|paper|specimen|model|qcab|examination/i.test(hay)
      ) {
        /* UPSC PYQ hub item */
      } else if (topicRe) {
        return false;
      }
    } else if (topicRe && !topicRe.test(hay)) {
      return false;
    }

    if (searchRe && !searchRe.test(hay)) return false;

    return true;
  });

  return narrowed;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns a human-readable label describing what filters were applied,
 * for the section caption. Empty string when nothing is active.
 */
export function describeActiveFilters({ stateId, categoryId, topicKey, search }: OfficialFilterOpts = {}) {
  const parts = [];
  if (stateId) {
    const st = STATES.find((s) => s.id === stateId);
    if (st) parts.push(st.n);
  }
  if (categoryId) {
    const c = CATS.find((x) => x.id === categoryId);
    if (c) parts.push(c.name);
  }
  if (topicKey) parts.push(prettyTopic(topicKey));
  if (search?.trim()) parts.push(`"${search.trim()}"`);
  return parts.join(" · ");
}

function prettyTopic(key: string) {
  const labels: Record<string, string> = {
    "sarkari-result": "Government Result",
    "sarkari-job": "Government Job",
    "sarkari-naukri": "Government Jobs",
  };
  if (labels[key]) return labels[key];
  return key
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/** Visual urgency tag parsed from headline title (display layer only). */
export function parseHeadlineStatus(title: string): HeadlineStatusBadge {
  const hay = String(title || "");
  if (/\bdownload\b/i.test(hay)) return "download";
  if (/\b(declared|announced|published)\b/i.test(hay)) return "declared";
  if (/\b(out|released|available)\b/i.test(hay)) return "out";
  return null;
}

/** Infer sidebar topic key from title / summary / dept haystack. */
export function inferTopicKey(item: Pick<OfficialFeedItem, "title" | "summary" | "dept" | "sourceName">): string | null {
  const hay = haystack(item);
  for (const [key, re] of Object.entries(TOPIC_PATTERNS)) {
    if (re && re.test(hay)) return key;
  }
  return null;
}

function boardLabel(item: OfficialFeedItem): string {
  return (item.sourceName || item.dept || item.sourceId || "Official").trim();
}

/** Map feed/archive items to unified table rows. */
export function toHeadlineRows(
  items: unknown[],
  fallbackTopicKey: string | null = null
): OfficialHeadlineRow[] {
  if (!Array.isArray(items)) return [];

  return items.map((raw) => {
    const item = raw as OfficialFeedItem;
    const topicKey = fallbackTopicKey || inferTopicKey(item);
    return {
      id: item.id || item.link,
      postDate: item.publishedAt ?? null,
      board: boardLabel(item),
      title: String(item.title || "").trim(),
      statusBadge: parseHeadlineStatus(item.title || ""),
      topicKey,
      topicLabel: topicKey ? prettyTopic(topicKey) : "—",
      link: item.link,
      pdfUrls: Array.isArray(item.pdfUrls) ? item.pdfUrls : [],
    };
  });
}

export type HeadlineTableSortKey = "newest" | "board";

export function sortHeadlineRows(rows: OfficialHeadlineRow[], sort: HeadlineTableSortKey = "newest"): OfficialHeadlineRow[] {
  const copy = [...rows];
  if (sort === "board") {
    return copy.sort((a, b) => a.board.localeCompare(b.board) || a.title.localeCompare(b.title));
  }
  return copy.sort((a, b) => {
    const ta = a.postDate ? Date.parse(a.postDate) : 0;
    const tb = b.postDate ? Date.parse(b.postDate) : 0;
    if (tb !== ta) return tb - ta;
    return a.title.localeCompare(b.title);
  });
}
