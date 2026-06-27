/** ISO timestamp injected at production build time (vite `define`). */
export function appBuildStamp(): string | null {
  const raw = import.meta.env.VITE_BUILD_STAMP
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

export function formatBuildStampForDisplay(stamp: string, locale = 'en-IN'): string {
  const date = new Date(stamp)
  if (Number.isNaN(date.getTime())) return stamp
  return date.toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  })
}
