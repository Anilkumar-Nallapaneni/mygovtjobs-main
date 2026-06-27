import { useEffect, useState } from 'react'
import { getCachedEnglishNormalization, normalizeToEnglish, needsEnglishNormalization } from '@/utils/jobContentTranslate'

/** Normalize job-related text to English (canonical original language). */
export function useTranslatedText(text: string): string {
  const [value, setValue] = useState(text)

  useEffect(() => {
    const source = String(text || '').trim()
    if (!source || !needsEnglishNormalization(source)) {
      setValue(source)
      return
    }

    const cached = getCachedEnglishNormalization(source)
    if (cached) {
      setValue(cached)
      return
    }

    setValue(source)
    let cancelled = false
    normalizeToEnglish(source).then((english) => {
      if (!cancelled) setValue(english)
    })
    return () => {
      cancelled = true
    }
  }, [text])

  return value
}
