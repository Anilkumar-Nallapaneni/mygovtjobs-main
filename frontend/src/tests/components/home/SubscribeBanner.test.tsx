/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import SubscribeBanner from '@/components/home/SubscribeBanner'

describe('SubscribeBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('appears after delay on home path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <I18nextProvider i18n={i18n}>
          <SubscribeBanner />
        </I18nextProvider>
      </MemoryRouter>
    )

    expect(screen.queryByRole('dialog')).toBeNull()

    act(() => {
      vi.advanceTimersByTime(8000)
    })

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/daily govt jobs alerts/i)).toBeTruthy()
  })

  it('dismiss stores preference', () => {
    render(
      <MemoryRouter initialEntries={['/jobs']}>
        <I18nextProvider i18n={i18n}>
          <SubscribeBanner />
        </I18nextProvider>
      </MemoryRouter>
    )

    act(() => {
      vi.advanceTimersByTime(8000)
    })

    const dismissButtons = screen.getAllByRole('button', { name: /not now/i })
    fireEvent.click(dismissButtons[0])
    expect(localStorage.getItem('mygovtjobs-subscribe-dismissed')).toBeTruthy()
  })
})
