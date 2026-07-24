/** Shared job shapes used across cards, detail, and adapters. */

export type JobContentSection = {
  heading?: string
  paragraphs?: string[]
  lists?: string[][]
  tables?: Record<string, string>[][]
  links?: { label?: string; url?: string }[]
}

export type JobPostRow = {
  post_name?: string
  post?: string
  vacancies?: number
  pay_level?: string
}

export type JobDateRow = {
  event_key?: string
  event?: string
  event_date?: string
  date?: string
}

export type JobDetailBlob = {
  pdfUrls?: string[]
  pdf_urls?: string[]
  pdfUrl?: string
  pdf_url?: string
  summary?: string
  source?: string
  age?: string
  post_name?: string
  posts?: JobPostRow[]
  content_sections?: JobContentSection[]
  streetAddress?: string
  street_address?: string
  postalCode?: string
  postal_code?: string
  pincode?: string
}

export type JobRecord = {
  id?: string
  slug?: string
  title?: string
  post_name?: string
  posts?: JobPostRow[]
  important_dates?: JobDateRow[]
  about?: string
  dept?: string
  category?: string
  state?: string
  stateIds?: string[]
  vacancies?: number
  rawVacancies?: number
  qual?: string
  salary?: string
  age?: string
  selection?: string[]
  howApply?: string[]
  lastDate?: string
  last_date?: string
  publishedDate?: string
  published_at?: string
  updatedDate?: string
  updated_at?: string
  apply_url?: string
  pdfUrl?: string
  pdfUrls?: string[]
  status?: string
  detail?: JobDetailBlob
  _enriched?: boolean
  _fromLive?: boolean
  [key: string]: unknown
}
