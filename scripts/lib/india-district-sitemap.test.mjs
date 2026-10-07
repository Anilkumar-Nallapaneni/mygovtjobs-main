import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { verifiedDistrictLocations } from './india-district-sitemap.mjs';

const verified = { id: 'f4f8d603-6cb7-4c70-a78f-f9d6808565d9', state_id: 'ka', verification_status: 'verified', updated_at: '2026-10-07T10:00:00Z' };

test('district sitemap publishes only verified, canonical, persisted district identities', () => {
  const rows = [verified, verified, { ...verified, verification_status: 'pending' },
    { ...verified, state_id: 'unknown' }, { ...verified, id: '../missing' },
    { state_id: 'ka', district_lgd_code: '572', verified: 'true' }];
  assert.deepEqual(verifiedDistrictLocations(rows, 'https://www.livegovtjobs.com', ['ka']), [{
    loc: `https://www.livegovtjobs.com/india/ka/district/${verified.id}`, lastmod: '2026-10-07',
  }]);
});

test('district sitemap stays empty without verified DB rows', () => {
  assert.deepEqual(verifiedDistrictLocations([], 'https://www.livegovtjobs.com', ['ka']), []);
  assert.deepEqual(verifiedDistrictLocations([{ ...verified, verification_status: 'rejected' }], 'https://www.livegovtjobs.com', ['ka']), []);
});

test('sitemap loader filters verification in the database and uses the guarded URL builder', () => {
  const script = readFileSync(new URL('../build-sitemap.mjs', import.meta.url), 'utf8');
  assert.match(script, /verification_status=eq\.verified/);
  assert.match(script, /verifiedDistrictLocations\(indiaDistricts, siteUrl, STATE_IDS\)/);
  assert.doesNotMatch(script, /lgd-districts\.csv/);
});
