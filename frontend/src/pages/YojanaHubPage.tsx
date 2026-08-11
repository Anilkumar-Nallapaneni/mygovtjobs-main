import { useTranslation } from 'react-i18next'
import Footer from '@/components/layout/Footer'
import { YOJANA_SOURCES } from '@/data/yojanaSources'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'

type Props = { onFooterLink?: (target: FooterLinkTarget) => void }

const CATEGORY_LABELS: Record<string, string> = {
  welfare: 'Welfare',
  insurance: 'Insurance',
  housing: 'Housing',
  farmer: 'Farmer',
  women: 'Women',
  youth: 'Youth / Employment',
  health: 'Health',
  skill: 'Skill Development',
}

export default function YojanaHubPage({ onFooterLink }: Props) {
  const { t } = useTranslation()

  const grouped = YOJANA_SOURCES.reduce<Record<string, typeof YOJANA_SOURCES>>((acc, item) => {
    (acc[item.category] ||= []).push(item)
    return acc
  }, {})

  return (
    <div className="hub-page">
      <h1>{t('yojana.title', { defaultValue: 'Government Schemes (Sarkari Yojana)' })}</h1>
      <p className="hub-page__lead">
        {t('yojana.lead', {
          defaultValue: 'Central and state government welfare schemes: PM-KISAN, Ayushman Bharat, Ujjwala, Awas Yojana, and more.',
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
                <div className="hub-card__meta">{item.ministry}</div>
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
