import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAnalyticsConsent, getGaMeasurementId, setAnalyticsConsent } from '@/lib/analytics'

export default function AnalyticsPreferences() {
  const [open, setOpen] = useState(() => getAnalyticsConsent() === null)
  if (!getGaMeasurementId() && !import.meta.env.PROD) return null
  const choose = (value: 'accepted' | 'declined') => {
    setAnalyticsConsent(value)
    setOpen(false)
  }
  return (
    <div className="footer__analytics">
      {open ? <>
        <p>Allow optional analytics to help us understand site usage? <Link to="/privacy">Privacy policy</Link></p>
        <button type="button" onClick={() => choose('accepted')}>Accept analytics</button>
        <button type="button" onClick={() => choose('declined')}>Decline analytics</button>
      </> : <button type="button" onClick={() => setOpen(true)}>Analytics preferences</button>}
    </div>
  )
}
