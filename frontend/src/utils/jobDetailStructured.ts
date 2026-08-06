import { isBlockedAggregatorHost, isStructuredImportSource } from "@/utils/officialDomains";

export type DetailFact = { label: string; value: string };
export type DetailDate = { event: string; date: string };
export type DetailLink = { label: string; url: string };
export type DetailVacancyRow = { post: string; vacancies: string };

export type DisplaySection = {
  heading: string;
  paragraphs: string[];
  tables: Record<string, string>[][];
  lists: string[][];
  links: DetailLink[];
};

export type StructuredJobDetail = {
  isStructured: boolean;
  summary: string;
  overviewFacts: DetailFact[];
  importantDates: DetailDate[];
  eligibility: string[];
  ageLimit: string[];
  salaryInfo: string[];
  vacancyRows: DetailVacancyRow[];
  selection: string[];
  howToApply: string[];
  officialLinks: DetailLink[];
  applyMode: string;
  displaySections: DisplaySection[];
  /** Full article body — same section order as source notification pages. */
  articleSections: DisplaySection[];
};

const HEADING = {
  overview: /overview/i,
  vacancy: /vacancy|post\s+details|name\s+of\s+(?:the\s+)?post/i,
  eligibility: /eligibility|qualification/i,
  age: /age\s*limit|age\s*criteria|relaxation/i,
  salary: /salary|stipend|emoluments|pay\s*scale|remuneration/i,
  dates: /important\s*dates|schedule\s+of\s+activit|date\s+of\s+exam/i,
  selection: /selection\s*process|mode\s+of\s+selection/i,
  howApply: /how\s*to\s*apply|application\s+procedure|apply\s+online/i,
  links: /important\s*links/i,
  intro: /^introduction$/i,
  pdf: /notification\s*pdf/i,
  fee: /application\s*fee|exam\s*fee|registration\s*fee|fee\s+details|\bfee\b/i,
  documents: /documents?\s+(?:required|to\s+be\s+produced)/i,
  syllabus: /syllabus|exam(?:ination)?\s+pattern|scheme\s+of\s+exam/i,
  instructions: /general\s+instructions|instructions?\s+to\s+candidates/i,
  faq: /^faqs?$/i,
};

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

/** Normalize PDF/import table shapes — rows may be nested or flat. */
function normalizeTableRows(table: unknown): Record<string, string>[] {
  if (!table) return [];
  if (Array.isArray(table)) {
    if (!table.length) return [];
    const first = table[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return table as Record<string, string>[];
    }
    return [];
  }
  if (typeof table === "object") {
    return [table as Record<string, string>];
  }
  return [];
}

function normalizeSectionTables(tables: unknown): Record<string, string>[][] {
  if (!Array.isArray(tables) || !tables.length) return [];
  const first = tables[0];
  if (first && typeof first === "object" && !Array.isArray(first)) {
    const rows = normalizeTableRows(tables);
    return rows.length ? [rows] : [];
  }
  return tables
    .map((table) => normalizeTableRows(table))
    .filter((rows) => rows.length > 0);
}

/** Latin-lookalike / broken PDF Indic runs that render as boxes in the UI. */
const _BROKEN_INDIC = /[\u0100-\u024F\u1E00-\u1EFF\u0250-\u02AF]/g;

function isGarbledParagraph(text: string) {
  const s = cleanText(text);
  if (!s) return true;
  if (/^page\s+\d+\s+of\s+\d+/i.test(s)) return true;
  const bad = (s.match(/\uFFFD|[�?]{2,}|\?{3,}/g) || []).join("").length;
  if (bad >= 6 && bad / Math.max(s.length, 1) > 0.03) return true;
  // Mixed EN + broken Devanagari font maps (ISRO bilingual PDFs).
  const broken = (s.match(_BROKEN_INDIC) || []).length;
  if (broken >= 8 && broken / Math.max(s.length, 1) > 0.04) return true;
  // Short labels/values with even a few Latin-lookalike Indic glyphs are unreadable.
  const hasDevanagari = /[\u0900-\u097F]/.test(s);
  if (broken >= 1 && hasDevanagari) return true;
  if (broken >= 2 && s.length <= 80) return true;
  // Mostly replacement/question-mark runs with little real Latin content.
  const latin = (s.match(/[A-Za-z]{3,}/g) || []).join("").length;
  if (broken >= 12 && latin < 40) return true;
  return false;
}

function isDumpParagraph(text: string) {
  const s = cleanText(text);
  if (!s) return true;
  if (isGarbledParagraph(s)) return true;
  if (s.length > 180 && /company name|post name|no of posts|qualification|age limit|last date/i.test(s)) {
    return true;
  }
  if (/^download\b/i.test(s) && /\.pdf/i.test(s)) return true;
  // FAQ dump paragraphs (often merged into Overview from a second PDF).
  if (
    /frequently\s+asked\s+questions/i.test(s) ||
    (/\banswer\s*:/i.test(s) && /\d+\.\s+.+\?/.test(s) && s.length > 120)
  ) {
    return true;
  }
  return false;
}

/** FAQ / Paper-Code / mojibake KV rows that should never become fact cards. */
const _JUNK_KV_LABEL = /^(?:answer|question|ans\.?|q\.?\s*\d+|no\.?\s*isro|no\.)$/i;
const _FEE_CATEGORY_LABEL =
  /^(?:general|ur|obc|sc|st|ews|female|women|pwd|pwbd|ex[\-\s]?servicemen|ph|others?|all\s+categories|application\s+fee|exam(?:ination)?\s+fee|registration\s+fee)(?:\s*\/\s*(?:sc|st|obc|ews|pwd|pwbd|ur|general|female|women))?$/i;
const _FEE_AMOUNT_VALUE = /(?:rs\.?|inr|₹)\s*[\d,]+(?:\s*\/\s*-)?/i;
const _FEE_NIL_VALUE = /^(?:nil|n\/?a|exempt(?:ed)?|free|no\s+fee|zero|0(?:\.0+)?|-|—)$/i;

export function isJunkKvFact(fact: DetailFact | null | undefined): boolean {
  if (!fact?.label || !fact?.value) return true;
  const label = cleanText(fact.label);
  const value = cleanText(fact.value);
  if (_JUNK_KV_LABEL.test(label)) return true;
  if (/\[?\s*paper\s*code\s*$/i.test(label)) return true;
  if (/^\[?paper\s*code/i.test(label)) return true;
  if (/^[A-Z]{1,3}\]?$/.test(value) && /paper\s*code/i.test(label)) return true;
  if (isGarbledParagraph(label) || isGarbledParagraph(value)) return true;
  // Truncated FAQ answers that end mid-phrase (no terminal punctuation, ends with stop-word).
  if (
    /^answer$/i.test(label) ||
    (value.length < 120 &&
      !/[.!?…"”)\]}]$/.test(value) &&
      /\b(?:from|the|to|for|by|of|and|or|will|be|are|is|in|on|at|with)$/i.test(value))
  ) {
    if (/^answer$/i.test(label)) return true;
  }
  return false;
}

/** Keep only rows that look like real application-fee categories/amounts. */
export function isRealFeeEntry(label: string, value: string): boolean {
  const l = cleanText(label);
  const v = cleanText(value);
  if (!l || !v) return false;
  if (_JUNK_KV_LABEL.test(l) || isJunkKvFact({ label: l, value: v })) return false;
  if (_FEE_AMOUNT_VALUE.test(v)) return true;
  if (_FEE_CATEGORY_LABEL.test(l) && (_FEE_NIL_VALUE.test(v) || /exempt|nil|free|no\s+fee/i.test(v))) {
    return true;
  }
  if (/fee/i.test(l) && (_FEE_AMOUNT_VALUE.test(v) || _FEE_NIL_VALUE.test(v))) return true;
  return false;
}

export function sanitizeFeeDict(fee: Record<string, unknown> | null | undefined): Record<string, string> {
  if (!fee || typeof fee !== "object") return {};
  const out: Record<string, string> = {};
  for (const [rawLabel, rawValue] of Object.entries(fee)) {
    const label = cleanText(rawLabel);
    const value = cleanText(rawValue);
    if (isRealFeeEntry(label, value)) out[label] = value;
  }
  return out;
}

/** Prefer readable English when bilingual PDF summary is mostly broken Indic. */
export function preferReadableSummary(text: string): string {
  const s = cleanText(text);
  if (!s) return "";
  if (!isGarbledParagraph(s) && (s.match(_BROKEN_INDIC) || []).length < 6) return s;
  // Split on sentence-ish boundaries and keep mostly-Latin sentences.
  const parts = s.split(/(?<=[.!?])\s+|\n+/).map((p) => cleanText(p)).filter(Boolean);
  const english = parts.filter((p) => {
    if (isGarbledParagraph(p)) return false;
    const latin = (p.match(/[A-Za-z]/g) || []).length;
    const broken = (p.match(_BROKEN_INDIC) || []).length;
    return latin >= 24 && broken / Math.max(p.length, 1) < 0.02;
  });
  if (english.length) return english.join(" ").slice(0, 1200);
  // Fallback: strip runs of broken chars and keep Latin islands.
  const stripped = s
    .replace(_BROKEN_INDIC, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length >= 40 ? stripped.slice(0, 1200) : "";
}

function normalizeKvRow(row: Record<string, string>): DetailFact | null {
  if (row.label && row.value) {
    const fact = { label: cleanText(row.label), value: cleanText(row.value) };
    return isJunkKvFact(fact) ? null : fact;
  }

  const entries = Object.entries(row).filter(([k]) => !k.toLowerCase().startsWith("col_"));
  if (entries.length !== 2) return null;
  const fact = { label: cleanText(entries[0][0]), value: cleanText(entries[0][1]) };
  return isJunkKvFact(fact) ? null : fact;
}

function normalizeVacancyRow(row: Record<string, string>): DetailVacancyRow | null {
  const post = cleanText(row["Post Name"] || row.post || row.post_name);
  const vacancies = cleanText(row["Total Posts"] || row.vacancies || row["No of Posts"] || row.total);
  if (!post || !vacancies) return null;
  if (/^total$/i.test(post)) return null;
  return { post, vacancies };
}

function normalizeDateRow(row: Record<string, string>): DetailDate | null {
  const event = cleanText(row.event || row.Event);
  const date = cleanText(row.date || row.Date);
  if (!event || !date) return null;
  if (/^event$/i.test(event) && /^date$/i.test(date)) return null;
  return { event, date };
}

function parseTableRows(table: unknown) {
  const rows = normalizeTableRows(table);
  const facts: DetailFact[] = [];
  const vacancies: DetailVacancyRow[] = [];
  const dates: DetailDate[] = [];

  for (const row of rows) {
    if (normalizeDateRow(row)) {
      const d = normalizeDateRow(row);
      if (d) dates.push(d);
      continue;
    }
    const vac = normalizeVacancyRow(row);
    if (vac) {
      vacancies.push(vac);
      continue;
    }
    const fact = normalizeKvRow(row);
    if (fact) facts.push(fact);
  }

  return { facts, vacancies, dates };
}

function dedupeFacts(facts: DetailFact[]) {
  const seen = new Set<string>();
  return facts.filter((f) => {
    const key = `${f.label}::${f.value}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(f.label && f.value);
  });
}

function dedupeDates(dates: DetailDate[]) {
  const seen = new Set<string>();
  return dates.filter((d) => {
    const key = `${d.event}::${d.date}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(d.event && d.date);
  });
}

function dedupeLinks(links: DetailLink[]) {
  const seen = new Set<string>();
  return links.filter((l) => {
    if (!l.url || seen.has(l.url)) return false;
    if (isBlockedAggregatorHost(l.url)) return false;
    seen.add(l.url);
    return true;
  });
}

function classifyHeading(heading: string) {
  const h = cleanText(heading);
  if (HEADING.intro.test(h)) return "intro";
  if (HEADING.overview.test(h)) return "overview";
  if (HEADING.vacancy.test(h)) return "vacancy";
  if (HEADING.eligibility.test(h)) return "eligibility";
  if (HEADING.age.test(h)) return "age";
  if (HEADING.salary.test(h)) return "salary";
  if (HEADING.dates.test(h)) return "dates";
  if (HEADING.selection.test(h)) return "selection";
  if (HEADING.howApply.test(h)) return "howApply";
  if (HEADING.links.test(h) || HEADING.pdf.test(h)) return "links";
  if (HEADING.fee.test(h)) return "fee";
  if (HEADING.faq.test(h)) return "faq";
  return "other";
}

function isFeeLabel(label: string) {
  return HEADING.fee.test(cleanText(label));
}

function isFeeHeading(heading: string) {
  return HEADING.fee.test(cleanText(heading));
}

function stripFeeRowsFromTables(tables: Record<string, string>[][]) {
  return tables
    .map((table) =>
      table.filter((row) => {
        if (normalizeVacancyRow(row) || normalizeDateRow(row)) return true;
        const label = cleanText(row.label || "");
        const value = cleanText(row.value || "");
        if (label && value) {
          if (isJunkKvFact({ label, value })) return false;
          return !isFeeLabel(label);
        }
        const fact = normalizeKvRow(row);
        return !(fact && isFeeLabel(fact.label));
      })
    )
    .filter((table) => table.length > 0);
}

function stripJunkRowsFromTables(tables: Record<string, string>[][]) {
  return tables
    .map((table) =>
      table.filter((row) => {
        const label = cleanText(row.label || "");
        const value = cleanText(row.value || "");
        if (label && value) return !isJunkKvFact({ label, value });
        // Non-KV vacancy/date tables keep as-is if rows look structured.
        if (normalizeVacancyRow(row) || normalizeDateRow(row)) return true;
        const fact = normalizeKvRow(row);
        return fact != null || Object.keys(row).length > 2;
      })
    )
    .filter((table) => table.length > 0);
}

function flattenLists(lists: unknown) {
  if (!Array.isArray(lists)) return [];
  return lists
    .flatMap((list) => (Array.isArray(list) ? list : []))
    .map((item) => cleanText(item))
    .filter(Boolean);
}

export function buildStructuredJobDetail(job: Record<string, unknown>): StructuredJobDetail {
  const detail = (job?.detail && typeof job.detail === "object" ? job.detail : {}) as Record<
    string,
    unknown
  >;
  const sections = Array.isArray(detail.content_sections) ? detail.content_sections : [];
  const summary = preferReadableSummary(cleanText(detail.summary || job.about || ""));
  const pdfMemorized =
    Boolean(detail.memorized_at) ||
    cleanText(String(detail.detail_source || "")).toLowerCase() === "pdf";
  const hasStructuredSource =
    isStructuredImportSource(detail.source) || sections.length > 0 || (pdfMemorized && summary.length >= 40);

  const empty: StructuredJobDetail = {
    isStructured: false,
    summary: "",
    overviewFacts: [],
    importantDates: [],
    eligibility: [],
    ageLimit: [],
    salaryInfo: [],
    vacancyRows: [],
    selection: [],
    howToApply: [],
    officialLinks: [],
    applyMode: "",
    displaySections: [],
    articleSections: [],
  };

  if (!hasStructuredSource) {
    return empty;
  }

  /** PDF summary without parsed sections — show notification body from memorized text. */
  const effectiveSections =
    sections.length > 0
      ? sections
      : pdfMemorized && summary.length >= 40
        ? [
            {
              heading: "Notification",
              paragraphs: [summary],
              tables: [],
              lists: [],
              links: [],
            },
          ]
        : [];

  if (effectiveSections.length === 0) {
    return empty;
  }

  let overviewFacts: DetailFact[] = [];
  let importantDates: DetailDate[] = [];
  let eligibility: string[] = [];
  let ageLimit: string[] = [];
  let salaryInfo: string[] = [];
  let vacancyRows: DetailVacancyRow[] = [];
  let selection: string[] = [];
  let howToApply: string[] = [];
  let officialLinks: DetailLink[] = [];
  let applyMode = "";

  if (Array.isArray(detail.important_dates)) {
    for (const entry of detail.important_dates) {
      const row = entry as Record<string, string>;
      const parsed = normalizeDateRow({
        event: row.event || row.Event,
        date: row.date || row.Date,
      });
      if (parsed) importantDates.push(parsed);
    }
  }

  for (const section of effectiveSections) {
    const s = section as Record<string, unknown>;
    const kind = classifyHeading(String(s.heading || ""));
    const paragraphs = Array.isArray(s.paragraphs)
      ? s.paragraphs.map((p) => cleanText(p)).filter((p) => !isDumpParagraph(p))
      : [];
    const lists = flattenLists(s.lists);
    const tables = normalizeSectionTables(s.tables);
    const links = Array.isArray(s.links)
      ? (s.links as Array<{ label?: string; url?: string }>)
          .map((l) => ({ label: cleanText(l.label) || "Official Link", url: cleanText(l.url) }))
          .filter((l) => l.url)
      : [];

    for (const link of links) {
      officialLinks.push(link);
    }

    for (const table of tables) {
      const parsed = parseTableRows(table);
      if (kind === "overview" || kind === "other") overviewFacts.push(...parsed.facts);
      if (kind === "vacancy" || kind === "overview") vacancyRows.push(...parsed.vacancies);
      if (kind === "dates" || kind === "overview") importantDates.push(...parsed.dates);
    }

    if (kind === "eligibility") eligibility.push(...lists, ...paragraphs);
    if (kind === "age") ageLimit.push(...lists, ...paragraphs);
    if (kind === "salary") salaryInfo.push(...lists, ...paragraphs);
    if (kind === "selection") selection.push(...lists, ...paragraphs);
    if (kind === "howApply") howToApply.push(...lists, ...paragraphs);
  }

  overviewFacts = dedupeFacts(overviewFacts).filter((f) => !isJunkKvFact(f));
  importantDates = dedupeDates(importantDates);
  officialLinks = dedupeLinks(officialLinks);
  selection = [...new Set(selection.map((s) => cleanText(s)).filter((s) => s && !isGarbledParagraph(s)))];
  howToApply = [...new Set(howToApply.map((s) => cleanText(s)).filter((s) => s && !isGarbledParagraph(s)))];
  eligibility = eligibility.map((s) => cleanText(s)).filter((s) => s && !isDumpParagraph(s));
  ageLimit = ageLimit.map((s) => cleanText(s)).filter((s) => s && !isGarbledParagraph(s));
  salaryInfo = salaryInfo.map((s) => cleanText(s)).filter((s) => s && !isGarbledParagraph(s));

  const applyModeFact = overviewFacts.find((f) => /apply mode/i.test(f.label));
  applyMode = applyModeFact?.value || "";

  if (Array.isArray(detail.selection_process) && detail.selection_process.length) {
    selection = detail.selection_process.map((s) => cleanText(s)).filter(Boolean);
  }
  if (Array.isArray(detail.how_to_apply) && detail.how_to_apply.length && !howToApply.length) {
    howToApply = detail.how_to_apply.map((s) => cleanText(s)).filter(Boolean);
  }
  if (Array.isArray(detail.documents_required) && detail.documents_required.length && !howToApply.length) {
    howToApply = detail.documents_required.map((s) => cleanText(s)).filter(Boolean);
  }

  if (
    !summary &&
    !overviewFacts.length &&
    !importantDates.length &&
    !eligibility.length &&
    !officialLinks.length
  ) {
    return empty;
  }

  const displaySections = pruneDisplaySections(
    effectiveSections,
    summary,
    importantDates.length > 0,
    overviewFacts.length > 0
  );

  let extractedFee = sanitizeFeeDict(
    detail.fee && typeof detail.fee === "object" ? (detail.fee as Record<string, unknown>) : null
  );
  let hasExtractedFee = Object.keys(extractedFee).length > 0;

  // When fee lives only in section tables, promote it so FeeGrid can render and article can dedupe.
  if (!hasExtractedFee) {
    const fromSections: Record<string, string> = {};
    for (const section of effectiveSections) {
      const s = section as Record<string, unknown>;
      const feeSection = isFeeHeading(String(s.heading || ""));
      for (const table of normalizeSectionTables(s.tables)) {
        for (const row of table) {
          const label = cleanText(row.label || "");
          const value = cleanText(row.value || "");
          if (label && value && isRealFeeEntry(label, value) && (feeSection || isFeeLabel(label))) {
            fromSections[label] = value;
          }
        }
      }
    }
    if (Object.keys(fromSections).length) {
      extractedFee = fromSections;
      hasExtractedFee = true;
    }
  }

  if (hasExtractedFee) {
    overviewFacts = overviewFacts.filter((f) => !isFeeLabel(f.label));
  }

  const articleSections = buildArticleSections(effectiveSections, {
    stripExtractedFee: hasExtractedFee,
    summary,
    skipOverview: overviewFacts.length > 0,
    skipDates: importantDates.length > 0,
    keepDumpParagraphs: pdfMemorized,
  });

  return {
    isStructured: true,
    summary,
    overviewFacts,
    importantDates,
    eligibility,
    ageLimit,
    salaryInfo,
    vacancyRows,
    selection,
    howToApply,
    officialLinks,
    applyMode,
    displaySections,
    articleSections,
  };
}

function isPromoParagraph(text: string) {
  const s = cleanText(text);
  if (!s) return true;
  if (/^follow us\b/i.test(s)) return true;
  if (/join\s*(whatsapp|telegram|instagram|youtube)/i.test(s) && s.length < 120) return true;
  if (/never miss a govt job/i.test(s)) return true;
  return false;
}

type ArticleSectionOptions = {
  stripExtractedFee?: boolean;
  summary?: string;
  skipOverview?: boolean;
  skipDates?: boolean;
  /** PDF memorized bodies often include field keywords — do not treat as dump. */
  keepDumpParagraphs?: boolean;
};

/** Article layout — strip promos, duplicate summary, and link-only blocks (shown in action bar). */
function buildArticleSections(sections: unknown[], options: ArticleSectionOptions = {}): DisplaySection[] {
  const {
    stripExtractedFee = false,
    summary = "",
    skipOverview = false,
    skipDates = false,
    keepDumpParagraphs = false,
  } = options;
  const seenHeadings = new Set<string>();

  return sections
    .map((section) => {
      const s = section as Record<string, unknown>;
      const heading = cleanText(String(s.heading || ""));
      const kind = classifyHeading(heading);
      if (stripExtractedFee && isFeeHeading(heading)) {
        return null;
      }
      if (summary && kind === "intro") {
        return null;
      }
      if (kind === "links") {
        return null;
      }
      if (skipOverview && kind === "overview") {
        return null;
      }
      if (skipDates && kind === "dates") {
        return null;
      }
      let tables = stripJunkRowsFromTables(normalizeSectionTables(s.tables));
      if (stripExtractedFee) {
        tables = stripFeeRowsFromTables(tables);
      }
      let paragraphs = Array.isArray(s.paragraphs)
        ? s.paragraphs
            .map((p) => cleanText(p))
            .filter((p) => {
              if (!p || isPromoParagraph(p) || isGarbledParagraph(p)) return false;
              if (!keepDumpParagraphs && isDumpParagraph(p)) return false;
              return true;
            })
        : [];
      if (summary && !keepDumpParagraphs) {
        paragraphs = paragraphs.filter((p) => !isSimilarText(p, summary));
      }
      const lists = Array.isArray(s.lists)
        ? (s.lists as string[][])
            .map((list) =>
              (Array.isArray(list) ? list : []).map((item) => cleanText(item)).filter(Boolean)
            )
            .filter((list) => list.length > 0)
        : [];
      const links: DetailLink[] = [];

      return { heading, paragraphs, tables, lists, links };
    })
    .filter((section): section is DisplaySection => {
      if (!section) return false;
      if (!section.heading && !section.paragraphs.length && !section.tables.length && !section.lists.length && !section.links.length) {
        return false;
      }
      const key = section.heading.toLowerCase().replace(/\s+/g, " ");
      if (key && seenHeadings.has(key)) return false;
      if (key) seenHeadings.add(key);
      return (
        section.paragraphs.length > 0 ||
        section.tables.length > 0 ||
        section.lists.length > 0 ||
        section.links.length > 0
      );
    });
}

function isSimilarText(a: string, b: string) {
  const left = cleanText(a).toLowerCase();
  const right = cleanText(b).toLowerCase();
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length > 80 && right.length > 80 && (left.includes(right) || right.includes(left))) {
    return true;
  }
  return false;
}

function isKvOverviewTable(table: Record<string, string>[]) {
  if (!table?.length) return false;
  return table.every((row) => normalizeKvRow(row) && !normalizeVacancyRow(row) && !normalizeDateRow(row));
}

function pruneDisplaySections(
  sections: unknown[],
  summary: string,
  showTopDates: boolean,
  showTopOverview: boolean
): DisplaySection[] {
  const seenHeadings = new Set<string>();

  return sections
    .map((section) => {
      const s = section as Record<string, unknown>;
      const heading = cleanText(String(s.heading || ""));
      const kind = classifyHeading(heading);
      const tables = stripJunkRowsFromTables(normalizeSectionTables(s.tables));
      let paragraphs = Array.isArray(s.paragraphs)
        ? s.paragraphs.map((p) => cleanText(p)).filter((p) => p && !isDumpParagraph(p))
        : [];
      const lists = Array.isArray(s.lists)
        ? (s.lists as string[][])
            .map((list) =>
              (Array.isArray(list) ? list : [])
                .map((item) => cleanText(item))
                .filter((item) => item && !isGarbledParagraph(item))
            )
            .filter((list) => list.length > 0)
        : [];

      if (tables.length) {
        paragraphs = paragraphs.filter((p) => !isDumpParagraph(p));
      }

      if (summary) {
        paragraphs = paragraphs.filter((p) => !isSimilarText(p, summary));
      }

      return { heading, kind, paragraphs, tables, lists };
    })
    .filter((section) => {
      if (!section.heading && !section.paragraphs.length && !section.tables.length && !section.lists.length) {
        return false;
      }
      if (section.kind === "intro" && summary) return false;
      if (section.kind === "dates" && showTopDates) return false;
      if (section.kind === "links") return false;
      if (section.kind === "overview" && showTopOverview) return false;
      if (
        section.kind === "overview" &&
        section.tables.length > 0 &&
        section.tables.every(isKvOverviewTable)
      ) {
        return false;
      }
      if (section.kind === "pdf" && !section.tables.length && !section.lists.length) {
        return false;
      }

      const key = section.heading.toLowerCase().replace(/\s+/g, " ");
      if (key && seenHeadings.has(key)) return false;
      if (key) seenHeadings.add(key);

      return section.paragraphs.length || section.tables.length || section.lists.length;
    })
    .map(({ heading, paragraphs, tables, lists }) => ({
      heading,
      paragraphs,
      tables,
      lists,
      links: [],
    }));
}
