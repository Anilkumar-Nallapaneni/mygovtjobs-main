/** Public site branding — single source of truth for SEO and UI copy. */

export const SITE_NAME = "Live Govt Jobs";

export const SITE_DESCRIPTION =
  "Latest government jobs, official notifications, and apply links from verified .gov.in portals across India.";

export const SITE_OG_IMAGE_PATH = "/logo.png";

export const PRIVATE_PATH_PREFIXES = ["/admin", "/account"] as const;

export function isPrivatePath(pathname: string): boolean {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  return PRIVATE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Browser tab title suffix — use for any page-level `document.title` override. */
export function pageTitle(segment: string): string {
  const trimmed = segment.trim();
  return trimmed ? `${trimmed} | ${SITE_NAME}` : SITE_NAME;
}
