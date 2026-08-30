import assert from 'node:assert/strict'
import { test } from 'node:test'

import { assessRollingCatalogDrop } from './verify-live-jobs-snapshot.mjs'

test('downgrades rolling drop to a warning for a valid small catalog', () => {
  const result = assessRollingCatalogDrop({
    currentCount: 17,
    previousCount: 39,
    maxRollingDropRate: 0.35,
    minPublicCatalogRows: 10,
    smallPublicCatalogWarningRows: 20,
  })

  assert.equal(result?.severity, 'warning')
  assert.match(result?.message || '', /catalog dropped 56\.4%/)
})

test('keeps rolling drop as an issue above the small-catalog ceiling', () => {
  const result = assessRollingCatalogDrop({
    currentCount: 50,
    previousCount: 100,
    maxRollingDropRate: 0.35,
    minPublicCatalogRows: 10,
    smallPublicCatalogWarningRows: 20,
  })

  assert.equal(result?.severity, 'issue')
})

test('passes when current count is within the rolling threshold', () => {
  const result = assessRollingCatalogDrop({
    currentCount: 70,
    previousCount: 100,
    maxRollingDropRate: 0.35,
    minPublicCatalogRows: 10,
    smallPublicCatalogWarningRows: 20,
  })

  assert.equal(result, null)
})
