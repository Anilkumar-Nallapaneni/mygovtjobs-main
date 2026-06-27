/** Map job `dates` / `fee` object keys to i18n paths under jobDetail.dates.* / jobDetail.fee.* */
export function dateKeySlug(key: string) {
  return String(key)
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
}

export function translateDateKey(t: (key: string, opts?: { defaultValue?: string }) => string, key: string) {
  const slug = dateKeySlug(key);
  return t(`jobDetail.dates.${slug}`, { defaultValue: key });
}

export function translateFeeKey(t: (key: string, opts?: { defaultValue?: string }) => string, key: string) {
  const slug = dateKeySlug(key);
  return t(`jobDetail.fee.${slug}`, { defaultValue: key });
}

const SECTION_HEADING_RULES: Array<[RegExp, string]> = [
  [/important\s*dates?/i, "jobDetail.importantDates"],
  [/eligibility/i, "jobDetail.eligibilityDetails"],
  [/how\s*to\s*apply/i, "jobDetail.howToApply"],
  [/selection\s*process/i, "jobDetail.selectionProcess"],
  [/application\s*fee|exam\s*fee|registration\s*fee/i, "jobDetail.applicationFee"],
  [/vacancy|vacancies/i, "jobDetail.vacancyDetails"],
  [/overview|introduction/i, "jobDetail.overview"],
  [/syllabus/i, "jobDetail.syllabus"],
  [/age\s*limit|age\s*relaxation/i, "jobDetail.ageLimit"],
  [/qualification|educational/i, "jobDetail.qualification"],
  [/salary|pay\s*scale|emoluments/i, "jobDetail.salary"],
  [/about\s*this/i, "jobDetail.aboutRecruitment"],
];

export function translateSectionHeading(
  t: (key: string, opts?: { defaultValue?: string }) => string,
  heading: string
) {
  const raw = String(heading || "").trim();
  if (!raw) return "";
  for (const [pattern, key] of SECTION_HEADING_RULES) {
    if (pattern.test(raw)) return t(key, { defaultValue: raw });
  }
  return raw;
}

const FACT_LABEL_RULES: Array<[RegExp, string]> = [
  [/^post\s*name$/i, "jobDetail.postName"],
  [/^qualification$/i, "jobDetail.qualification"],
  [/^age\s*limit$/i, "jobDetail.ageLimit"],
  [/^salary$/i, "jobDetail.salary"],
  [/^apply\s*mode$/i, "jobDetail.applyMode"],
  [/^total\s*posts?$/i, "jobDetail.totalPosts"],
  [/^organization|company\s*name$/i, "jobDetail.recruitingBody"],
];

export function translateFactLabel(
  t: (key: string, opts?: { defaultValue?: string }) => string,
  label: string
) {
  const raw = String(label || "").trim();
  if (!raw) return "";
  for (const [pattern, key] of FACT_LABEL_RULES) {
    if (pattern.test(raw)) return t(key, { defaultValue: raw });
  }
  return raw;
}
