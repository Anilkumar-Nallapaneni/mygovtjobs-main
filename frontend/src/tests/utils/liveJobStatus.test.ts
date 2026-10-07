import { describe, expect, it } from 'vitest';
import { adaptLiveJob } from '@/utils/liveJobAdapter';

// Status-clock scenarios only; these are never exported as public records.
const row = { id: 'status-test', title: 'Status clock test', status: 'live', last_date: '2099-12-31' };
const now = new Date('2026-10-07T06:00:00Z').getTime();

describe('truthful public job status', () => {
  it('does not label a future publication new', () => {
    expect(adaptLiveJob({ ...row, published_at: '2027-01-01' }, 0, now).status).toBe('live');
  });
  it('does not trust a legacy new tag without a recent publication', () => {
    expect(adaptLiveJob({ ...row, status: 'new', published_at: '2026-01-01' }, 0, now).status).toBe('live');
  });
  it('derives closing status from the actual deadline', () => {
    expect(adaptLiveJob({ ...row, published_at: '2026-01-01', last_date: '2026-10-10' }, 0, now).status).toBe('hot');
  });
});
