/** Public site URLs — override via VITE_* env on Vercel. */

const trim = (value: string | undefined) => (value || "").trim();

export const SITE_ORIGIN =
  trim(import.meta.env.VITE_SITE_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "https://livegovtjobs.com");

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
