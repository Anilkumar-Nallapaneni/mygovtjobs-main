import { createContext, useContext, type ReactNode } from 'react'
import { useBrowseState, type BrowseState } from '@/hooks/useBrowseState'

const BrowseContext = createContext<BrowseState | null>(null)

export function BrowseProvider({ children }: { children: ReactNode }) {
  const value = useBrowseState()
  return <BrowseContext.Provider value={value}>{children}</BrowseContext.Provider>
}

export function useBrowseContext(): BrowseState {
  const ctx = useContext(BrowseContext)
  if (!ctx) {
    throw new Error('useBrowseContext must be used within BrowseProvider')
  }
  return ctx
}

/** Test helper — wrap HomePage tests without full router browse sync. */
export function BrowseContextOverride({
  value,
  children,
}: {
  value: BrowseState
  children: ReactNode
}) {
  return <BrowseContext.Provider value={value}>{children}</BrowseContext.Provider>
}
