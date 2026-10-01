/** @vitest-environment happy-dom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import Footer from '@/components/layout/Footer'
import { CONTENT_HUB_LINKS } from '@/data/contentHubLinks'

afterEach(() => cleanup())

describe('Footer hub links', () => {
  it('links every content hub route', () => {
    render(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <Footer />
        </I18nextProvider>
      </MemoryRouter>,
    )
    for (const link of CONTENT_HUB_LINKS) {
      const matches = screen.getAllByRole('link', { name: link.labelDefault })
      expect(matches.some((el) => el.getAttribute('href') === link.href)).toBe(true)
    }
  })
})
