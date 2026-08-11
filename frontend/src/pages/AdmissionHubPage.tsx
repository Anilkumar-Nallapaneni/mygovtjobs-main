import { useTranslation } from 'react-i18next'
import Footer from '@/components/layout/Footer'
import { ADMISSION_SOURCES } from '@/data/admissionSources'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'

type Props = { onFooterLink?: (target: FooterLinkTarget) => void }

const CATEGORY_LABELS: Record<string, string> = {
  engineering: 'Engineering',
  medical: 'Medical',
  law: 'Law',
  university: 'University / General',
  management: 'Management',
  design: 'Design',
  other: 'Other',
}

export default function AdmissionHubPage({ onFooterLink }: Props) {
  const { t } = useTranslation()

  const grouped = ADMISSION_SOURCES.reduce<Record<string, typeof ADMISSION_SOURCES>>((acc, item) => {
    (acc[item.category] ||= []).push(item)
    return acc
  }, {})

  return (
    <div className="hub-page">
      <h1>{t('admission.title', { defaultValue: 'Entrance Exams & Admissions' })}</h1>
      <p className="hub-page__lead">
        {t('admission.lead', {
          defaultValue: 'Official links to India\'s major entrance exams: engineering, medical, law, management, design, and university admissions.',
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
