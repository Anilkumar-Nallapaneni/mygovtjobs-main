import { pickOfficialDetailUrl } from "@/utils/officialDomains";
import { resolveJobApplyHref } from "@/utils/jobDetailLinks";
import { collectPdfUrls } from "@/utils/resolvePdfUrl";
import { normalizeIsoDate, resolveVacancyCount } from "@/utils/jobMetadataUtils";
import { buildStructuredJobDetail } from "@/utils/jobDetailStructured";
import { resolveJobDept } from "@/utils/resolveJobDept";

const MISSING_DETAIL = "See official notification";
const RAW_PDF_MARKERS = [
  /page\s+\d+\s+of\s+\d+/i,
  /government\s+of\s+india\s+ministry/i,
  /railway\s+recruitment\s+boards?/i,
  /\bsl\.?\s*no\.?\b/i,
  /\broll\s*no\.?\b/i,
  /\bcen\s+\d{2}\/\d{4}\b/i,
  /download(?:ing)?\s+of\s+e-?call\s+letter/i,
];

function trimSummary(text, max = 12_000) {
  const s = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s || s.length < 40) return "";
  if (/^Sl No\.\s*Roll No/i.test(s)) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function meaningfulValue(value) {
  const s = String(value || "").trim();
  if (!s || s === "—") return "";
  if (/^(?:see|as per)\s+(?:official\s+)?notification$/i.test(s)) return "";
  return s;
}

function toDisplayLabel(rawKey) {
  return String(rawKey || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function normalizeDetailValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const list = value
      .map((item) => normalizeDetailValue(item))
      .filter(Boolean)
      .slice(0, 5);
    return list.join(" • ");
  }
  if (typeof value === "object") {
    const pairs = Object.entries(value)
      .slice(0, 5)
      .map(([k, v]) => `${toDisplayLabel(k)}: ${normalizeDetailValue(v)}`)
      .filter((entry) => !/:\s*$/.test(entry));
    return pairs.join(" | ");
  }
  return "";
}

function buildExtraDetails(job) {
  const detail = job?.detail && typeof job.detail === "object" ? job.detail : {};
  const blockedKeys = new Set([
    "summary",
    "source",
    "pdf_url",
    "pdf_urls",
    "pdfUrls",
    "published",
    "notification_url",
    "qualification",
    "vacancy",
    "vacancies",
    "important_dates",
    "content_sections",
    "selection_process",
    "documents_required",
    "external_id",
  ]);

  return Object.entries(detail)
    .filter(([key]) => !blockedKeys.has(key))
    .map(([key, value]) => ({ label: toDisplayLabel(key), value: normalizeDetailValue(value) }))
    .filter(({ value }) => {
      const v = String(value || "").trim();
      if (!v) return false;
      if (/^(?:na|n\/a|none|null|undefined|not available)$/i.test(v)) return false;
      return v.length <= 360;
    })
    .slice(0, 8);
}

function looksLikeRawPdfDump(text) {
  const s = String(text || "");
  const markerCount = RAW_PDF_MARKERS.reduce((n, re) => n + (re.test(s) ? 1 : 0), 0);
  return markerCount >= 2 || (s.length > 550 && markerCount >= 1);
}

function firstUsefulSentence(text) {
  if (looksLikeRawPdfDump(text)) return "";
  const sentence = String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .find((s) => s.length >= 60 && s.length <= 280 && !/^page\s+\d+/i.test(s));
  return sentence || "";
}

function extractSalary(text) {
  const s = String(text || "").replace(/\s+/g, " ");
  const rupee = s.match(/(?:pay\s+scale|salary|emoluments|remuneration)\s*[:-]?\s*((?:rs\.?|inr|₹)\s?[\d,]+(?:\s*(?:-|to|–)\s*(?:rs\.?|inr|₹)?\s?[\d,]+)?[^.;]{0,45})/i);
  if (rupee) return rupee[1].trim();
  const level = s.match(/\b(?:pay\s+level|level)\s*[-:]?\s*(\d{1,2}(?:\s*\([^)]*\))?)/i);
  return level ? `Pay Level ${level[1].trim()}` : "";
}

function extractAge(text) {
  const s = String(text || "").replace(/\s+/g, " ");
  const labelled = s.match(/(?:age\s+limit|upper\s+age|minimum\s+age|maximum\s+age)\s*[:-]?\s*([^.;]{0,90}?(?:years?|yrs?|age)[^.;]{0,30})/i);
  if (labelled) return labelled[1].trim();
  const range = s.match(/\b(\d{2}\s*(?:-|to|–)\s*\d{2}\s*(?:years?|yrs?))\b/i);
  return range ? range[1].trim() : "";
}

function buildAbout(job) {
  const isPdf =
    Boolean(job?.detail?.memorized_at) ||
    String(job?.detail?.detail_source || "").toLowerCase() === "pdf";
  const rawSummary = trimSummary(job.about || job.detail?.summary, isPdf ? 12_000 : 2_000);
  const usefulSentence = firstUsefulSentence(rawSummary);

  // Prefer the full PDF/notification text when available.
  if (isPdf && rawSummary.length >= 200) {
    return rawSummary;
  }

  const parts = [
    `${job.title} is an official recruitment notice${job.dept && job.dept !== job.title ? ` from ${job.dept}` : ""}.`,
    job.dept && job.dept !== job.title ? `Issued by ${job.dept}.` : "",
    meaningfulValue(job.qual) ? `Qualification: ${job.qual}.` : "",
    job.vacancies > 0 ? `Approximately ${job.vacancies.toLocaleString("en-IN")} posts mentioned in the listing.` : "",
    job.lastDate && job.lastDate !== "—" ? `Last date: ${job.lastDate}.` : "",
    usefulSentence,
    "Open the official notification PDF or portal link below for eligibility, fees, and how to apply.",
  ].filter(Boolean);

  return parts.join(" ");
}

function buildHighlights(job) {
  return [
    job.vacancies > 0 ? `${job.vacancies.toLocaleString("en-IN")} notified posts` : "",
    job.lastDate && job.lastDate !== "—" ? `Apply by ${job.lastDate}` : "",
    meaningfulValue(job.salary) ? `Salary: ${job.salary}` : "",
    meaningfulValue(job.age) ? `Age: ${job.age}` : "",
    meaningfulValue(job.qual) ? `Qualification: ${job.qual}` : "",
  ].filter(Boolean);
}

function buildDates(job) {
  const dates = { ...(job.dates || {}) };
  const last = job.lastDate && job.lastDate !== "—" ? job.lastDate : null;
  const published =
    normalizeIsoDate(job.publishedDate) ||
    normalizeIsoDate(job.published_at) ||
    normalizeIsoDate(job.detail?.published);

  if (last && !dates["Apply End"] && !dates["Last Date"]) {
    dates["Last Date"] = last;
  }
  if (published && !dates.Notification) {
    dates.Notification = published;
  }
  if (job.detail?.advt_no && !dates["Advertisement No."]) {
    dates["Advertisement No."] = job.detail.advt_no;
  }
  if (Array.isArray(job.detail?.important_dates)) {
    for (const entry of job.detail.important_dates) {
      const event = meaningfulValue(entry?.event || entry?.Event);
      const when = meaningfulValue(entry?.date || entry?.Date);
      if (event && when && !dates[event]) {
        dates[event] = when;
      }
    }
  }
  return dates;
}

function buildHowApply(job, applyHref) {
  if (Array.isArray(job.howApply) && job.howApply.length) return job.howApply;
  if (Array.isArray(job.detail?.how_to_apply) && job.detail.how_to_apply.length) {
    return job.detail.how_to_apply.map((item) => String(item)).filter(Boolean);
  }
  if (Array.isArray(job.detail?.documents_required) && job.detail.documents_required.length) {
    return [
      "Read the official notification carefully.",
      ...job.detail.documents_required.slice(0, 8).map((item) => `Keep ready: ${String(item)}`),
      "Submit the application on the official portal before the last date.",
    ];
  }
  if (!applyHref) {
    return ["Open the official PDF notification using the link below and follow the instructions inside."];
  }
  const host = (() => {
    try {
      return new URL(applyHref).hostname.replace(/^www\./, "");
    } catch {
      return "the official portal";
    }
  })();
  return [
    `Visit the official site (${host}).`,
    "Read the full advertisement/notification carefully.",
    "Check eligibility, age limit, and required documents.",
    "Complete the online application before the last date (if applicable).",
    "Save your application confirmation / registration number.",
  ];
}

function buildSelection(job) {
  if (Array.isArray(job.selection) && job.selection.length) return job.selection;
  if (Array.isArray(job.detail?.selection_process) && job.detail.selection_process.length) {
    return job.detail.selection_process.slice(0, 12).map((item) => String(item));
  }
  return [
    "Refer to the official notification for the exact selection stages (written exam, interview, skill test, etc.).",
  ];
}

function extractFeeFromSections(job) {
  const sections = Array.isArray(job?.detail?.content_sections) ? job.detail.content_sections : [];
  const fee = {};
  for (const section of sections) {
    const heading = String(section?.heading || "");
    const isFee = /fee|charges|payment/i.test(heading);
    const tables = Array.isArray(section?.tables) ? section.tables : [];
    for (const table of tables) {
      const rows = Array.isArray(table) ? table : [table];
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const label = String(row.label || "").trim();
        const value = String(row.value || "").trim();
        if (label && value && (isFee || /fee/i.test(label) || /(?:rs\.?|inr|₹|exempt|nil)/i.test(value))) {
          fee[label] = value;
          continue;
        }
        if (isFee) {
          for (const [k, v] of Object.entries(row)) {
            const key = String(k || "").trim();
            const val = String(v || "").trim();
            if (key && val && /(?:rs\.?|inr|₹|exempt|nil)/i.test(val)) fee[key] = val;
          }
        }
      }
    }
    if (isFee && Array.isArray(section.lists)) {
      for (const list of section.lists) {
        for (const item of list || []) {
          const m = String(item).match(/^([^:]{2,60}?)\s*:\s*(.+)$/);
          if (m) fee[m[1].trim()] = m[2].trim();
        }
      }
    }
  }
  return fee;
}

function isMpscLdeMpessJob(job) {
  const title = String(job?.title || "").toLowerCase();
  const summary = String(job?.detail?.summary || job?.about || "").toLowerCase();
  const dept = String(job?.dept || "").toLowerCase();
  return (
    /junior\s+grade\s+of\s+mpe&ss/.test(title) ||
    /lde\s*\(gazetted\s*post\)\s*no\.\s*17\s*of\s*2026/.test(title) ||
    (/mizoram public service commission|mpsc/.test(dept) &&
      /junior\s+grade\s+of\s+mpe&ss|planning\s*&?\s*programme\s*implementation|inspector\s+of\s+statistics/.test(
        summary
      ))
  );
}

function applyKnownPdfOverrides(base, { pdfHref, pdfUrls }) {
  if (!isMpscLdeMpessJob(base)) return null;

  const notificationPdf =
    pdfHref ||
    "https://mpsc.mizoram.gov.in/uploads/notifications/17-lde-gazetted-post-no17-of-2026-2027-jr-gr-of-mpess.pdf";
  const applyUrl = "https://mpsconline.mizoram.gov.in";
  const syllabusUrl = "https://tinyurl.com/mpesslde";

  return {
    ...base,
    title: "LDE (Gazetted Post) No. 17 of 2026-2027 - Junior Grade of MPE&SS",
    dept: "Mizoram Public Service Commission (MPSC)",
    vacancies: 1,
    qual:
      "From officers in Inspector of Statistics with 5 years of regular service in the grade (after regular appointment) with Bachelor Degree",
    salary: "Level 10 in the Pay Matrix",
    age: "As per departmental LDE rules / official notification",
    lastDate: "2026-06-29",
    published_at: base.published_at || "2026-05-26T00:00:00Z",
    nationality: "As per Mizoram Government service rules",
    ageRelax: "As per Mizoram Government rules",
    attempts: "As per departmental rules / official notification",
    syllabus: `Available at ${syllabusUrl}`,
    about:
      "Mizoram Public Service Commission (MPSC) will conduct Limited Departmental Examination (Gazetted Post) No. 17 of 2026-2027 for Junior Grade of MPE&SS under Planning & Programme Implementation Department. Apply online through the official MPSC portal before 29-06-2026, 4:00 PM.",
    highlights: [
      "1 notified post",
      "Group A (Gazetted)",
      "Pay: Level 10 in Pay Matrix",
      "Last date: 29-06-2026, 4:00 PM",
      "Rules: Mizoram Planning, Economic & Statistical Service Rules, 2025",
    ],
    dates: {
      Notification: "2026-05-26",
      "Last Date": "2026-06-29",
      "Last Time": "4:00 PM",
      "Advt. No.": "LDE (Gazetted Post) No. 17 of 2026-2027",
      "Memo No.": "A.34012/5/2026-MPSC(PRE)",
    },
    fee: {
      "PwD Candidate": "Exempted from application fee",
      "UPI Note": "UPI payment should use the same mobile number as one-time registration",
      Refund: "Fees once paid are non-refundable",
    },
    howApply: [
      "Complete one-time registration if not already registered.",
      `Apply through ${applyUrl}.`,
      "Upload required documents before the last date.",
      "Verify final submission after payment.",
      "Submit on or before 29-06-2026, 4:00 PM.",
    ],
    selection: [
      "Limited Departmental Examination as notified by MPSC.",
      "Refer official syllabus for paper-wise scheme and stages.",
    ],
    applyUrl,
    officialUrl: applyUrl,
    pdfUrl: notificationPdf,
    pdfUrls: Array.from(new Set([notificationPdf, ...(Array.isArray(pdfUrls) ? pdfUrls : [])])),
    detail: {
      ...(base.detail || {}),
      source: "mpsc",
      notification_no: "LDE (Gazetted Post) No. 17 of 2026-2027",
      memo_no: "A.34012/5/2026-MPSC(PRE)",
      department: "Planning & Programme Implementation",
      classification: "Group A (Gazetted)",
      relevant_rules: "Mizoram Planning, Economic & Statistical Service Rules, 2025",
      published: "2026-05-26T00:00:00Z",
      notification_url: applyUrl,
      syllabus_url: syllabusUrl,
      documents_required: [
        "Confirmation Order",
        "Joining Report / Service Book entry showing date of joining feeder post",
        "Certification by HoD or Cadre Authority",
      ],
      disqualifications: [
        "Canvassing directly or indirectly",
        "Incomplete/incorrect particulars in application",
        "Not fulfilling eligibility conditions at any stage",
        "Failure to upload required documents before the last date",
      ],
      helpdesk_phone: "0389-3596493",
      helpdesk_hours: "Working days, 10:00 AM - 4:00 PM",
      summary:
        "MPSC LDE (Gazetted Post) No. 17 of 2026-2027 for Junior Grade of MPE&SS under Planning & Programme Implementation Department.",
    },
  };
}

/**
 * Normalize a JobCard/live row into a JobDetail-friendly shape with fallbacks.
 */
export function buildJobDetailView(job) {
  if (!job) return job;

  const title = job.title || "Government recruitment";
  const summary = job?.detail?.summary || job?.about || "";
  const postsSum = (
    Array.isArray(job.posts) ? job.posts : job.detail?.posts || []
  ).reduce((s, p) => s + (Number(p?.vacancies) || 0), 0);
  const vacancies = resolveVacancyCount(job.vacancies, title, summary, job?.about, postsSum);
  const applyHref = resolveJobApplyHref(job) || pickOfficialDetailUrl(job) || null;

  const pdfUrls = Array.isArray(job.pdfUrls) && job.pdfUrls.length ? job.pdfUrls : collectPdfUrls(job);
  const pdfHref = pdfUrls[0] || job.pdfUrl || (applyHref && /\.pdf(\?|$)/i.test(applyHref) ? applyHref : null);
  const htmlApply =
    applyHref && applyHref !== pdfHref && !/\.pdf(\?|$)/i.test(applyHref) ? applyHref : null;

  const structured = buildStructuredJobDetail(job);
  const useStructured = structured.isStructured;
  const overviewQual = structured.overviewFacts.find((f) => /qualification/i.test(f.label))?.value;
  const overviewSalary = structured.overviewFacts.find((f) =>
    /salary|stipend|emoluments/i.test(f.label)
  )?.value;
  const overviewAge = structured.overviewFacts.find((f) => /age/i.test(f.label))?.value;

  const qual =
    job.qual && job.qual !== "—" && job.qual !== "See notification"
      ? job.qual
      : overviewQual || job.detail?.qualification || "See official notification";

  const salary =
    meaningfulValue(job.salary) ||
    overviewSalary ||
    structured.salaryInfo[0] ||
    extractSalary(summary) ||
    MISSING_DETAIL;
  const age =
    meaningfulValue(job.age) ||
    meaningfulValue(job.age_limit) ||
    overviewAge ||
    structured.ageLimit[0] ||
    extractAge(summary) ||
    MISSING_DETAIL;

  const dates = buildDates({ ...job, vacancies, lastDate: job.lastDate });
  if (useStructured) {
    for (const entry of structured.importantDates) {
      if (entry.event && entry.date && !dates[entry.event]) {
        dates[entry.event] = entry.date;
      }
    }
  }
  if (Array.isArray(job.important_dates)) {
    for (const row of job.important_dates) {
      const key = row.event_key || row.event;
      const val = row.event_date || row.date;
      if (key && val && !dates[key]) dates[key] = String(val);
    }
  }
  const about = useStructured && structured.summary
    ? structured.summary
    : buildAbout({ ...job, vacancies, salary, age });
  const highlights = useStructured ? [] : buildHighlights({ ...job, vacancies, salary, age, qual });

  const howApply = useStructured && structured.howToApply.length
    ? structured.howToApply
    : buildHowApply(job, htmlApply || pdfHref);

  const selection = useStructured && structured.selection.length
    ? structured.selection
    : buildSelection(job);

  const documentsRequired = Array.isArray(job.detail?.documents_required)
    ? job.detail.documents_required.map((item) => String(item)).filter(Boolean)
    : [];

  const extraDetails = useStructured ? [] : buildExtraDetails(job);

  const feeFromSections = extractFeeFromSections(job);
  const fee =
    job.fee && Object.keys(job.fee).length
      ? job.fee
      : job.detail?.fee && typeof job.detail.fee === "object" && Object.keys(job.detail.fee).length
      ? job.detail.fee
      : feeFromSections;
  const posts = (() => {
    const raw = Array.isArray(job.posts) && job.posts.length ? job.posts : job.detail?.posts || [];
    return raw
      .map((row) => ({
        post: row.post_name || row.post || "",
        vacancies: String(row.vacancies ?? ""),
        pay_level: row.pay_level || "",
      }))
      .filter((row) => row.post);
  })();
  const resolvedDept = resolveJobDept(job);

  const base = {
    ...job,
    title,
    dept: resolvedDept.label,
    deptPortalUrl: resolvedDept.portalUrl,
    deptSourceId: resolvedDept.sourceId,
    vacancies,
    qual,
    salary,
    age,
    about,
    highlights,
    dates,
    fee,
    posts,
    howApply,
    selection,
    documentsRequired,
    applyUrl: applyHref || "#",
    pdfUrl: pdfHref,
    pdfUrls,
    officialUrl: applyHref || job.officialUrl || "#",
    nationality: job.nationality || "See official notification",
    ageRelax: job.ageRelax || "See official notification",
    attempts: job.attempts || "See official notification",
    helpdesk: job.helpdesk || "—",
    email: job.email || "—",
    syllabus: job.syllabus || "",
    extraDetails,
    structured,
    _detailReady: true,
  };

  return (
    applyKnownPdfOverrides(base, {
      pdfHref,
      pdfUrls,
    }) || base
  );
}
