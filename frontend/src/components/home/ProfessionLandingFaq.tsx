import { useTranslation } from 'react-i18next'
import type { ProfessionFaqItem } from '@/data/professions'

type ProfessionLandingFaqProps = {
  items: ProfessionFaqItem[]
  professionSlug: string
}

export default function ProfessionLandingFaq({ items, professionSlug }: ProfessionLandingFaqProps) {
  const { t } = useTranslation()

  if (!items.length) return null

  return (
    <section className="profession-landing-faq" aria-labelledby="profession-faq-heading">
      <h2 id="profession-faq-heading" className="profession-landing-faq__title">
        {t('profession.faqTitle', { defaultValue: 'Frequently asked questions' })}
      </h2>
      <div className="profession-landing-faq__list">
        {items.map((item, index) => (
          <details
            key={item.q}
            className="profession-landing-faq__item"
            open={index === 0}
            name={`profession-faq-${professionSlug}`}
          >
            <summary className="profession-landing-faq__q">{item.q}</summary>
            <p className="profession-landing-faq__a">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
