/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scrollToSection } from '@/utils/scrollToSection'

describe('scrollToSection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = `
      <nav class="navbar" style="height: 64px"></nav>
      <div id="main-jobs" style="height: 400px; margin-top: 1200px"></div>
      <div id="state-jobs-panel" style="display: none"></div>
    `
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })
    window.scrollTo = vi.fn()
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      const style = (el as HTMLElement).style
      return {
        display: style.display || 'block',
        visibility: style.visibility || 'visible',
      } as CSSStyleDeclaration
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 800,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('scrolls to visible target after paint delay', () => {
    scrollToSection('main-jobs')
    vi.runAllTimers()

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: expect.any(Number),
      behavior: 'smooth',
    })
    const call = vi.mocked(window.scrollTo).mock.calls[0]?.[0] as ScrollToOptions
    expect(call.top).toBeGreaterThanOrEqual(0)
  })

  it('skips hidden sections and uses next fallback', () => {
    const hidden = document.getElementById('state-jobs-panel')!
    hidden.style.display = 'block'
    hidden.getBoundingClientRect = () =>
      ({
        top: 500,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect

    scrollToSection('state-jobs-panel')
    vi.runAllTimers()

    expect(window.scrollTo).toHaveBeenCalled()
  })

  it('maps instant behavior to auto', () => {
    scrollToSection('main-jobs', { behavior: 'instant' })
    vi.runAllTimers()

    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' }),
    )
  })

  it('uses auto scroll when reduced motion is preferred', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    scrollToSection('main-jobs', { behavior: 'smooth' })
    vi.runAllTimers()

    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' }),
    )
  })
})
