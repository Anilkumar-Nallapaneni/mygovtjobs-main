/** Infer education level from notification title / summary for display + filtering. */

const QUAL_RULES = [
  {
    key: 'tenth',
    label: '10th Pass',
    re: /\b10th\b|10\s*th\b|class\s*10|matriculation|matric\b|sslc\b/i,
  },
  {
    key: 'twelfth',
    label: '12th Pass',
    re: /\b12th\b|10\s*\+\s*2|intermediate|10\+2|hsc\b|senior secondary|puc\b/i,
  },
  {
    key: 'engineering',
    label: 'Engineering (B.Tech/B.E.)',
    re: /engineer(?:ing)?|b\.?\s*tech|b\.?\s*e\.|m\.?\s*tech|diploma\s*\(?\s*eng|gate\b|civil engineer|electrical engineer|mechanical engineer/i,
  },
  {
    key: 'graduate',
    label: 'Graduate / Degree',
    re:
      /graduate|graduation|any\s+degree|bachelor|b\.?\s*a\.?|b\.?\s*sc|b\.?\s*com|b\.?\s*ed|mbbs|bds\b|post\s*grad|postgraduate|\bpg\b|m\.?\s*a\.?|m\.?\s*sc|m\.?\s*com|mba\b|ph\.?\s*d|administrative officer|assistant professor|associate professor|professor|scientist|officer grade|legal adviser|veterinary surgeon|physician|director grade|section officer|manager grade|accounts officer|deputy collector|forest range|conservator|medical officer|specialist doctor|dental officer|judicial|judge|clerk\b|assistant director|senior resident|junior resident|apprentice/i,
  },
  {
    key: 'defence',
    label: 'Defence / Armed Forces',
    re: /defen[cs]e|army|navy|air force|ndmc|ministry of defence|cds\b|cisf|capf|nda\b|naval academy|military academy/i,
  },
  {
    key: 'banking',
    label: 'Banking / Finance',
    re: /\bbank\b|ibps|sbi\b|rbi\b|probationary officer|\bpo\b exam|clerk exam|banking personnel|economist|statistical service/i,
  },
  {
    key: 'police',
    label: 'Police / Law Enforcement',
    re: /police|constable|sub[\s-]?inspector|\bsi\b|ips\b|inspector of factories|boiler inspector|prosecution/i,
  },
];

const GENERIC_QUAL = /^(as per notification|see notification|—|-)$/i;

function matchQualificationFilterKey(text) {
  const probe = String(text || '');
  if (!probe.trim()) return null;
  for (const rule of QUAL_RULES) {
    if (rule.re.test(probe)) return rule.key;
  }
  return null;
}

function extractQualificationFromText(...parts) {
  const probe = parts.filter(Boolean).join(' ');
  if (!probe.trim()) return null;
  for (const rule of QUAL_RULES) {
    if (rule.re.test(probe)) {
      return { label: rule.label, key: rule.key };
    }
  }
  return null;
}

export function resolveJobQualification(job) {
  const raw = String(job?.qual || job?.qualification || '').trim();
  if (raw && !GENERIC_QUAL.test(raw)) {
    const key = matchQualificationFilterKey(`${raw} ${job?.title || ''}`);
    return { label: raw, key };
  }

  const extracted = extractQualificationFromText(
    job?.title,
    job?.about,
    job?.detail?.summary,
    job?.dept
  );
  if (extracted) return extracted;

  return { label: null, key: null };
}
