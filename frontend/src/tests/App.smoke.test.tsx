/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import App from '@/App'

vi.mock('@/hooks/useLiveJobs', () => ({
  useLiveJobs: () => ({
    jobs: [],
    liveRows: [],
    source: 'static',
    sources: ['static'],
    loading: false,
    refreshing: false,
    error: null,
    liveCount: 0,
    catalogStats: null,
    hasBackend: false,
    refresh: vi.fn(),
    dailySyncMeta: null,
    syncStatus: null,
    dailySyncOnly: false,
  }),
}))

vi.mock('@/lib/officialFeed', () => ({
  loadOfficialFeed: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/hooks/useOfficialFeed', () => ({
  useOfficialFeed: () => ({ items: [], loading: false, error: null }),
}))

vi.mock('@/components/layout/EmploymentNewsBar', () => ({
  default: () => null,
}))

vi.mock('@/components/home/HomePage', () => ({
  default: () => <div data-testid="home-page">Home</div>,
}))

describe('App smoke', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'bw'),
      setItem: vi.fn(),
    })
  })

  it('renders shell with skip link and main landmark', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </I18nextProvider>
    )

    expect(screen.getByRole('link', { name: /skip/i })).toBeTruthy()
    expect(document.getElementById('main-content')).toBeTruthy()
  })
})
