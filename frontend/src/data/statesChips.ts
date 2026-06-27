import { STATES } from '@/data/states'

/** Chip row for latest-notifications — 28 states + 8 UTs (excludes bundled `ne`). */
export type StateChipDef = {
  id: string
  n: string
  ab: string
}

export const LATEST_NOTIF_STATE_CHIPS: StateChipDef[] = STATES.filter((s) => s.id !== 'ne').map(
  (s) => ({
    id: s.id,
    n: s.n,
    ab: s.ab,
  })
)

export const LATEST_NOTIF_STATE_CHIP_IDS = LATEST_NOTIF_STATE_CHIPS.map((s) => s.id)

/** @deprecated bundled NE map id — use individual NE state ids */
export const NE_SUBSTATE_IDS = ['ar', 'mn', 'ml', 'mz', 'nl', 'tr'] as const

const CHIP_BY_ID = new Map(LATEST_NOTIF_STATE_CHIPS.map((s) => [s.id, s]))

export function getLatestNotifStateChip(stateId: string | null | undefined): StateChipDef | null {
  if (!stateId) return null
  return CHIP_BY_ID.get(stateId.toLowerCase()) ?? null
}

export function isValidLatestNotifStateId(id: string | null | undefined): id is string {
  return Boolean(id && CHIP_BY_ID.has(id.toLowerCase()))
}
