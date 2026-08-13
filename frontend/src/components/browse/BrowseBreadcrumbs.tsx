import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getProfessionBySlug } from '@/data/professions'
import { getQualificationBySlug } from '@/data/qualifications'
import { CATS } from '@/data/categories'
import { boardRoutePath } from '@/utils/browseRoutes'
import { useStateLabel } from '@/utils/stateLabels'

type BrowseBreadcrumbsProps = {
  professionSlug?: string | null
  qualificationSlug?: string | null
  categoryId?: string | null
  stateId?: string | null
  orgDept?: string | null
  allIndia?: boolean
}

export default function BrowseBreadcrumbs({
  professionSlug = null,
  qualificationSlug = null,
  categoryId = null,
  stateId = null,
  orgDept = null,
  allIndia = false,
}: BrowseBreadcrumbsProps) {
  const { t } = useTranslation()
  const stateLabel = useStateLabel()

  const profession = getProfessionBySlug(professionSlug)
  const qualification = getQualificationBySlug(qualificationSlug)
  const category = categoryId ? CATS.find((c) => c.id === categoryId) : null

  const middle =
    profession != null
      ? {
          href: `/profession/${profession.slug}`,
          label: t(profession.labelKey),
        }
      : qualification != null
        ? {
            href: `/qualification/${qualification.slug}`,
            label: qualification.title.replace(/ Government Jobs 2026$/, ' Jobs'),
          }
        : category != null
          ? {
              href: boardRoutePath(category.id),
              label: t('home.categoryJobs', { category: t(`category.${category.id}`) }),
            }
          : stateId
            ? {
                href: `/state/${encodeURIComponent(stateId)}`,
                label: t('home.jobsInState', { state: stateLabel(stateId) }),
              }
            : orgDept
              ? { href: null, label: orgDept }
              : allIndia
                ? { href: '/jobs/all-india', label: t('nav.allIndia', { defaultValue: 'All India jobs' }) }
                : null

  if (!middle) return null

  return (
    <nav className="browse-breadcrumbs" aria-label={t('browse.breadcrumbs', { defaultValue: 'Breadcrumb' })}>
      <ol className="browse-breadcrumbs__list">
        <li className="browse-breadcrumbs__item">
          <Link to="/">{t('nav.home')}</Link>
        </li>
        <li className="browse-breadcrumbs__item" aria-hidden>
          /
        </li>
        <li className="browse-breadcrumbs__item">
          {middle.href ? (
            <Link to={middle.href}>{middle.label}</Link>
          ) : (
            <span>{middle.label}</span>
          )}
        </li>
        <li className="browse-breadcrumbs__item" aria-hidden>
          /
        </li>
        <li className="browse-breadcrumbs__item browse-breadcrumbs__item--current" aria-current="page">
          {t('qualification.listingsHeading', { defaultValue: 'Live listings' })}
        </li>
      </ol>
    </nav>
  )
}
