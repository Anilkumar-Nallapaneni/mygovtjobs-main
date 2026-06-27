import type { CSSProperties } from 'react'
import TrackedLink from '@/components/TrackedLink'

type HubCardProps = {
  id: string
  href: string
  icon: string
  title: string
  description: string
  stat?: string
  accent?: string
}

export default function HubCard({ id, href, icon, title, description, stat, accent }: HubCardProps) {
  return (
    <TrackedLink
      to={href}
      trackId={id}
      trackSource="hub"
      trackLabel={title}
      className="hub-card"
      style={accent ? ({ '--hub-card-accent': accent } as CSSProperties) : undefined}
    >
      <div className="hub-card__icon" aria-hidden>
        {icon}
      </div>
      <div className="hub-card__body">
        <h2 className="hub-card__title">{title}</h2>
        <p className="hub-card__desc">{description}</p>
        {stat ? <span className="hub-card__stat">{stat}</span> : null}
      </div>
      <span className="hub-card__arrow" aria-hidden>
        →
      </span>
    </TrackedLink>
  )
}
