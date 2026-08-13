import { pageTitle } from '@/data/siteMeta'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Footer from '@/components/layout/Footer'
import { CATS } from '@/data/categories'
import { STATES } from '@/data/states'
import { SITE_LINKS } from '@/data/siteLinks'
import { applyBrowseSeo } from '@/utils/browseSeo'
import {
  ALL_INDIA_JOBS_PATH,
  BOARDS_INDEX_PATH,
  boardRoutePath,
  EXAM_CALENDAR_PATH,
  EXAMS_INDEX_PATH,
  EXPLORE_HUB_PATH,
  FAQ_PATH,
  GUIDE_EXAM_PREP_PATH,
  GUIDE_HOW_TO_APPLY_PATH,
  LATEST_NOTIFICATIONS_PATH,
  ORGANIZATIONS_INDEX_PATH,
  PROFESSIONS_INDEX_PATH,
  QUALIFICATIONS_INDEX_PATH,
  RESULTS_TOPICS_INDEX_PATH,
  STATES_INDEX_PATH,
} from '@/utils/browseRoutes'
import { PROFESSIONS, professionRoutePath } from '@/data/professions'
import { RESULT_TOPICS } from '@/data/resultTopics'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'

const SITEMAP_PATH = '/sitemap'

type SitemapPageProps = {
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function SitemapPage({ onFooterLink }: SitemapPageProps) {
  const { t } = useTranslation()

  useEffect(() => {
    return applyBrowseSeo(SITEMAP_PATH)
  }, [])

  useEffect(() => {
    document.title = pageTitle(t('sitemap.title'));
    const el = document.head.querySelector('meta[name="description"]')
    if (el) el.setAttribute('content', t('sitemap.description'))
  }, [t])

  const mainLinks = [
    { href: '/', label: t('nav.home') },
    { href: EXPLORE_HUB_PATH, label: t('nav.explore', { defaultValue: 'Explore' }) },
    { href: '/jobs', label: t('nav.jobs') },
    { href: LATEST_NOTIFICATIONS_PATH, label: t('nav.latest') },
    { href: ALL_INDIA_JOBS_PATH, label: t('nav.allIndia', { defaultValue: 'All India jobs' }) },
    { href: STATES_INDEX_PATH, label: t('states.indexTitle') },
    { href: BOARDS_INDEX_PATH, label: t('boards.indexTitle', { defaultValue: 'Government Jobs by Board' }) },
    { href: EXAMS_INDEX_PATH, label: t('exams.indexTitle', { defaultValue: 'Popular Government Exams' }) },
    { href: QUALIFICATIONS_INDEX_PATH, label: t('qualification.indexTitle') },
    { href: PROFESSIONS_INDEX_PATH, label: t('profession.indexTitle', { defaultValue: 'Government Jobs by Profession' }) },
    { href: ORGANIZATIONS_INDEX_PATH, label: t('organization.indexTitle') },
    { href: RESULTS_TOPICS_INDEX_PATH, label: t('results.indexTitle') },
    { href: '/results', label: t('nav.results') },
    { href: '/results/admit-card', label: t('nav.admitCard') },
    { href: EXAM_CALENDAR_PATH, label: t('footer.examCalendar') },
    { href: '/alerts', label: t('nav.alert') },
    { href: GUIDE_HOW_TO_APPLY_PATH, label: t('explore.cards.howToApplyTitle') },
    { href: GUIDE_EXAM_PREP_PATH, label: t('explore.cards.examPrepTitle') },
    { href: FAQ_PATH, label: t('explore.cards.faqTitle') },
    { href: '/account', label: t('nav.login') },
  ]

  const legalLinks = [
    { href: SITE_LINKS.about, label: t('footer.about') },
    { href: SITE_LINKS.contact, label: t('footer.contact') },
    { href: SITE_LINKS.privacy, label: t('footer.privacy') },
    { href: SITE_LINKS.terms, label: t('footer.terms') },
    { href: SITE_LINKS.disclaimer, label: t('footer.disclaimerLink') },
  ]

  return (
    <div className="static-page sitemap-page">
      <header className="static-page__header">
        <Link to="/" className="static-page__back">
          {t('jobDetail.back', { defaultValue: 'Back' })}
        </Link>
        <h1 className="static-page__title">{t('sitemap.title')}</h1>
        <p className="static-page__lede">{t('sitemap.description')}</p>
      </header>

      <div className="sitemap-page__grid">
        <section>
          <h2>{t('sitemap.mainPages')}</h2>
          <ul className="sitemap-page__list">
            {mainLinks.map(({ href, label }) => (
              <li key={href}>
                <Link to={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{t('sitemap.resultsTopics', { defaultValue: 'Exam results & admit cards' })}</h2>
          <ul className="sitemap-page__list">
            {RESULT_TOPICS.map((topic) => {
              const href = topic.slug ? `/results/${topic.slug}` : '/results'
              return (
                <li key={href}>
                  <Link to={href}>{topic.title}</Link>
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <h2>{t('sitemap.professions', { defaultValue: 'Professions' })}</h2>
          <ul className="sitemap-page__list">
            {PROFESSIONS.map((prof) => (
              <li key={prof.slug}>
                <Link to={professionRoutePath(prof.slug)}>{t(prof.labelKey)}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{t('footer.categories')}</h2>
          <ul className="sitemap-page__list">
            {CATS.map((cat) => (
              <li key={cat.id}>
                <Link to={boardRoutePath(cat.id)}>{cat.name}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{t('sitemap.states')}</h2>
          <ul className="sitemap-page__list">
            {STATES.map((state) => (
              <li key={state.id}>
                <Link to={`/state/${state.id}`}>{state.n}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{t('footer.company')}</h2>
          <ul className="sitemap-page__list">
            {legalLinks.map(({ href, label }) => (
              <li key={href}>
                <Link to={href}>{label}</Link>
              </li>
            ))}
            <li>
              <a href="/sitemap.xml">{t('sitemap.xmlLink')}</a>
            </li>
          </ul>
        </section>
      </div>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
