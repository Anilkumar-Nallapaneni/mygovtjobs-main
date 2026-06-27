import { appBuildStamp } from '@/lib/buildStamp'

const BUILD_STORAGE_KEY = 'mygovtjobs-app-build'

/** Version token baked into each production bundle — changes every deploy. */
export function appDeployVersion(): string {
  return appBuildStamp() || 'dev'
}

/** Append deploy version so browsers/CDN fetch fresh JSON after each release. */
export function dataJsonUrl(path: string): string {
  const version = appDeployVersion()
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}v=${encodeURIComponent(version)}`
}

/** True when a returning visitor loads a newer production bundle than last visit. */
export function checkDeployVersionChanged(): boolean {
  if (typeof window === 'undefined') return false
  const current = appDeployVersion()
  let previous: string | null = null
  try {
    previous = localStorage.getItem(BUILD_STORAGE_KEY)
  } catch {
    /* private mode */
  }
  try {
    localStorage.setItem(BUILD_STORAGE_KEY, current)
  } catch {
    /* private mode */
  }
  return previous !== null && previous !== current
}

/** Drop service-worker caches after a new deploy so mobile PWAs fetch fresh assets/data. */
export async function clearServiceWorkerDataCaches(): Promise<void> {
  if (typeof caches === 'undefined') return
  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))
}
