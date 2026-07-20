import { ReactNode } from 'react'
import ErrorBoundary from '@/components/ErrorBoundary'

type Props = {
  children: ReactNode
  /** Shown in dev error detail — e.g. "Home page" */
  label?: string
  onRetry?: () => void
}

/** @deprecated Prefer `ErrorBoundary` with `level="route"` — thin wrapper for existing call sites. */
export default function RouteErrorBoundary({ children, label, onRetry }: Props) {
  return (
    <ErrorBoundary level="route" label={label} onRetry={onRetry}>
      {children}
    </ErrorBoundary>
  )
}
