import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Footer from '@/components/layout/Footer'
import TrackedLink from '@/components/TrackedLink'
import { pageTitle } from '@/data/siteMeta'
import { FAQ_ITEMS, FAQ_PATH } from '@/pages/guideContent'
import { EXPLORE_HUB_PATH, GUIDE_HOW_TO_APPLY_PATH } from '@/utils/browseRoutes'
import { applyBrowseSeo } from '@/utils/browseSeo'
import { beginSeoHead } from '@/utils/seoHead'
import { buildFaqPageJsonLd } from '@/utils/structuredData'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'

type FaqPageProps = {
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function FaqPage({ onFooterLink }: FaqPageProps) {
  const { t } = useTranslation()

  useEffect(() => {
    const restoreBrowse = applyBrowseSeo(FAQ_PATH)
    const head = beginSeoHead()
    head.upsertJsonLd('faq-page-jsonld', buildFaqPageJsonLd(FAQ_ITEMS))
    return () => {
      head.restore()
      restoreBrowse()
    }
  }, [])

  useEffect(() => {
    document.title = pageTitle(t('faq.title', { defaultValue: 'Frequently Asked Questions' }));
  }, [t])

  return (
    <div className="static-page faq-page">
      <header className="static-page__header">
        <Link to={EXPLORE_HUB_PATH} className="static-page__back">
          {t('explore.backToExplore', { defaultValue: 'Explore' })}
        </Link>
        <h1 className="static-page__title">{t('faq.title', { defaultValue: 'Frequently Asked Questions' })}</h1>
        <p className="static-page__lede">
          {t('faq.lede', {
            defaultValue: 'Common questions about government job alerts, applications, results, and how Live Govt Jobs works.',
          })}
        </p>
      </header>

      <div className="faq-page__list">
        {FAQ_ITEMS.map((item) => (
          <details key={item.id} className="faq-item" id={item.id}>
            <summary className="faq-item__question">{item.question}</summary>
            <p className="faq-item__answer">{item.answer}</p>
          </details>
        ))}
      </div>

      <section className="faq-page__cta">
        <p>{t('faq.stillQuestions', { defaultValue: 'Still have questions?' })}</p>
        <div className="faq-page__cta-links">
          <TrackedLink to={GUIDE_HOW_TO_APPLY_PATH} trackId="faq-how-to-apply" trackSource="faq" className="faq-page__cta-link">
            {t('explore.cards.howToApplyTitle', { defaultValue: 'How to apply' })}
          </TrackedLink>
          <TrackedLink to="/contact" trackId="faq-contact" trackSource="faq" className="faq-page__cta-link">
            {t('footer.contact')}
          </TrackedLink>
        </div>
      </section>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
