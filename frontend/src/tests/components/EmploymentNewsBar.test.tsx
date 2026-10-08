/** @vitest-environment happy-dom */
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import EmploymentNewsBar from '@/components/layout/EmploymentNewsBar'

vi.mock('react-i18next', () => ({useTranslation: () => ({i18n:{language:'en'},t:(_key:string,options?:{defaultValue?:string;count?:string})=>options?.defaultValue?.replace('{{count}}',options.count || '') || _key})}))
vi.mock('@/hooks/useOfficialFeed', () => ({useOfficialFeed: () => ({items:[],loading:false})}))
vi.mock('@/utils/employmentNewsItems', () => ({buildEmploymentNewsItems: () => [
  {id:'notice',title:'An official notice',href:'#',external:true},
  {id:'result',title:'An official result',href:'#',external:true},
]}))
afterEach(cleanup)
it('uses verified live totals rather than the number of feed headlines', () => {
  const {container,rerender} = render(<MemoryRouter><EmploymentNewsBar liveCount={1} /></MemoryRouter>)
  expect(container.querySelector('.employment-news-bar__count')?.textContent).toBe('1 live')
  rerender(<MemoryRouter><EmploymentNewsBar liveCount={0} /></MemoryRouter>)
  expect(container.querySelector('.employment-news-bar__count')?.textContent).toBe('0 live')
})
