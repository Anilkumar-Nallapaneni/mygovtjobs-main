import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

import { getStoredAdminKey } from '@/lib/adminApi'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const _adminUiFlag = String(import.meta.env.VITE_ENABLE_ADMIN_UI ?? '0').trim().toLowerCase()
const ADMIN_UI_ENABLED = _adminUiFlag === '1' || _adminUiFlag === 'true'

type AdminRouteGuardProps = {
  children: ReactNode
}

/**
 * Soft frontend gate for /admin.
 * Real enforcement is backend X-Admin-Key; this only hides the UI when API/admin is disabled.
 * Unlock form still lives inside AdminDashboardPage when a session key is missing.
 */
export default function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  if (!ADMIN_UI_ENABLED || !API_BASE) {
    return <Navigate to="/" replace />
  }
  // Presence of a key is optional here — page shows unlock form when empty.
  void getStoredAdminKey
  return <>{children}</>
}
