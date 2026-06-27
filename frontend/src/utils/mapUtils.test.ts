/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchSVGContent,
  normalizeIndiaMapSvg,
  prepareResponsiveSvgMarkup,
  resetMapSvgCacheForTests,
  fitSvgViewBoxToPath,
  fitSvgViewBoxToContent,
  setIndiaMapPathVisibility,
  resetIndiaMapToFullView,
  INDIA_MAP_VIEWBOX,
} from './mapUtils'

describe('prepareResponsiveSvgMarkup', () => {
  it('strips width and height from svg root', () => {
    const input = '<svg width="800" height="600" viewBox="0 0 800 600"><path d="M0 0"/></svg>'
    expect(prepareResponsiveSvgMarkup(input)).toBe(
      '<svg viewBox="0 0 800 600"><path d="M0 0"/></svg>',
    )
  })

  it('returns non-svg text unchanged', () => {
    expect(prepareResponsiveSvgMarkup('not an svg')).toBe('not an svg')
  })
})

describe('normalizeIndiaMapSvg', () => {
  it('no-ops when root is null', () => {
    expect(() => normalizeIndiaMapSvg(null)).not.toThrow()
  })

  it('derives viewBox from width/height and makes svg responsive', () => {
    const root = document.createElement('div')
    root.innerHTML = '<svg width="400" height="200"><path d="M0 0"/></svg>'
    normalizeIndiaMapSvg(root)

    const svg = root.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 400 200')
    expect(svg.getAttribute('width')).toBeNull()
    expect(svg.getAttribute('height')).toBeNull()
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet')
    expect(svg.style.width).toBe('100%')
    expect(svg.style.height).toBe('auto')
  })
})

describe('fetchSVGContent', () => {
  beforeEach(() => {
    resetMapSvgCacheForTests()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    resetMapSvgCacheForTests()
    vi.unstubAllGlobals()
  })

  it('returns cached markup on subsequent calls', async () => {
    const svg = '<svg viewBox="0 0 10 10"><path d="M0 0"/></svg>'
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => svg,
    } as Response)

    const first = await fetchSVGContent()
    const second = await fetchSVGContent()

    expect(first).toContain('<path')
    expect(second).toBe(first)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns empty string when fetch fails', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)
    await expect(fetchSVGContent()).resolves.toBe('')
  })
})

describe('state isolation helpers', () => {
  it('hides all paths except the focused state', () => {
    const root = document.createElement('div')
    root.innerHTML =
      '<svg><path id="IN-MH" d="M0 0"/><path id="IN-KA" d="M1 1"/></svg>'
    setIndiaMapPathVisibility(root, 'IN-MH')
    expect((root.querySelector('#IN-MH') as SVGPathElement).style.display).toBe('')
    expect((root.querySelector('#IN-KA') as SVGPathElement).style.display).toBe('none')
    setIndiaMapPathVisibility(root, null)
    expect((root.querySelector('#IN-KA') as SVGPathElement).style.display).toBe('')
  })

  it('fits viewBox to a single path bbox', () => {
    const root = document.createElement('div')
    root.innerHTML = '<svg viewBox="0 0 100 100"><path id="IN-MH" d="M10 10 H 40 V 40 H 10 Z"/></svg>'
    const svg = root.querySelector('svg') as SVGSVGElement
    const path = root.querySelector('#IN-MH') as SVGPathElement
    fitSvgViewBoxToPath(svg, path, 0.1)
    expect(svg.getAttribute('viewBox')).not.toBe('0 0 100 100')
  })

  it('fits viewBox to union of multiple paths', () => {
    const root = document.createElement('div')
    root.innerHTML =
      '<svg viewBox="0 0 200 200"><path d="M10 10 H 30 V 30 H 10 Z"/><path d="M80 60 H 120 V 100 H 80 Z"/></svg>'
    fitSvgViewBoxToContent(root, 0.05)
    const svg = root.querySelector('svg') as SVGSVGElement
    const vb = svg.getAttribute('viewBox')!.split(/\s+/).map(Number)
    expect(vb[0]).toBeLessThan(10)
    expect(vb[1]).toBeLessThan(10)
    expect(vb[0] + vb[2]).toBeGreaterThan(120)
    expect(vb[1] + vb[3]).toBeGreaterThan(100)
  })

  it('resetIndiaMapToFullView restores all paths and default viewBox', () => {
    const root = document.createElement('div')
    root.innerHTML =
      '<svg viewBox="0 0 100 100"><path id="IN-MH" style="display:none" d="M0 0"/><path id="IN-KA" style="display:none" d="M1 1"/></svg>'
    const svg = root.querySelector('svg') as SVGSVGElement
    fitSvgViewBoxToPath(svg, root.querySelector('#IN-MH') as SVGPathElement, 0)
    resetIndiaMapToFullView(root)
    expect(svg.getAttribute('viewBox')).toBe(INDIA_MAP_VIEWBOX)
    expect((root.querySelector('#IN-MH') as SVGPathElement).style.display).toBe('')
    expect((root.querySelector('#IN-KA') as SVGPathElement).style.display).toBe('')
  })
})
