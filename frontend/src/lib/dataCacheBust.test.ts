import { describe, expect, it } from 'vitest'
import { appDeployVersion, dataJsonUrl } from '@/lib/dataCacheBust'

describe('dataCacheBust', () => {
  it('appends deploy version to data JSON paths', () => {
    const url = dataJsonUrl('/data/live-jobs-list.json')
    expect(url).toMatch(/^\/data\/live-jobs-list\.json\?v=/)
    expect(url).toContain(encodeURIComponent(appDeployVersion()))
  })

  it('preserves existing query strings', () => {
    const url = dataJsonUrl('/data/foo.json?x=1')
    expect(url).toContain('?x=1&v=')
  })
})
