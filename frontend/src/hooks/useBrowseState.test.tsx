/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useBrowseState } from '@/hooks/useBrowseState'

let currentPathname = '/'
let currentSearch = ''

function LocationProbe() {
  const loc = useLocation()
  useEffect(() => {
    currentPathname = loc.pathname
    currentSearch = loc.search
  }, [loc.pathname, loc.search])
  return null
}

function wrapper(initialPath: string) {
  return function BrowseWrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <LocationProbe />
        {children}
      </MemoryRouter>
    )
  }
}

describe('useBrowseState', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
  })

  it('syncs filters from /state/up browse URL', () => {
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/state/up'),
    })

    expect(result.current.selectedState).toBe('up')
    expect(result.current.view).toBe('jobs')
    expect(result.current.activeCat).toBeNull()
  })

  it('marks job detail routes as jobs view for navbar', () => {
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/jobs/ssc-cgl-2026-abc123'),
    })

    expect(result.current.isJobDetailRoute).toBe(true)
    expect(result.current.view).toBe('jobs')
  })

  it('reads filter and sort from URL query', () => {
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/jobs?filter=graduate&sort=vacancies'),
    })

    expect(result.current.quickFilter).toBe('graduate')
    expect(result.current.sort).toBe('vacancies')
  })

  it('clears search via clearSearch', () => {
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/jobs'),
    })

    act(() => {
      result.current.setSearchInput('railway')
    })
    act(() => {
      result.current.handleSearch()
    })
    expect(result.current.search).toBe('railway')

    act(() => {
      result.current.clearSearch()
    })
    expect(result.current.search).toBe('')
    expect(result.current.searchInput).toBe('')
  })

  it('navigates to / when Home is selected from a state browse URL', () => {
    currentPathname = '/state/up'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/state/up'),
    })

    expect(result.current.selectedState).toBe('up')
    expect(currentPathname).toBe('/state/up')

    act(() => {
      result.current.handleNavigate('home')
    })

    expect(currentPathname).toBe('/')
    expect(result.current.selectedState).toBeNull()
    expect(result.current.view).toBe('home')
  })

  it('navigates to admit-card hub and syncs headlines topic', () => {
    currentPathname = '/'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/'),
    })

    act(() => {
      result.current.handleNavigate('admit-card')
    })

    expect(currentPathname).toBe('/results/admit-card')
    expect(result.current.view).toBe('admit-card')
    expect(result.current.isResultsHubRoute).toBe(true)
    expect(result.current.headlinesTopicKey).toBe('admit-card')
  })

  it('syncs results hub filters from URL query', () => {
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/results/admit-card?state=ka&cat=ssc'),
    })

    expect(result.current.selectedState).toBe('ka')
    expect(result.current.activeCat).toBe('ssc')
    expect(result.current.headlinesTopicKey).toBe('admit-card')
  })

  it('updates results hub URL when state chip toggles', () => {
    currentPathname = '/results/admit-card'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/results/admit-card'),
    })

    act(() => {
      result.current.handleResultsHubStateSelect('ka')
    })

    expect(currentPathname).toBe('/results/admit-card')
    expect(currentSearch).toBe('?state=ka')
    expect(result.current.selectedState).toBe('ka')
  })

  it('navigateToQualification stays on browse URL when quick filter is cleared', () => {
    currentPathname = '/'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/'),
    })

    act(() => {
      result.current.navigateToQualification('graduate')
    })

    expect(currentPathname).toBe('/qualification/graduate')
    expect(result.current.qualificationSlug).toBe('graduate')

    act(() => {
      result.current.setQuickFilter(null)
    })

    expect(currentPathname).toBe('/qualification/graduate')
    expect(result.current.qualificationSlug).toBe('graduate')
    expect(result.current.quickFilter).toBeNull()
  })

  it('navigateToProfession opens profession landing URL', () => {
    currentPathname = '/'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/'),
    })

    act(() => {
      result.current.navigateToProfession('engineering')
    })

    expect(currentPathname).toBe('/profession/engineering')
    expect(result.current.professionSlug).toBe('engineering')
  })

  it('handleCategorySelect navigates to category browse URL and stays on clear quick filter', () => {
    currentPathname = '/'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/'),
    })

    act(() => {
      result.current.handleCategorySelect('upsc')
    })

    expect(currentPathname).toBe('/category/upsc')
    expect(result.current.activeCat).toBe('upsc')

    act(() => {
      result.current.setQuickFilter(null)
    })

    expect(currentPathname).toBe('/category/upsc')
    expect(result.current.activeCat).toBe('upsc')
  })

  it('setQuickFilter(null) stays on state browse URL', () => {
    currentPathname = '/state/dl'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/state/dl?filter=graduate'),
    })

    expect(result.current.selectedState).toBe('dl')
    expect(result.current.quickFilter).toBe('graduate')

    act(() => {
      result.current.setQuickFilter(null)
    })

    expect(currentPathname).toBe('/state/dl')
    expect(result.current.selectedState).toBe('dl')
    expect(result.current.quickFilter).toBeNull()
  })

  it('handleCategorySelect does not toggle off when chip matches stale activeCat on home', () => {
    currentPathname = '/'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/'),
    })

    act(() => {
      result.current.handleCategorySelect('upsc')
    })
    expect(currentPathname).toBe('/category/upsc')

    act(() => {
      result.current.handleNavigate('home')
    })
    expect(currentPathname).toBe('/')

    act(() => {
      result.current.handleCategorySelect('upsc')
    })
    expect(currentPathname).toBe('/category/upsc')
    expect(result.current.activeCat).toBe('upsc')
  })

  it('handleStateSelect navigates to state browse URL without clearing state', () => {
    currentPathname = '/'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/'),
    })

    act(() => {
      result.current.handleStateSelect('jk')
    })

    expect(currentPathname).toBe('/state/jk')
    expect(result.current.selectedState).toBe('jk')
    expect(result.current.search).toBe('')
  })

  it('handleAllIndiaBrowse navigates to all-india jobs path', () => {
    currentPathname = '/state/up'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/state/up'),
    })

    act(() => {
      result.current.handleAllIndiaBrowse()
    })

    expect(currentPathname).toBe('/jobs/all-india')
    expect(result.current.selectedState).toBeNull()
  })

  it('navigateToOrg opens organization landing URL', () => {
    currentPathname = '/'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/'),
    })

    act(() => {
      result.current.navigateToOrg('bhabha-atomic-research-centre-barc')
    })

    expect(currentPathname).toBe('/org/bhabha-atomic-research-centre-barc')
    expect(result.current.orgSlug).toBe('bhabha-atomic-research-centre-barc')
  })

  it('handleNavigate jobs opens /jobs with current sort', () => {
    currentPathname = '/'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/?sort=vacancies'),
    })

    act(() => {
      result.current.handleNavigate('jobs')
    })

    expect(currentPathname).toBe('/jobs')
    expect(currentSearch).toContain('sort=vacancies')
  })

  it('handleNavigate results opens sarkari result hub', () => {
    currentPathname = '/'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/'),
    })

    act(() => {
      result.current.handleNavigate('results')
    })

    expect(currentPathname).toBe('/results')
    expect(result.current.headlinesTopicKey).toBe('sarkari-result')
  })

  it('handleNavigate alert opens alerts browse path', () => {
    currentPathname = '/'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/'),
    })

    act(() => {
      result.current.handleNavigate('alert')
    })

    expect(currentPathname).toBe('/alerts')
    expect(result.current.view).toBe('alert')
  })

  it('handleFooterLink navigates to latest notifications', () => {
    currentPathname = '/'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/'),
    })

    act(() => {
      result.current.handleFooterLink({ view: 'latest-notifications' })
    })

    expect(currentPathname).toBe('/jobs/latest-notifications')
  })

  it('handleFooterLink navigates to state browse from footer target', () => {
    currentPathname = '/'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/'),
    })

    act(() => {
      result.current.handleFooterLink({ state: 'tn', category: 'teaching' })
    })

    expect(currentPathname).toBe('/state/tn')
  })

  it('handleResultsHubCategorySelect toggles category in URL', () => {
    currentPathname = '/results/admit-card'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/results/admit-card'),
    })

    act(() => {
      result.current.handleResultsHubCategorySelect('ssc')
    })

    expect(currentSearch).toBe('?cat=ssc')
    expect(result.current.activeCat).toBe('ssc')

    act(() => {
      result.current.handleResultsHubCategorySelect('ssc')
    })

    expect(currentSearch).toBe('')
    expect(result.current.activeCat).toBeNull()
  })

  it('setSort updates URL on browse routes', () => {
    currentPathname = '/jobs'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/jobs'),
    })

    act(() => {
      result.current.setSort('vacancies')
    })

    expect(result.current.sort).toBe('vacancies')
    expect(currentSearch).toContain('sort=vacancies')
  })

  it('handleBrowseJobs navigates to /jobs preserving filters', () => {
    currentPathname = '/'
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/?filter=graduate'),
    })

    act(() => {
      result.current.handleBrowseJobs()
    })

    expect(currentPathname).toBe('/jobs')
    expect(currentSearch).toContain('filter=graduate')
  })

  it('marks latest notifications route', () => {
    const { result } = renderHook(() => useBrowseState(), {
      wrapper: wrapper('/jobs/latest-notifications'),
    })

    expect(result.current.isLatestNotificationsRoute).toBe(true)
    expect(result.current.view).toBe('latest-notifications')
  })
})
