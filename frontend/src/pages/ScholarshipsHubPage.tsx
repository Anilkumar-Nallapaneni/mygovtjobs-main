import { useTranslation } from 'react-i18next'
import Footer from '@/components/layout/Footer'
import { SCHOLARSHIP_SOURCES } from '@/data/scholarshipSources'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'

type Props = { onFooterLink?: (target: FooterLinkTarget) => void }

const CATEGORY_LABELS: Record<string, string> = {
  central: 'Central Government',
  state: 'State Government',
  minority: 'Minority',
  women: 'Women / Girls',
  phd: 'Research / PhD',
  international: 'International Study',
}

export default function ScholarshipsHubPage({ onFooterLink }: Props) {
  const { t } = useTranslation()

  const grouped = SCHOLARSHIP_SOURCES.reduce<Record<string, typeof SCHOLARSHIP_SOURCES>>((acc, item) => {
    (acc[item.category] ||= []).push(item)
    return acc
  }, {})

  return (
    <div className="hub-page">
      <h1>{t('scholarships.title', { defaultValue: 'Scholarships & Fellowships' })}</h1>
      <p className="hub-page__lead">
        {t('scholarships.lead', {
          defaultValue: 'Official government scholarship portals for pre-matric, post-matric, minority, women, and research funding.',
        })}
      </p>

      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat} style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>{CATEGORY_LABELS[cat] ?? cat}</h2>
          <div className="hub-grid">
            {items.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hub-card"
              >
                <div className="hub-card__title">{item.title}</div>
                <div className="hub-card__meta">{item.agency}</div>
                <p style={{ margin: '8px 0 0', fontSize: 13 }}>{item.description}</p>
              </a>
            ))}
          </div>
        </section>
      ))}

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
