import { describe, expect, it } from 'vitest'
import {
  hostnameOf,
  isAllowedOfficialJob,
  isBlockedAggregatorHost,
  isOfficialRecruitmentUrl,
  isStructuredImportSource,
  pickOfficialDetailUrl,
} from '@/utils/officialDomains'

describe('hostnameOf', () => {
  it('extracts hostname from valid URLs', () => {
    expect(hostnameOf('https://ssc.nic.in/Portal/Apply')).toBe('ssc.nic.in')
  })

  it('returns empty string for invalid URLs', () => {
    expect(hostnameOf('not-a-url')).toBe('')
  })
})

describe('isStructuredImportSource', () => {
  it('flags legacy catalog source ids', () => {
    expect(isStructuredImportSource('structured-import')).toBe(true)
    expect(isStructuredImportSource('fja-import')).toBe(true)
    expect(isStructuredImportSource('official-sites')).toBe(false)
  })
})

describe('isBlockedAggregatorHost', () => {
  it('blocks known aggregator domains', () => {
    expect(isBlockedAggregatorHost('https://www.sarkariresult.com/jobs')).toBe(true)
  })

  it('allows official government domains', () => {
    expect(isBlockedAggregatorHost('https://employmentnews.gov.in/rss.xml')).toBe(false)
    expect(isBlockedAggregatorHost('https://ssc.nic.in/')).toBe(false)
  })
})

describe('isOfficialRecruitmentUrl', () => {
  it('accepts .gov.in and .nic.in hosts', () => {
    expect(isOfficialRecruitmentUrl('https://upsc.gov.in/exams')).toBe(true)
    expect(isOfficialRecruitmentUrl('https://ssc.nic.in/')).toBe(true)
  })

  it('rejects aggregators', () => {
    expect(isOfficialRecruitmentUrl('https://www.naukri.com/job')).toBe(false)
  })

  it('rejects commercial boards from shared catalog', () => {
    expect(isBlockedAggregatorHost('https://www.indeed.com/viewjob')).toBe(true)
    expect(isOfficialRecruitmentUrl('https://www.monster.com/job')).toBe(false)
  })

  it('accepts stems present only on one former list', () => {
    expect(isOfficialRecruitmentUrl('https://apeda.gov.in/careers')).toBe(true)
    expect(isOfficialRecruitmentUrl('https://www.yesbank.in/careers')).toBe(true)
  })

  it('accepts expanded PSU and AIIMS .edu.in hosts', () => {
    expect(isOfficialRecruitmentUrl('https://www.bsnl.co.in/opencms/bsnl/BSNL/about_us/company/career_opp.html')).toBe(true)
    expect(isOfficialRecruitmentUrl('https://www.ecil.co.in/jobs/Advt_09_2026.pdf')).toBe(true)
    expect(isOfficialRecruitmentUrl('https://aiimsrajkot.edu.in/api/files/Advertisement.pdf')).toBe(true)
    expect(isOfficialRecruitmentUrl('https://img2.freejobalert.com/news/2026/05/example.pdf')).toBe(false)
  })
})

describe('pickOfficialDetailUrl', () => {
  it('prefers an official portal over a notification PDF', () => {
    expect(
      pickOfficialDetailUrl({
        pdfUrl: 'https://ssc.nic.in/notice.pdf',
        applyUrl: 'https://ssc.nic.in/Portal/Apply',
      })
    ).toBe('https://ssc.nic.in/Portal/Apply')
  })

  it('falls back to an official PDF when no portal exists', () => {
    expect(
      pickOfficialDetailUrl({
        pdfUrl: 'https://employmentnews.gov.in/notice.pdf',
      })
    ).toBe('https://employmentnews.gov.in/notice.pdf')
  })
})

describe('isAllowedOfficialJob', () => {
  it('allows jobs with official apply URLs only', () => {
    expect(
      isAllowedOfficialJob({
        title: 'SSC CGL 2026',
        applyUrl: 'https://ssc.nic.in/apply',
      })
    ).toBe(true)
  })

  it('rejects jobs linking to aggregators', () => {
    expect(
      isAllowedOfficialJob({
        title: 'Fake job',
        applyUrl: 'https://www.sarkariresult.com/x',
      })
    ).toBe(false)
  })

  it('allows jobs with official apply URL after catalog metadata is sanitized', () => {
    expect(
      isAllowedOfficialJob({
        title: 'IISER Kolkata Faculty Recruitment 2026',
        applyUrl: 'https://apply.iiserkol.ac.in/faculty/',
        detail: {
          source: 'official-sites',
          content_sections: [
            {
              heading: 'Introduction',
              links: [{ url: 'https://t.me/FreeJobAlertOfficially', label: 'Join Telegram' }],
            },
          ],
        },
      })
    ).toBe(true)
  })
})
