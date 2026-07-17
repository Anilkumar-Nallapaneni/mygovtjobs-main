import { describe, expect, it } from 'vitest'
import type { JobRecord } from '@/types/job'
import { getExamBySlug, jobMatchesExam } from '@/data/exams'

const sscCglJob = {
  id: '1',
  slug: 'ssc-cgl-2026',
  title: 'SSC CGL 2026 Recruitment',
  dept: 'SSC',
  category: 'ssc',
  vacancies: 100,
  lastDate: '2026-08-01',
} as JobRecord

const upscJob = {
  id: '2',
  slug: 'upsc-cse-2026',
  title: 'UPSC Civil Services Examination 2026',
  dept: 'UPSC',
  category: 'upsc',
  vacancies: 900,
  lastDate: '2026-05-01',
} as JobRecord

describe('exams', () => {
  it('getExamBySlug returns SSC CGL', () => {
    expect(getExamBySlug('ssc-cgl')?.shortTitle).toBe('SSC CGL')
  })

  it('jobMatchesExam matches CGL notifications', () => {
    const exam = getExamBySlug('ssc-cgl')
    expect(exam).toBeTruthy()
    expect(jobMatchesExam(sscCglJob, exam!)).toBe(true)
    expect(jobMatchesExam(upscJob, exam!)).toBe(false)
  })

  it('jobMatchesExam matches UPSC CSE', () => {
    const exam = getExamBySlug('upsc-cse')
    expect(exam).toBeTruthy()
    expect(jobMatchesExam(upscJob, exam!)).toBe(true)
  })

  it('getExamBySlug returns CAPF and AFCAT', () => {
    expect(getExamBySlug('capf')?.shortTitle).toBe('CAPF AC')
    expect(getExamBySlug('afcat')?.shortTitle).toBe('AFCAT')
    expect(getExamBySlug('uppsc')?.shortTitle).toBe('UPPSC')
  })
})
