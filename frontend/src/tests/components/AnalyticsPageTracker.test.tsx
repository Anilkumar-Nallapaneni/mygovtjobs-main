/** @vitest-environment happy-dom */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import AnalyticsPageTracker from '@/components/AnalyticsPageTracker';
import { trackEvent, trackPageView } from '@/lib/analytics';

vi.mock('@/lib/analytics', () => ({ initAnalytics: vi.fn(), trackPageView: vi.fn(), trackEvent: vi.fn(), trackAdmitTableView: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
  vi.stubGlobal('requestIdleCallback', (fn: () => void) => window.setTimeout(fn, 0));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('sends one intended pageview per SPA navigation without raw query terms', async () => {
  render(<MemoryRouter initialEntries={['/']}><AnalyticsPageTracker /><Link to="/jobs?q=private@example.test">Search jobs</Link><Link to="/india/ka">State</Link></MemoryRouter>);
  await act(async () => { vi.runOnlyPendingTimers(); });
  expect(trackPageView).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('link', { name: 'Search jobs' }));
  expect(trackPageView).toHaveBeenCalledTimes(2);
  expect(trackPageView).toHaveBeenLastCalledWith('/jobs');
  expect(trackEvent).toHaveBeenCalledWith('search', { query_length: 20 });
  fireEvent.click(screen.getByRole('link', { name: 'State' }));
  expect(trackPageView).toHaveBeenCalledTimes(3);
  expect(trackPageView).toHaveBeenLastCalledWith('/india/ka');
});
