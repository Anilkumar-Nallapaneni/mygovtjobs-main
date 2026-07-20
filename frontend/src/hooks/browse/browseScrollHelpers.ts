import { scrollToSection } from '@/utils/scrollToSection'

const HEADLINES_SCROLL_DELAY_MS = 140

export function scrollToMainJobs() {
  scrollToSection('main-jobs')
}

export function scrollToMapPanel() {
  scrollToSection('india-map-panel', { behavior: 'instant' })
}

export function scrollToHeadlines() {
  scrollToSection('official-headlines')
}

export function scrollToHeadlinesDelayed() {
  window.setTimeout(() => scrollToSection('official-headlines'), HEADLINES_SCROLL_DELAY_MS)
}

export function scrollToAlertDelayed() {
  window.setTimeout(() => scrollToSection('alert-section'), HEADLINES_SCROLL_DELAY_MS)
}

export function scrollToBrowseSection(sectionId: string, options?: Parameters<typeof scrollToSection>[1]) {
  scrollToSection(sectionId, options)
}

export function scrollWindowToTop(behavior: ScrollBehavior = 'smooth') {
  window.scrollTo({ top: 0, behavior })
}
