-- LiveGovtJobs India Explorer production backend
-- Adds source attribution, slugs, search, import runs and public directory indexes.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS india_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('government','official_portal','open_data','licensed','editorial')),
  base_url TEXT NOT NULL,
  license TEXT,
  refresh_policy TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS india_import_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES india_sources(id) ON DELETE SET NULL,
  dataset TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started','completed','failed','partial')),
  records_seen INTEGER NOT NULL DEFAULT 0,
  records_inserted INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  records_rejected INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

INSERT INTO india_sources (name, source_type, base_url, license, refresh_policy)
VALUES
  ('Local Government Directory (LGD)', 'government', 'https://lgdirectory.gov.in/', 'Government of India / official directory', 'Monthly'),
  ('Open Government Data Platform India', 'open_data', 'https://data.gov.in/', 'Government Open Data License - India', 'Dataset dependent'),
  ('Survey of India Administrative Boundary Database', 'government', 'https://onlinemaps.surveyofindia.gov.in/', 'See Survey of India product terms', 'Version dependent'),
  ('Census of India Location Code Directory', 'government', 'https://censusindia.gov.in/nada/index.php/catalog/42648', 'Census of India data terms', 'Historical reference / use with date'),
  ('Census of India Data Tables', 'government', 'https://censusindia.gov.in/census.website/node/91', 'Census of India data terms', 'Dataset dependent'),
  ('LiveGovtJobs verified education dataset', 'editorial', 'https://www.livegovtjobs.com/education', 'LiveGovtJobs verification record; underlying institution source is stored per record', 'Manual verification')
ON CONFLICT (name) DO UPDATE SET base_url = EXCLUDED.base_url, updated_at = NOW();

ALTER TABLE india_states ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE india_states ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES india_sources(id) ON DELETE SET NULL;
ALTER TABLE india_states ADD COLUMN IF NOT EXISTS source_record_id TEXT;
ALTER TABLE india_states ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE india_districts ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE india_districts ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES india_sources(id) ON DELETE SET NULL;
ALTER TABLE india_districts ADD COLUMN IF NOT EXISTS source_record_id TEXT;
ALTER TABLE india_districts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE india_cities ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE india_cities ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES india_sources(id) ON DELETE SET NULL;
ALTER TABLE india_cities ADD COLUMN IF NOT EXISTS source_record_id TEXT;
ALTER TABLE india_cities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE india_places ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE india_places ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES india_sources(id) ON DELETE SET NULL;
ALTER TABLE india_places ADD COLUMN IF NOT EXISTS source_record_id TEXT;
ALTER TABLE india_places ADD COLUMN IF NOT EXISTS search_document tsvector;
ALTER TABLE india_agriculture ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES india_sources(id) ON DELETE SET NULL;
ALTER TABLE india_industries ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES india_sources(id) ON DELETE SET NULL;
ALTER TABLE india_facts ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES india_sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_india_states_slug ON india_states(slug);
CREATE UNIQUE INDEX IF NOT EXISTS uq_india_districts_state_slug ON india_districts(state_id, slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_india_cities_state_slug ON india_cities(state_id, slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_india_places_slug ON india_places(state_id, city_id, slug);
CREATE INDEX IF NOT EXISTS idx_india_places_trgm_name ON india_places USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_india_places_search_document ON india_places USING GIN (search_document);
CREATE INDEX IF NOT EXISTS idx_india_import_runs_dataset ON india_import_runs(dataset, started_at DESC);

CREATE OR REPLACE FUNCTION india_places_search_document_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector('simple', concat_ws(' ', NEW.name, NEW.category, NEW.description, NEW.address));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_india_places_search_document ON india_places;
CREATE TRIGGER trg_india_places_search_document
BEFORE INSERT OR UPDATE OF name, category, description, address ON india_places
FOR EACH ROW EXECUTE FUNCTION india_places_search_document_trigger();

CREATE OR REPLACE FUNCTION india_slugify(value TEXT) RETURNS TEXT AS $$
  SELECT trim(both '-' from regexp_replace(lower(unaccent(coalesce(value, ''))), '[^a-z0-9]+', '-', 'g'));
$$ LANGUAGE sql IMMUTABLE;

UPDATE india_states SET slug = india_slugify(name) WHERE slug IS NULL;
UPDATE india_districts SET slug = india_slugify(name) WHERE slug IS NULL;
UPDATE india_cities SET slug = india_slugify(name) WHERE slug IS NULL;

-- State master baseline. Administrative names are attributed to the current LGD source;
-- district/city/place data must be refreshed from their current source datasets.
WITH src AS (SELECT id FROM india_sources WHERE name='Local Government Directory (LGD)')
INSERT INTO india_states (id,name,abbreviation,administrative_type,region,svg_id,source_id,source_url,verification_status,verified_at)
VALUES
('jk','Jammu & Kashmir','J&K','union_territory','north','IN-JK',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('la','Ladakh','LA','union_territory','north','IN-LA',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('hp','Himachal Pradesh','HP','state','north','IN-HP',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('pb','Punjab','PB','state','north','IN-PB',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('hr','Haryana','HR','state','north','IN-HR',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('dl','Delhi','DL','union_territory','north','IN-DL',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('ch','Chandigarh','CH','union_territory','north','IN-CH',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('uk','Uttarakhand','UK','state','north','IN-UT',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('rj','Rajasthan','RJ','state','north','IN-RJ',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('up','Uttar Pradesh','UP','state','north','IN-UP',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('br','Bihar','BR','state','east','IN-BR',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('sk','Sikkim','SK','state','northeast','IN-SK',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('wb','West Bengal','WB','state','east','IN-WB',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('as','Assam','AS','state','northeast','IN-AS',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('ar','Arunachal Pradesh','AR','state','northeast','IN-AR',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('nl','Nagaland','NL','state','northeast','IN-NL',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('mn','Manipur','MN','state','northeast','IN-MN',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('mz','Mizoram','MZ','state','northeast','IN-MZ',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('tr','Tripura','TR','state','northeast','IN-TR',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('ml','Meghalaya','ML','state','northeast','IN-ML',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('jh','Jharkhand','JH','state','east','IN-JH',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('od','Odisha','OD','state','east','IN-OR',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('mp','Madhya Pradesh','MP','state','central','IN-MP',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('cg','Chhattisgarh','CG','state','central','IN-CT',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('gj','Gujarat','GJ','state','west','IN-GJ',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('dd','Dadra & Nagar Haveli and Daman & Diu','DD','union_territory','west','IN-DH',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('mh','Maharashtra','MH','state','west','IN-MH',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('ga','Goa','GA','state','west','IN-GA',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('tg','Telangana','TG','state','south','IN-TG',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('ap','Andhra Pradesh','AP','state','south','IN-AP',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('ka','Karnataka','KA','state','south','IN-KA',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('kl','Kerala','KL','state','south','IN-KL',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('tn','Tamil Nadu','TN','state','south','IN-TN',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('py','Puducherry','PY','union_territory','south','IN-PY',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('an','Andaman & Nicobar Islands','AN','union_territory','east','IN-AN',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW()),
('ld','Lakshadweep','LD','union_territory','south','IN-LD',(SELECT id FROM src),'https://lgdirectory.gov.in/','verified',NOW())
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, abbreviation=EXCLUDED.abbreviation, administrative_type=EXCLUDED.administrative_type,
  region=EXCLUDED.region, svg_id=EXCLUDED.svg_id, source_id=EXCLUDED.source_id, source_url=EXCLUDED.source_url,
  verification_status='verified', verified_at=NOW(), updated_at=NOW();

-- Keep public reads restricted to verified records.
ALTER TABLE india_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_import_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS india_sources_public_read ON india_sources;
CREATE POLICY india_sources_public_read ON india_sources FOR SELECT USING (active = TRUE);
DROP POLICY IF EXISTS india_import_runs_public_none ON india_import_runs;
CREATE POLICY india_import_runs_public_none ON india_import_runs FOR SELECT USING (FALSE);

-- Public search view. Directory records only; job search remains on the existing job API.
CREATE OR REPLACE VIEW india_directory_search AS
SELECT id::text AS id, 'state'::text AS record_type, id AS record_key, name, name AS parent_name,
       NULL::text AS state_id, source_url, verification_status
FROM india_states WHERE verification_status='verified'
UNION ALL
SELECT d.id::text, 'district', d.id::text, d.name, s.name, d.state_id, d.source_url, d.verification_status
FROM india_districts d JOIN india_states s ON s.id=d.state_id WHERE d.verification_status='verified'
UNION ALL
SELECT c.id::text, 'city', c.id::text, c.name, s.name, c.state_id, c.source_url, c.verification_status
FROM india_cities c JOIN india_states s ON s.id=c.state_id WHERE c.verification_status='verified'
UNION ALL
SELECT p.id::text, p.category, p.id::text, p.name, s.name, p.state_id, p.source_url, p.verification_status
FROM india_places p JOIN india_states s ON s.id=p.state_id WHERE p.verification_status='verified';

GRANT SELECT ON india_sources TO anon, authenticated;
GRANT SELECT ON india_states TO anon, authenticated;
GRANT SELECT ON india_districts TO anon, authenticated;
GRANT SELECT ON india_cities TO anon, authenticated;
GRANT SELECT ON india_places TO anon, authenticated;
GRANT SELECT ON india_agriculture TO anon, authenticated;
GRANT SELECT ON india_industries TO anon, authenticated;
GRANT SELECT ON india_facts TO anon, authenticated;

GRANT SELECT ON india_directory_search TO anon, authenticated;
