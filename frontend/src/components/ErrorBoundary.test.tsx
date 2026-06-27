/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '@/components/ErrorBoundary'

function Boom(): null {
  throw new Error('test boom')
}

describe('ErrorBoundary', () => {
  it('renders fallback when child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByRole('heading')).toBeTruthy()
    spy.mockRestore()
  })
})
