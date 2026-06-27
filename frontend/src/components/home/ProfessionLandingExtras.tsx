import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PROFESSIONS,
  professionRoutePath,
  type ProfessionDef,
} from '@/data/professions'
import { getProfessionSeoSections } from '@/data/professionSeoContent'
import ProfessionLandingFaq from '@/components/home/ProfessionLandingFaq'
import { dateTimeLocale } from '@/utils/formatLocale'
import type { JobRecord } from '@/types/job'

const RECENT_LIMIT = 8

type ProfessionLandingExtrasProps = {
  profession: ProfessionDef
  listingCount: number
  recentJobs?: JobRecord[]
  onJobClick?: (job: JobRecord) => void
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString(dateTimeLocale(locale), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }
  return String(value)
}

export default function ProfessionLandingExtras({
  profession,
  listingCount,
  recentJobs = [],
  onJobClick,
}: ProfessionLandingExtrasProps) {
  const { t, i18n } = useTranslation()
  const locale = dateTimeLocale(i18n.language)

  const sections = useMemo(() => getProfessionSeoSections(profession.slug), [profession.slug])

  const recent = useMemo(
    () =>
      [...recentJobs]
        .sort((a, b) => String(b.lastDate || '').localeCompare(String(a.lastDate || '')))
        .slice(0, RECENT_LIMIT),
    [recentJobs]
  )

  const related = useMemo(
    () => PROFESSIONS.filter((p) => p.slug !== profession.slug).slice(0, 8),
    [profession.slug]
  )

  if (!sections.length && !profession.faq?.length && !recent.length) return null

  return (
    <div className="profession-landing-extras profession-landing-extras--below-fold">
      <div className="profession-landing-extras__main">
        {profession.seoBody ? (
          <p className="profession-landing-extras__lede">{profession.seoBody}</p>
        ) : null}

        {sections.map((section) => (
          <section key={section.id} className="profession-landing-extras__section">
            <h2 className="profession-landing-extras__section-title">
              {t(`profession.seo.${profession.slug}.${section.id}Heading`, {
                defaultValue: section.heading,
              })}
            </h2>
            {section.paragraphs.map((para, pi) => (
              <p key={`${section.id}-${pi}`} className="profession-landing-extras__body">
                {t(`profession.seo.${profession.slug}.${section.id}P${pi}`, {
                  defaultValue: para,
                })}
              </p>
            ))}
          </section>
        ))}

        {profession.faq?.length ? (
          <ProfessionLandingFaq items={profession.faq} professionSlug={profession.slug} />
        ) : null}
      </div>

      <aside
        className="profession-landing-extras__sidebar"
        aria-label={t('profession.sidebarTitle', { defaultValue: 'Other professions' })}
      >
        {recent.length > 0 ? (
          <div className="profession-landing-extras__recent">
            <h2 className="profession-landing-extras__sidebar-title">
              {t('profession.recentJobs', { defaultValue: 'Recent listings' })}
            </h2>
            <ul className="profession-landing-extras__recent-list">
              {recent.map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    className="profession-landing-extras__recent-btn"
                    onClick={() => onJobClick?.(job)}
                  >
                    <span className="profession-landing-extras__recent-title">{job.title}</span>
                    <span className="profession-landing-extras__recent-meta">
                      {formatDate(job.lastDate, locale)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <h2 className="profession-landing-extras__sidebar-title">
          {t('profession.relatedProfessions', { defaultValue: 'Related professions' })}
        </h2>
        <ul className="profession-landing-extras__sidebar-list">
          {related.map((prof) => {
            const active = prof.slug === profession.slug
            return (
              <li key={prof.slug}>
                {active ? (
                  <span className="profession-landing-extras__sidebar-link profession-landing-extras__sidebar-link--active">
                    {t(prof.labelKey)}
                    {listingCount > 0 ? (
                      <span className="profession-landing-extras__sidebar-count">({listingCount})</span>
                    ) : null}
                  </span>
                ) : (
                  <Link to={professionRoutePath(prof.slug)} className="profession-landing-extras__sidebar-link">
                    {t(prof.labelKey)}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </aside>
    </div>
  )
}
