import { Link, type LinkProps } from 'react-router-dom'
import { trackClick } from '@/lib/analytics'

type TrackedLinkProps = LinkProps & {
  trackId: string
  trackSource?: string
  trackLabel?: string
}

/** React Router link that sends a GA4 site_click event before navigation. */
export default function TrackedLink({
  trackId,
  trackSource = 'link',
  trackLabel,
  onClick,
  to,
  children,
  ...rest
}: TrackedLinkProps) {
  const href = typeof to === 'string' ? to : ''

  return (
    <Link
      {...rest}
      to={to}
      onClick={(e) => {
        trackClick({ id: trackId, href, source: trackSource, label: trackLabel ?? trackId })
        onClick?.(e)
      }}
    >
      {children}
    </Link>
  )
}
