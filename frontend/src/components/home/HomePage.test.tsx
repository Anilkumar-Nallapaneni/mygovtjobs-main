/** @vitest-environment happy-dom */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import HomePage from '@/components/home/HomePage'
import { BrowseContextOverride } from '@/context/BrowseContext'
import type { BrowseState } from '@/hooks/useBrowseState'
import type { JobRecord } from '@/types/job'

vi.mock('@/hooks/useOfficialFeed', () => ({
  useOfficialFeed: () => ({ items: [], loading: false, generatedAt: null, error: null }),
}))

vi.mock('@/hooks/useOfficialArchivesBatch', () => ({
  useOfficialArchivesBatch: () => ({}),
}))

vi.mock('@/components/home/HomeDiscoveryBlock', () => ({
  default: () => (
    <div className="home-discovery-block">
      <div className="home-browse-strips" />
    </div>
  ),
}))

const mockJob: JobRecord = {
  id: '1',
  slug: 'test-recruitment-2026',
  title: 'Railway Recruitment 2026 — 1000 Posts',
  dept: 'Indian Railways',
  category: 'railway',
  stateIds: ['up'],
  vacancies: 1000,
  qual: 'Graduate',
  lastDate: '2026-12-31',
  apply_url: 'https://indianrailways.gov.in/notification.pdf',
  status: 'live',
} as JobRecord

function createMockBrowse(overrides: Partial<BrowseState> = {}): BrowseState {
  return {
    location: { pathname: '/', search: '', hash: '', state: null, key: 'default' },
    view: 'home',
    selectedState: null,
    activeCat: null,
    quickFilter: null,
    setQuickFilter: vi.fn(),
    sort: 'lastDate',
    setSort: vi.fn(),
    heroStatFilter: null,
    setHeroStatFilter: vi.fn(),
    search: '',
    searchInput: '',
    setSearchInput: vi.fn(),
    searchSubmitKey: 0,
    headlinesTopicKey: null,
    setHeadlinesTopicKey: vi.fn(),
    qualificationSlug: null,
    professionSlug: null,
    orgSlug: null,
    allIndiaBrowse: false,
    orgDept: null,
    browseLandingTitle: null,
    browseLandingDescription: null,
    isResultsHubRoute: false,
    headlinesLandingTitle: null,
    headlinesLandingDescription: null,
    isJobDetailRoute: false,
    isLatestNotificationsRoute: false,
    clearSearch: vi.fn(),
    handleSearch: vi.fn(),
    handleBrowseJobs: vi.fn(),
    handleAllIndiaBrowse: vi.fn(),
    handleStateFilter: vi.fn(),
    handleStateSelect: vi.fn(),
    handleResultsHubStateSelect: vi.fn(),
    handleResultsHubCategorySelect: vi.fn(),
    handleCategoryFilter: vi.fn(),
    handleCategorySelect: vi.fn(),
    handleNavigate: vi.fn(),
    handleFooterLink: vi.fn(),
    navigateToQualification: vi.fn(),
    navigateToProfession: vi.fn(),
    navigateToOrg: vi.fn(),
    ...overrides,
  }
}

function renderHome(browseOverrides: Partial<BrowseState> = {}, pageOverrides: Record<string, unknown> = {}) {
  const browse = createMockBrowse(browseOverrides)
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <BrowseContextOverride value={browse}>
          <HomePage
            jobs={[mockJob]}
            onJobClick={vi.fn()}
            mapStateData={[]}
            {...pageOverrides}
          />
        </BrowseContextOverride>
      </MemoryRouter>
    </I18nextProvider>
  )
}

describe('HomePage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders job card for filtered jobs', async () => {
    renderHome()
    expect((await screen.findAllByText(/Railway Recruitment/i)).length).toBeGreaterThan(0)
  })

  it('shows job skeletons while catalog loads', () => {
    const { container } = renderHome({}, { jobs: [], jobsLoading: true })
    expect(container.querySelector('.home-jobs-skeleton')).toBeTruthy()
    expect(container.querySelector('.job-card-skeleton')).toBeTruthy()
  })

  it('shows empty state when search matches nothing', () => {
    renderHome({ search: 'zzznomatchxyz' })
    expect(screen.getByText(/no jobs/i)).toBeTruthy()
  })

  it('renders discovery block below the map on home', async () => {
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.home-discovery-block')).toBeTruthy()
    })
    expect(container.querySelector('.home-browse-strips')).toBeTruthy()
  })

  it('hides home chrome on qualification landing', () => {
    const { container } = renderHome({
      qualificationSlug: 'graduate',
      browseLandingTitle: 'Graduate Government Jobs 2026',
    })
    expect(container.querySelector('.home-page-main--landing')).toBeTruthy()
    expect(container.querySelector('.home-discovery-block')).toBeNull()
    expect(container.querySelector('#india-map-panel')).toBeNull()
    expect(container.querySelector('.browse-landing__title')).toBeTruthy()
  })

  it('renders profession landing H1 with live listing count', async () => {
    const medicalJob: JobRecord = {
      ...mockJob,
      id: 'med-1',
      title: 'AIIMS Medical Officer MBBS Recruitment',
      category: 'health',
      qual: 'MBBS',
    } as JobRecord
    renderHome(
      {
        professionSlug: 'medical',
        browseLandingTitle: 'Medical Government Jobs 2026',
        browseLandingDescription: 'Official medical recruitment.',
      },
      { jobs: [medicalJob] }
    )
    const h1 = document.querySelector('.browse-landing__title')
    expect(h1?.textContent).toMatch(/Medical Government Jobs/i)
    expect(h1?.textContent).toMatch(/1/)
    expect(screen.getByText(/Official medical recruitment/i)).toBeTruthy()
  })
})
