/** @vitest-environment happy-dom */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import IndiaExplorerPage from '@/pages/IndiaExplorerPage';
import StateExplorerPage from '@/pages/StateExplorerPage';
import DistrictExplorerPage from '@/pages/DistrictExplorerPage';
import * as api from '@/lib/indiaApi';
import { getExplorerState } from '@/data/india/indiaExplorer';

vi.mock('@/components/Maps/IndiaMap/IndiaMap', () => ({ IndiaMap: () => <div aria-label="India map" /> }));
vi.mock('@/lib/indiaApi', () => ({
  fetchIndiaOverview: vi.fn(), fetchIndiaStates: vi.fn(), fetchIndiaState: vi.fn(),
  fetchIndiaDistricts: vi.fn(), fetchIndiaDistrictDirectory: vi.fn(), fetchIndiaDistrict: vi.fn(),
  fetchIndiaDistrictCities: vi.fn(), fetchIndiaCategory: vi.fn(),
}));

// District test values are read from the official normalized source, never generated names.
const csv = readFileSync(join(process.cwd(), '../data/india/normalized/lgd-districts.csv'), 'utf8');
const line = csv.split(/\r?\n/).find(row => row.startsWith('ka,'));
if (!line) throw new Error('Official LGD snapshot must cover Karnataka');
const columns = Array.from(line.matchAll(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g), match => match[1].replace(/^"|"$/g, '').replace(/""/g, '"'));
const district: api.IndiaDistrict = {
  id: 'f4f8d603-6cb7-4c70-a78f-f9d6808565d9', state_id: columns[0], state_name: columns[2],
  lgd_state_code: columns[1], lgd_district_code: columns[3], name: columns[4], slug: null,
  source_name: 'Local Government Directory (LGD)', source_url: 'https://lgdirectory.gov.in/',
  verification_status: 'verified', city_count: 0, place_count: 0,
  provenance: { source_download_date: '2026-10-07' },
};

function renderRoute(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/india" element={<IndiaExplorerPage />} />
    <Route path="/india/:stateId" element={<StateExplorerPage />} />
    <Route path="/india/:stateId/:category" element={<StateExplorerPage />} />
    <Route path="/india/:stateId/district/:districtId" element={<DistrictExplorerPage />} />
    <Route path="/india/:stateId/district/:districtId/:category" element={<DistrictExplorerPage />} />
  </Routes></MemoryRouter>);
}

describe('official LGD district browsing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.fetchIndiaOverview).mockResolvedValue({ states: 36, districts: 0, cities: 0, places: 0, schools: 0, colleges: 0, universities: 0, hospitals: 0, companies: 0 });
    vi.mocked(api.fetchIndiaStates).mockResolvedValue([]);
    vi.mocked(api.fetchIndiaState).mockResolvedValue({ id: 'ka', name: 'Karnataka', abbreviation: 'KA', administrative_type: 'state', region: 'south', svg_id: 'IN-KA', district_count: 1, city_count: 0, place_count: 0, job_count: 0, counts: { districts: 1, cities: 0, places: 0, jobs: 0 } });
    vi.mocked(api.fetchIndiaDistricts).mockResolvedValue([district]);
    vi.mocked(api.fetchIndiaDistrictDirectory).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.fetchIndiaDistrict).mockResolvedValue(district);
    vi.mocked(api.fetchIndiaDistrictCities).mockResolvedValue([]);
    vi.mocked(api.fetchIndiaCategory).mockResolvedValue({ items: [], total: 0, category: 'education', state_id: 'ka' });
  });
  afterEach(cleanup);

  it('renders API district counts, including zero, without unavailable city counts', async () => {
    vi.mocked(api.fetchIndiaStates).mockResolvedValue([
      { id: 'ka', name: 'Karnataka', abbreviation: 'KA', administrative_type: 'state', region: 'south', svg_id: 'IN-KA', district_count: 31, city_count: 0, place_count: 0, job_count: 0 },
      { id: 'dl', name: 'Delhi', abbreviation: 'DL', administrative_type: 'union_territory', region: 'north', svg_id: 'IN-DL', district_count: 0, city_count: 0, place_count: 0, job_count: 0 },
    ]);
    renderRoute('/india');
    expect(await screen.findByText('31 verified districts')).toBeTruthy();
    expect(screen.getByText('0 verified districts')).toBeTruthy();
    expect(document.querySelector('.india-explorer__state-grid')?.textContent).not.toMatch(/cities|—/);
  });

  it('keeps state navigation and an explicit error when verified counts fail', async () => {
    vi.mocked(api.fetchIndiaStates).mockRejectedValue(new Error('India API 503'));
    renderRoute('/india');
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('State service unavailable');
    expect(alert.textContent).toContain('India API 503');
    expect(document.querySelectorAll('.india-explorer__state-grid button')).toHaveLength(36);
    expect(document.querySelectorAll('.india-explorer__state-grid small')).toHaveLength(0);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search state or Union Territory' }), { target: { value: 'Karnataka' } });
    expect(document.querySelectorAll('.india-explorer__state-grid button')).toHaveLength(1);
  });

  it('keeps all 36 states visible with an empty directory and shows official attribution', async () => {
    renderRoute('/india');
    await screen.findByText(/No verified district records match/);
    expect(document.querySelectorAll('.india-explorer__state-grid button')).toHaveLength(36);
    expect(screen.getByText(/Ministry of Panchayati Raj/)).toBeTruthy();
    expect(screen.getByText(/not affiliated with or endorsed/)).toBeTruthy();
  });

  it('resolves the Karnataka slug to existing state ID and renders backend districts', async () => {
    renderRoute('/india/karnataka');
    const link = await screen.findByRole('link', { name: `${district.name} Open district →` });
    expect(link.getAttribute('href')).toBe(`/india/ka/district/${district.id}`);
    expect(api.fetchIndiaDistricts).toHaveBeenCalledWith('ka');
    expect(getExplorerState('karnataka')?.id).toBe('ka');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch(/\/india\/ka$/);
  });

  it('shows the state directory empty state without substituting names', async () => {
    vi.mocked(api.fetchIndiaDistricts).mockResolvedValue([]);
    renderRoute('/india/ka');
    expect(await screen.findByText('Verified district data is not loaded for Karnataka')).toBeTruthy();
    expect(screen.queryByText(district.name)).toBeNull();
  });

  it('shows state directory errors without district links', async () => {
    vi.mocked(api.fetchIndiaDistricts).mockRejectedValue(new Error('India API 503'));
    renderRoute('/india/ka');
    expect(await screen.findByText('District service unavailable')).toBeTruthy();
    expect(document.querySelectorAll('.state-explorer__district-card')).toHaveLength(0);
  });

  it('distinguishes the India directory service error from an empty search', async () => {
    vi.mocked(api.fetchIndiaDistrictDirectory).mockRejectedValue(new Error('India API 503'));
    renderRoute('/india');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText(/No verified district records match/)).toBeNull();
  });

  it('renders official district identifiers, provenance and canonical UUID URL', async () => {
    renderRoute(`/india/karnataka/district/${district.id}`);
    expect(await screen.findByRole('heading', { name: district.name })).toBeTruthy();
    expect(api.fetchIndiaDistrict).toHaveBeenCalledWith('ka', district.id);
    expect(screen.getByText(district.lgd_district_code!)).toBeTruthy();
    expect(screen.getByText('2026-10-07')).toBeTruthy();
    await waitFor(() => expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch(new RegExp(`/india/ka/district/${district.id}$`)));
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,follow');
  });

  it('does not render a district profile or indexable canonical URL on API errors', async () => {
    vi.mocked(api.fetchIndiaDistrict).mockRejectedValue(new Error('India API 503'));
    renderRoute(`/india/ka/district/${district.id}`);
    expect(await screen.findByRole('heading', { name: 'District service unavailable' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: district.name })).toBeNull();
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,follow');
  });

  it('searches persisted districts and shows a truthful no-match state', async () => {
    renderRoute('/india/ka');
    await screen.findByRole('link', { name: `${district.name} Open district →` });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search districts' }), { target: { value: 'no matching district' } });
    expect(screen.getByText('No verified districts match your search.')).toBeTruthy();
    expect(screen.queryByText(district.name)).toBeNull();
  });

  it('distinguishes category API failure from verified empty data', async () => {
    vi.mocked(api.fetchIndiaCategory).mockRejectedValue(new Error('India API 503'));
    renderRoute('/india/ka/education');
    expect(await screen.findByText(/Category service unavailable/)).toBeTruthy();
    expect(screen.queryByText('No verified records yet.')).toBeNull();
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch(/\/india\/ka\/education$/);
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,follow');
  });

  it('reports city API failure without inventing an empty directory', async () => {
    vi.mocked(api.fetchIndiaDistrictCities).mockRejectedValue(new Error('India API 503'));
    renderRoute(`/india/ka/district/${district.id}`);
    expect(await screen.findByText(/City service unavailable/)).toBeTruthy();
    expect(screen.queryByText('No verified city records yet.')).toBeNull();
  });
});
