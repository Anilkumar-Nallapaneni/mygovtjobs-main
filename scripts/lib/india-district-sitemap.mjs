/** Accept only verified DB district UUIDs; normalized source files cannot create URLs. */
export function verifiedDistrictLocations(rows, siteUrl, stateIds) {
  const allowed = new Set(stateIds);
  const seen = new Set();
  const locations = [];
  for (const row of rows) {
    if (row?.verification_status !== 'verified' || !allowed.has(row.state_id)
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id || '')) continue;
    const loc = `${siteUrl}/india/${encodeURIComponent(row.state_id)}/district/${encodeURIComponent(row.id)}`;
    if (seen.has(loc)) continue;
    seen.add(loc);
    const date = row.updated_at ? new Date(row.updated_at) : null;
    locations.push({ loc, lastmod: date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null });
  }
  return locations;
}
