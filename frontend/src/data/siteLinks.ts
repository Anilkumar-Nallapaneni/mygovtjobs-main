/** Public site URLs — override via VITE_* env on Vercel. */

const trim = (value: string | undefined) => (value || "").trim();

const FALLBACK_ORIGIN = "https://www.livegovtjobs.com";

/** Normalize apex hosts to www so canonical URLs stay consistent per brand. */
function normalizeOrigin(origin: string): string {
  const o = origin.replace(/\/$/, "");
  if (o === "https://govtjobs.me") return "https://www.govtjobs.me";
  if (o === "https://livegovtjobs.com") return "https://www.livegovtjobs.com";
  return o;
}

/**
 * Host-aware site origin so both brands work on one Vercel project:
 * - www.govtjobs.me
 * - www.livegovtjobs.com
 *
 * Prefer the current browser host; fall back to VITE_SITE_URL for prerender/build.
 */
export function getSiteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeOrigin(window.location.origin);
  }
  return normalizeOrigin(trim(import.meta.env.VITE_SITE_URL) || FALLBACK_ORIGIN);
}

/** @deprecated Prefer getSiteOrigin() inside functions — value is fixed at module load. */
export const SITE_ORIGIN = getSiteOrigin();

export const SITE_LINKS = {
  about: "/about",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/terms",
  disclaimer: "/disclaimer",
  advertise: "/alerts",
  social: {
    telegram: trim(import.meta.env.VITE_SOCIAL_TELEGRAM_URL) || "https://t.me/MyGovtJobs",
    youtube: trim(import.meta.env.VITE_SOCIAL_YOUTUBE_URL) || "https://www.youtube.com/@MyGovtJobs",
    x: trim(import.meta.env.VITE_SOCIAL_X_URL) || "https://x.com/MyGovtJobs",
    instagram: trim(import.meta.env.VITE_SOCIAL_INSTAGRAM_URL) || "https://www.instagram.com/mygovtjobs",
  },
} as const;

export const SOCIAL_LINKS = [
  { id: "telegram", label: "Telegram", href: SITE_LINKS.social.telegram },
  { id: "youtube", label: "YouTube", href: SITE_LINKS.social.youtube },
  { id: "x", label: "X", href: SITE_LINKS.social.x },
  { id: "instagram", label: "Instagram", href: SITE_LINKS.social.instagram },
] as const;
