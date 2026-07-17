import { describe, expect, it } from 'vitest'
import { collectPdfUrls, looksLikeNotificationDocument, resolvePdfUrl } from '@/utils/resolvePdfUrl'

describe('looksLikeNotificationDocument', () => {
  it('detects .pdf URLs', () => {
    expect(looksLikeNotificationDocument('https://ssc.gov.in/files/notice.pdf')).toBe(true)
  })

  it('detects ViewPdf.aspx viewers', () => {
    expect(looksLikeNotificationDocument('https://upsc.gov.in/ViewPdf.aspx?id=1')).toBe(true)
  })

  it('rejects plain homepage URLs', () => {
    expect(looksLikeNotificationDocument('https://ssc.gov.in/')).toBe(false)
  })
})

describe('collectPdfUrls / resolvePdfUrl', () => {
  it('prefers row.pdf_url when official', () => {
    const row = {
      pdf_url: 'https://ssc.gov.in/notice.pdf',
      detail: { pdf_url: 'https://ssc.gov.in/other.pdf' },
    }
    expect(resolvePdfUrl(row)).toBe('https://ssc.gov.in/notice.pdf')
    expect(collectPdfUrls(row)).toContain('https://ssc.gov.in/notice.pdf')
  })

  it('reads detail.pdf_urls arrays', () => {
    const row = {
      detail: {
        pdf_urls: ['https://rrb.gov.in/advt.pdf', 'https://rrb.gov.in/advt.pdf'],
      },
    }
    expect(collectPdfUrls(row)).toEqual(['https://rrb.gov.in/advt.pdf'])
    expect(resolvePdfUrl(row)).toBe('https://rrb.gov.in/advt.pdf')
  })

  it('uses apply_url when it looks like a PDF', () => {
    const row = {
      apply_url: 'https://ncs.gov.in/uploads/notification.pdf',
    }
    expect(resolvePdfUrl(row)).toBe('https://ncs.gov.in/uploads/notification.pdf')
  })

  it('blocks aggregator hosts', () => {
    const row = {
      pdf_url: 'https://www.sarkariresult.com/notice.pdf',
      detail: { pdf_url: 'https://ssc.gov.in/real.pdf' },
    }
    expect(collectPdfUrls(row)).toEqual(['https://ssc.gov.in/real.pdf'])
    expect(resolvePdfUrl(row)).toBe('https://ssc.gov.in/real.pdf')
  })

  it('returns empty string when nothing usable', () => {
    expect(resolvePdfUrl({})).toBe('')
    expect(resolvePdfUrl(null)).toBe('')
  })
})
