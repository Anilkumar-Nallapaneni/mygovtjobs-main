import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { JobRecord } from '@/types/job'

type FaqItem = {
  question: string
  answer: string
}

type JobDetailFaqProps = {
  job: JobRecord
  postName?: string
  lastDate?: string
  qualification?: string
  vacancies?: number
}

export default function JobDetailFaq({
  job,
  postName = '',
  lastDate = '',
  qualification = '',
  vacancies = 0,
}: JobDetailFaqProps) {
  const { t } = useTranslation()

  const items = useMemo((): FaqItem[] => {
    const title = job.title || postName || 'this recruitment'
    const dept = job.dept || 'the recruiting organization'
    const list: FaqItem[] = []

    if (lastDate && lastDate !== '—') {
      list.push({
        question: t('jobDetail.faqLastDateQ', {
          title,
          defaultValue: 'What is the last date to apply for {{title}}?',
        }),
        answer: t('jobDetail.faqLastDateA', {
          date: lastDate,
          defaultValue: 'The last date to apply is {{date}}. Apply before the deadline on the official portal.',
        }),
      })
    }

    if (qualification && qualification !== '—') {
      list.push({
        question: t('jobDetail.faqQualQ', {
          title,
          defaultValue: 'What is the qualification required for {{title}}?',
        }),
        answer: t('jobDetail.faqQualA', {
          qual: qualification,
          defaultValue: 'The minimum qualification is {{qual}}. Check the official notification for stream-specific rules.',
        }),
      })
    }

    if (vacancies > 0) {
      list.push({
        question: t('jobDetail.faqVacanciesQ', {
          title,
          defaultValue: 'How many vacancies are there in {{title}}?',
        }),
        answer: t('jobDetail.faqVacanciesA', {
          count: vacancies.toLocaleString(),
          defaultValue: 'There are {{count}} posts/vacancies as per the official notification.',
        }),
      })
    }

    list.push({
      question: t('jobDetail.faqApplyQ', {
        dept,
        defaultValue: 'How do I apply through {{dept}}?',
      }),
      answer: t('jobDetail.faqApplyA', {
        defaultValue:
          'Use the Apply Now button to open the official recruitment portal. Never pay third-party agents — apply only on .gov.in or verified board websites.',
      }),
    })

    list.push({
      question: t('jobDetail.faqOfficialQ', { defaultValue: 'Is this listing from an official source?' }),
      answer: t('jobDetail.faqOfficialA', {
        defaultValue:
          'Live Govt Jobs links only to official government portals and verified recruitment board domains. Aggregator and unofficial links are blocked.',
      }),
    })

    list.push({
      question: t('jobDetail.faqAlertsQ', { defaultValue: 'How can I get alerts for similar jobs?' }),
      answer: t('jobDetail.faqAlertsA', {
        defaultValue:
          'Join our WhatsApp or Telegram channels, or set up personal email alerts on the Alerts page to receive new notifications matching your qualification and state.',
      }),
    })

    return list
  }, [job.title, job.dept, postName, lastDate, qualification, vacancies, t])

  if (!items.length) return null

  return (
    <section className="job-detail-section job-detail-faq" aria-labelledby="job-detail-faq-heading">
      <h3 id="job-detail-faq-heading" className="job-detail-section-title">
        {t('jobDetail.faqTitle', { defaultValue: 'Frequently asked questions' })}
      </h3>
      <dl className="job-detail-faq-list">
        {items.map((item) => (
          <div key={item.question} className="job-detail-faq-item">
            <dt className="job-detail-faq-q">{item.question}</dt>
            <dd className="job-detail-faq-a">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
