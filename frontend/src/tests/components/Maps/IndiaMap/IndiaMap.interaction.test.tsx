/** @vitest-environment happy-dom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { IndiaMap } from '@/components/Maps/IndiaMap/IndiaMap';

vi.mock('@/utils/mapUtils', () => ({
  fetchSVGContent: async () => '<svg viewBox="0 0 100 100"><path id="IN-KA" d="M0 0h50v50H0z"/><path id="IN-KL" d="M50 50h50v50H50z"/></svg>',
  fetchStateSvgContent: vi.fn(), normalizeIndiaMapSvg: vi.fn(), paintIsolatedStateMapPaths: vi.fn(),
  resetIndiaMapToFullView: vi.fn(), fitSvgViewBoxToContent: vi.fn(), prefetchStateSvg: vi.fn(),
}));
const stateData = [{ id:'IN-KA', name:'Karnataka', fill:'#fff', customData:{'verified districts':31} }, { id:'IN-KL', name:'Kerala', fill:'#fff' }];
beforeEach(() => vi.stubGlobal('matchMedia', () => ({ matches:true, addEventListener:vi.fn(), removeEventListener:vi.fn() })));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('announces API district counts and exposes them on keyboard focus', async () => {
  render(<IndiaMap stateData={stateData} />);
  const path=await screen.findByRole('button',{name:'Select Karnataka, 31 verified districts'});
  fireEvent.focus(path);
  expect(screen.getByRole('tooltip').textContent).toContain('31 verified districts');
  expect(path.getAttribute('aria-describedby')).toBe('india-state-tooltip');
  fireEvent.blur(path);
  expect(screen.queryByRole('tooltip')).toBeNull();
});

it('keeps selection after activation and supports controlled selection', async () => {
  const click=vi.fn();
  const {rerender}=render(<IndiaMap stateData={stateData} onStateClick={click} />);
  const path=await screen.findByRole('button',{name:'Select Karnataka, 31 verified districts'});
  fireEvent.keyDown(path,{key:'Enter'});
  expect(click).toHaveBeenCalledWith('IN-KA');
  expect(path.getAttribute('aria-pressed')).toBe('true');
  rerender(<IndiaMap stateData={stateData} onStateClick={click} selectionSyncKey="IN-KL" />);
  expect(path.getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByRole('button',{name:'Select Kerala'}).getAttribute('aria-pressed')).toBe('true');
});
