import { describe, expect, it } from 'vitest'
import {
  describeActiveFilters,
  filterOfficialItems,
  inferTopicKey,
  parseHeadlineStatus,
  sortHeadlineRows,
  toHeadlineRows,
} from '@/utils/officialFilters'

const sampleItems = [
  {
    id: '1',
    title: 'SSC CGL Recruitment 2026',
    dept: 'Staff Selection Commission',
    summary: 'Apply online before last date',
    state: 'All India',
    link: 'https://ssc.gov.in/1',
  },
  {
    id: '2',
    title: 'Bihar Police Constable Result',
    dept: 'Bihar Police',
    summary: 'Merit list declared',
    state: 'Bihar',
    link: 'https://bpsc.bih.nic.in/2',
  },
  {
    id: '3',
    title: 'UPSC Civil Services Admit Card',
    dept: 'UPSC',
    summary: 'Download hall ticket',
    state: 'All India',
    link: 'https://upsc.gov.in/3',
  },
  {
    id: '4',
    title: 'Anganwadi Worker Recruitment',
    dept: 'ICDS',
    summary: 'District wise vacancies',
    state: 'Odisha',
    link: 'https://odisha.gov.in/4',
  },
]

describe('filterOfficialItems', () => {
  it('returns all items when no filters are active', () => {
    expect(filterOfficialItems(sampleItems)).toHaveLength(4)
  })

  it('returns empty array for non-array input', () => {
    expect(filterOfficialItems(null as unknown as unknown[])).toEqual([])
  })

  it('narrows by state id', () => {
    const out = filterOfficialItems(sampleItems, { stateId: 'br' })
    expect(out.map((r) => (r as { id: string }).id)).toEqual(['2'])
  })

  it('narrows by category id in haystack', () => {
    const out = filterOfficialItems(sampleItems, { categoryId: 'police' })
    expect(out.map((r) => (r as { id: string }).id)).toEqual(['2'])
  })

  it('narrows by sidebar topic key', () => {
    const out = filterOfficialItems(sampleItems, { topicKey: 'admit-card' })
    expect(out.map((r) => (r as { id: string }).id)).toEqual(['3'])
  })

  it('narrows by freeform search', () => {
    const out = filterOfficialItems(sampleItems, { search: 'anganwadi' })
    expect(out.map((r) => (r as { id: string }).id)).toEqual(['4'])
  })

  it('combines state and topic filters', () => {
    const out = filterOfficialItems(sampleItems, {
      stateId: 'br',
      topicKey: 'sarkari-result',
    })
    expect(out.map((r) => (r as { id: string }).id)).toEqual(['2'])
  })

  it('matches scorecard and marks titles for sarkari-result', () => {
    const rows = [
      { id: 'm1', title: 'Marks of Recommended Candidates', link: 'https://upsc.gov.in/m1' },
      { id: 'm2', title: 'Written Result declared', link: 'https://rrb.gov.in/m2' },
    ]
    const out = filterOfficialItems(rows, { topicKey: 'sarkari-result' })
    expect(out.map((r) => (r as { id: string }).id)).toEqual(['m1', 'm2'])
  })

  it('returns empty when topic does not match', () => {
    expect(filterOfficialItems(sampleItems, { topicKey: 'syllabus' })).toEqual([])
  })

  it('narrows by previous-papers topic', () => {
    const items = [
      ...sampleItems,
      {
        id: '5',
        title: 'UPSC Civil Services Previous Year Question Paper',
        dept: 'UPSC',
        summary: 'Download PDF',
        state: 'All India',
        link: 'https://upsc.gov.in/examinations/previous-question-papers/civil',
      },
    ]
    const out = filterOfficialItems(items, { topicKey: 'previous-papers' })
    expect(out.map((r) => (r as { id: string }).id)).toEqual(['5'])
  })

  it('narrows by written-marks topic', () => {
    const items = [
      ...sampleItems,
      {
        id: '6',
        title: 'SSC CGL Tier-II Written Examination Marks',
        dept: 'SSC',
        summary: 'Marks of qualified candidates',
        state: 'All India',
        link: 'https://ssc.gov.in/marks/6',
      },
    ]
    const out = filterOfficialItems(items, { topicKey: 'written-marks' })
    expect(out.map((r) => (r as { id: string }).id)).toEqual(['6'])
  })
})

describe('describeActiveFilters', () => {
  it('returns empty string when nothing is active', () => {
    expect(describeActiveFilters({})).toBe('')
  })

  it('describes state, category, topic, and search', () => {
    const label = describeActiveFilters({
      stateId: 'br',
      categoryId: 'police',
      topicKey: 'admit-card',
      search: '2026',
    })
    expect(label).toContain('Bihar')
    expect(label).toContain('Police')
    expect(label).toContain('Admit Card')
    expect(label).toContain('"2026"')
  })
})

describe('parseHeadlineStatus', () => {
  it('detects download, declared, and out badges', () => {
    expect(parseHeadlineStatus('Download Admit Card UPSC 2026')).toBe('download')
    expect(parseHeadlineStatus('SSC CGL Result Declared')).toBe('declared')
    expect(parseHeadlineStatus('RRB NTPC Admit Card Out')).toBe('out')
    expect(parseHeadlineStatus('General recruitment notice')).toBeNull()
  })
})

describe('inferTopicKey', () => {
  it('infers topic from title haystack', () => {
    expect(inferTopicKey({ title: 'UPSC Admit Card Download', summary: '', dept: '' })).toBe('admit-card')
    expect(inferTopicKey({ title: 'Bihar Police Result Declared', summary: '', dept: '' })).toBe('sarkari-result')
  })
})

describe('toHeadlineRows', () => {
  it('maps feed items to table rows with board and topic', () => {
    const rows = toHeadlineRows(sampleItems, 'admit-card')
    expect(rows).toHaveLength(4)
    expect(rows[2]).toMatchObject({
      board: 'UPSC',
      title: 'UPSC Civil Services Admit Card',
      topicKey: 'admit-card',
      link: 'https://upsc.gov.in/3',
    })
  })
})

describe('sortHeadlineRows', () => {
  it('sorts by board name', () => {
    const rows = toHeadlineRows(sampleItems)
    const sorted = sortHeadlineRows(rows, 'board')
    expect(sorted[0].board <= sorted[1].board).toBe(true)
  })
})
