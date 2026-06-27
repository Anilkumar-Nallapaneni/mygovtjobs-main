/** @vitest-environment happy-dom */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import Navbar from '@/components/layout/Navbar'

function renderNavbar(overrides: Partial<Parameters<typeof Navbar>[0]> = {}) {
  const onNavigate = vi.fn()
  const onSearch = vi.fn()
  const setSearch = vi.fn()
  render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <Navbar
          view="home"
          onNavigate={onNavigate}
          search=""
          setSearch={setSearch}
          onSearch={onSearch}
          {...overrides}
        />
      </I18nextProvider>
    </MemoryRouter>
  )
  return { onNavigate, onSearch, setSearch }
}

describe('Navbar', () => {
  afterEach(() => {
    cleanup()
  })

  it('marks active nav item with aria-current', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <I18nextProvider i18n={i18n}>
          <Navbar view="home" search="" setSearch={vi.fn()} />
        </I18nextProvider>
      </MemoryRouter>,
    )
    const navbar = screen.getByRole('navigation')
    const desktopNav = navbar.querySelector('.navbar__nav--desktop')
    const home = desktopNav!.querySelector('button.navbar__nav-btn')
    expect(home?.getAttribute('aria-current')).toBe('page')
  })

  it('does not render Jobs in desktop nav', () => {
    renderNavbar()
    const navbar = screen.getByRole('navigation')
    const desktopNav = navbar.querySelector('.navbar__nav--desktop')
    expect(desktopNav?.textContent).not.toMatch(/\bJobs\b/)
  })

  it('marks only Explore active on explore hub', () => {
    render(
      <MemoryRouter initialEntries={['/explore']}>
        <I18nextProvider i18n={i18n}>
          <Navbar view="home" search="" setSearch={vi.fn()} />
        </I18nextProvider>
      </MemoryRouter>,
    )
    const navbar = screen.getByRole('navigation')
    const desktopNav = navbar.querySelector('.navbar__nav--desktop')
    expect(desktopNav).toBeTruthy()
    const home = desktopNav!.querySelector('button.navbar__nav-btn')
    const explore = desktopNav!.querySelector('a[href="/explore"]')
    expect(home?.getAttribute('aria-current')).toBeNull()
    expect(explore?.getAttribute('aria-current')).toBe('page')
  })

  it('renders Latest link to notifications table', () => {
    renderNavbar({ view: 'latest-notifications' })
    const latestLinks = screen.getAllByRole('link', { name: /^Latest$/i })
    const active = latestLinks.find((el) => el.getAttribute('aria-current') === 'page')
    expect(active).toBeTruthy()
    expect(active?.getAttribute('href')).toBe('/jobs/latest-notifications')
  })

  it('renders search input', () => {
    renderNavbar()
    const inputs = document.querySelectorAll('.navbar__search-input')
    expect(inputs.length).toBeGreaterThan(0)
  })
})
