import { appBuildStamp, formatBuildStampForDisplay } from '@/lib/buildStamp'

/** Tiny footer line to confirm which production bundle is live. */
export default function BuildStamp() {
  if (!import.meta.env.PROD) return null
  const stamp = appBuildStamp()
  if (!stamp) return null

  return (
    <span className="build-stamp" title={`Build ${stamp}`}>
      Updated {formatBuildStampForDisplay(stamp)}
    </span>
  )
}
