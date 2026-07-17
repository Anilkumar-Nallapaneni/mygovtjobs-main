import { describe, expect, it } from 'vitest'
import { jobDetailsPublicUrl } from '@/utils/jobDetailsStorage'

describe('jobDetailsPublicUrl', () => {
  it('builds public storage URL when Supabase is configured', () => {
    const url = jobDetailsPublicUrl('ssc-cgl-2026')
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('your-project')) {
      expect(url).toContain('/storage/v1/object/public/job-details/')
      expect(url).toContain('ssc-cgl-2026.json')
    } else {
      expect(url).toBeNull()
    }
  })
})
