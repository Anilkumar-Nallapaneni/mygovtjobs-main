import { describe, expect, it } from 'vitest'

import { LATEST_NOTIF_STATE_CHIPS, LATEST_NOTIF_STATE_CHIP_IDS } from '@/data/statesChips'

describe('statesChips', () => {
  it('lists 36 states and UTs for latest-notifications chips', () => {
    expect(LATEST_NOTIF_STATE_CHIPS).toHaveLength(36)
    expect(new Set(LATEST_NOTIF_STATE_CHIP_IDS).size).toBe(36)
    expect(LATEST_NOTIF_STATE_CHIP_IDS).not.toContain('ne')
    expect(LATEST_NOTIF_STATE_CHIP_IDS).toContain('tr')
    expect(LATEST_NOTIF_STATE_CHIP_IDS).toContain('ch')
  })
})
