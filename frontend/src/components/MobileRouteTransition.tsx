import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/** Subtle page fade on mobile tab navigations (Play Store / PWA shell). */
export default function MobileRouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="mobile-route-transition">
      {children}
    </div>
  )
}
