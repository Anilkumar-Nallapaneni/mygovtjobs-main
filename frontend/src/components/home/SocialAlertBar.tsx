import { useTranslation } from 'react-i18next'

const WHATSAPP_URL = (import.meta.env.VITE_WHATSAPP_GROUP_URL || '').trim()
const TELEGRAM_URL = (
  import.meta.env.VITE_TELEGRAM_CHANNEL_URL ||
  import.meta.env.VITE_SOCIAL_TELEGRAM_URL ||
  ''
).trim()

type SocialAlertBarProps = {
  /** Show optional WhatsApp share for a job */
  shareTitle?: string
  shareUrl?: string
  className?: string
  compact?: boolean
}

function buildWhatsAppShareUrl(text: string, url: string) {
  const message = `${text}\n${url}`
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

export default function SocialAlertBar({
  shareTitle,
  shareUrl,
  className = '',
  compact = false,
}: SocialAlertBarProps) {
  const { t } = useTranslation()
  const showShare = Boolean(shareTitle && shareUrl)
  const hasChannels = Boolean(WHATSAPP_URL || TELEGRAM_URL)

  if (!hasChannels && !showShare) return null

  return (
    <aside
      className={`social-alert-bar${compact ? ' social-alert-bar--compact' : ''}${className ? ` ${className}` : ''}`}
      aria-label={t('socialAlert.title', { defaultValue: 'Get job alerts' })}
    >
      <div className="social-alert-bar__inner">
        <p className="social-alert-bar__label">
          {t('socialAlert.title', { defaultValue: 'Get alerts' })}
        </p>
        <div className="social-alert-bar__actions">
          {WHATSAPP_URL ? (
            <a
              href={WHATSAPP_URL}
              className="social-alert-bar__btn social-alert-bar__btn--whatsapp"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('socialAlert.joinWhatsApp', { defaultValue: 'Join WhatsApp' })}
            </a>
          ) : null}
          {TELEGRAM_URL ? (
            <a
              href={TELEGRAM_URL}
              className="social-alert-bar__btn social-alert-bar__btn--telegram"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('socialAlert.joinTelegram', { defaultValue: 'Join Telegram' })}
            </a>
          ) : null}
          <a href="/alerts" className="social-alert-bar__btn social-alert-bar__btn--personal">
            {t('socialAlert.personalAlerts', { defaultValue: 'Personal alerts' })}
          </a>
          {showShare ? (
            <a
              href={buildWhatsAppShareUrl(shareTitle!, shareUrl!)}
              className="social-alert-bar__btn social-alert-bar__btn--share"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('socialAlert.shareJob', { defaultValue: 'Share on WhatsApp' })}
            </a>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
