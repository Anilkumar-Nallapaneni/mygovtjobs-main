/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTranslatedText } from './useTranslatedText'

vi.mock('@/utils/jobContentTranslate', () => ({
  needsEnglishNormalization: vi.fn((text: string) => text.includes('हिंदी')),
  getCachedEnglishNormalization: vi.fn(() => null),
  normalizeToEnglish: vi.fn(async (text: string) => `EN:${text}`),
}))

describe('useTranslatedText', () => {
  it('returns plain text unchanged', () => {
    const { result } = renderHook(() => useTranslatedText('SSC Recruitment'))
    expect(result.current).toBe('SSC Recruitment')
  })

  it('normalizes text that needs English conversion', async () => {
    const { result } = renderHook(() => useTranslatedText('हिंदी notice'))

    await waitFor(() => expect(result.current).toBe('EN:हिंदी notice'))
  })
})
