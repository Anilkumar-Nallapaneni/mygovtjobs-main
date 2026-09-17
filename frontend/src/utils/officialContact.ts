import { isOfficialRecruitmentUrl } from "@/utils/officialDomains";

const EMAIL_RE = /\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi;
const JUNK_LOCAL = /^(?:noreply|no-?reply|donotreply|do-?not-reply|webmaster|admin)$/i;
const CONSUMER_HOST = /(?:^|\.)(?:gmail|yahoo|hotmail|outlook|live|rediff|protonmail|icloud)\./i;
const PREFERRED_LOCAL = /helpdesk|help-?desk|helpline|grievance|quer(?:y|ies)|recruit|career|ssc|ibps|upsc|contact/i;
const HELPDESK_URL_RE =
  /https?:\/\/[^\s<>"']*(?:cgrs|grievance|helpdesk|helpline|facilitation|pgportal)[^\s<>"']*/gi;

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isOfficialContactEmail(email: string): boolean {
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, host] = parts;
  if (!local || !host || JUNK_LOCAL.test(local) || CONSUMER_HOST.test(`${host}.`)) return false;
  if (["gov.in", "nic.in", "ac.in", "edu.in", "res.in"].includes(host)) return true;
  return isOfficialRecruitmentUrl(`https://${host}/`);
}

function scoreEmail(email: string): number {
  const local = email.split("@")[0] || "";
  let score = 0;
  if (PREFERRED_LOCAL.test(local)) score += 40;
  if (/\.gov\.in$|\.nic\.in$/i.test(email.split("@")[1] || "")) score += 8;
  return score;
}

function collectHaystack(job: Record<string, unknown>): string {
  const detail = (job.detail && typeof job.detail === "object" ? job.detail : {}) as Record<
    string,
    unknown
  >;
  const chunks = [
    cleanText(job.email),
    cleanText(detail.helpdesk_email),
    cleanText(detail.email),
    cleanText(detail.summary),
    cleanText(job.about),
  ];
  const stored = detail.helpdesk_emails;
  if (Array.isArray(stored)) chunks.push(...stored.map((item) => cleanText(item)));
  return chunks.join(" ");
}

/** Official department helpdesk emails printed on the notification (not candidate inboxes). */
export function extractOfficialHelpdeskEmails(
  job: Record<string, unknown> | null | undefined
): string[] {
  if (!job) return [];
  const found = new Set<string>();
  for (const match of collectHaystack(job).matchAll(EMAIL_RE)) {
    const email = String(match[1] || "").toLowerCase();
    if (isOfficialContactEmail(email)) found.add(email);
  }
  return [...found].sort((a, b) => scoreEmail(b) - scoreEmail(a)).slice(0, 5);
}

/** Grievance / CGRS / helpdesk portal when the board does not print a public email. */
export function extractOfficialHelpdeskUrl(
  job: Record<string, unknown> | null | undefined
): string | null {
  if (!job) return null;
  const detail = (job.detail && typeof job.detail === "object" ? job.detail : {}) as Record<
    string,
    unknown
  >;
  const stored = cleanText(detail.helpdesk_url);
  if (stored && isOfficialRecruitmentUrl(stored)) return stored;
  const hay = collectHaystack(job);
  for (const match of hay.matchAll(HELPDESK_URL_RE)) {
    const url = String(match[0] || "").replace(/[),.;]+$/, "");
    if (isOfficialRecruitmentUrl(url)) return url;
  }
  return null;
}
