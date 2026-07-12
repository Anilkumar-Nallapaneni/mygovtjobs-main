import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Footer from '@/components/layout/Footer'
import { ORG_INDEX } from '@/data/orgIndex'
import { orgRoutePath } from '@/utils/browseRoutes'
import { applyBrowseSeo } from '@/utils/browseSeo'
import { numberLocale } from '@/utils/formatLocale'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'

const INDEX_PATH = '/organizations'

type OrganizationsIndexPageProps = {
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function OrganizationsIndexPage({ onFooterLink }: OrganizationsIndexPageProps) {
  const { t, i18n } = useTranslation()
  const locale = numberLocale(i18n.language)

  useEffect(() => {
    return applyBrowseSeo(INDEX_PATH)
  }, [])

  useEffect(() => {
    document.title = `${t('organization.indexTitle')} | My Govt Jobs`
  }, [t])

  return (
    <div className="static-page browse-index-page">
      <header className="static-page__header">
        <Link to="/" className="static-page__back">
          {t('jobDetail.back', { defaultValue: 'Back' })}
        </Link>
        <h1 className="static-page__title">{t('organization.indexTitle')}</h1>
        <p className="static-page__lede">{t('organization.indexDesc')}</p>
      </header>

      <div className="browse-index-grid browse-index-grid--orgs">
        {ORG_INDEX.map((org) => (
          <Link key={org.slug} to={orgRoutePath(org.slug)} className="browse-index-card">
            <h2 className="browse-index-card__title">{org.dept}</h2>
            <p className="browse-index-card__meta">
              {t('organization.cardMeta', {
                count: org.count.toLocaleString(locale),
                vacancies: org.vacancies.toLocaleString(locale),
                defaultValue: '{{count}} notifications · {{vacancies}} posts',
              })}
            </p>
          </Link>
        ))}
      </div>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
