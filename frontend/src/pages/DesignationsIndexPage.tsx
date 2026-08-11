import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Footer from '@/components/layout/Footer'
import { DESIGNATIONS } from '@/data/designations'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'

type Props = { onFooterLink?: (target: FooterLinkTarget) => void }

export default function DesignationsIndexPage({ onFooterLink }: Props) {
  const { t } = useTranslation()
  return (
    <div className="hub-page">
      <h1>{t('designations.indexTitle', { defaultValue: 'Browse Jobs by Designation' })}</h1>
      <p className="hub-page__lead">
        {t('designations.indexLead', {
          defaultValue: 'Explore openings by role — clerk, officer, engineer, teacher, constable, nurse, and more.',
        })}
      </p>
      <div className="hub-grid">
        {DESIGNATIONS.map((d) => (
          <Link key={d.slug} to={`/designation/${d.slug}`} className="hub-card">
            <div className="hub-card__title">{d.label}</div>
            <div className="hub-card__meta">{d.description}</div>
          </Link>
        ))}
      </div>
      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
