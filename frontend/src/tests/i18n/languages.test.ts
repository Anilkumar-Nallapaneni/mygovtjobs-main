import { describe, expect, it } from 'vitest'
import {
  INDIAN_LANGUAGES,
  SELECTOR_HIDDEN_LOCALES,
  SELECTOR_LANGUAGES,
  isSelectorLanguage,
  normalizeLanguageCode,
  selectorLanguageCode,
} from '@/i18n/languages'

describe('SELECTOR_LANGUAGES', () => {
  it('hides incomplete locales from the UI selector', () => {
    for (const code of SELECTOR_HIDDEN_LOCALES) {
      expect(SELECTOR_LANGUAGES.some((lang) => lang.code === code)).toBe(false)
      expect(INDIAN_LANGUAGES.some((lang) => lang.code === code)).toBe(true)
    }
  })

  it('keeps English in the selector', () => {
    expect(isSelectorLanguage('en')).toBe(true)
    expect(isSelectorLanguage('brx')).toBe(false)
  })
})

describe('selectorLanguageCode', () => {
  it('normalizes regional codes to selector entries', () => {
    expect(normalizeLanguageCode('en-IN')).toBe('en')
    expect(selectorLanguageCode('en-IN')).toBe('en')
    expect(selectorLanguageCode('kn')).toBe('kn')
  })

  it('maps hidden or unknown locales to English in the selector', () => {
    expect(selectorLanguageCode('brx')).toBe('en')
    expect(selectorLanguageCode('xx')).toBe('en')
    expect(selectorLanguageCode(undefined)).toBe('en')
  })
})
