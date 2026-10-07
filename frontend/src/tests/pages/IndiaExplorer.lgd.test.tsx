/** @vitest-environment happy-dom */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
    <Route path="/india/:stateId/district/:districtId" element={<DistrictExplorerPage />} />
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
  });
  afterEach(cleanup);

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
  });

  it('does not render a district profile or indexable canonical URL on API errors', async () => {
    vi.mocked(api.fetchIndiaDistrict).mockRejectedValue(new Error('India API 503'));
    renderRoute(`/india/ka/district/${district.id}`);
    expect(await screen.findByRole('heading', { name: 'District service unavailable' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: district.name })).toBeNull();
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,follow');
  });
});
