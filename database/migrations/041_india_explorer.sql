-- LiveGovtJobs India Explorer foundation
-- Apply after the existing education/job migrations.
-- This migration stores verified geographic and directory records without changing jobs.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS india_states (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT,
  administrative_type TEXT NOT NULL CHECK (administrative_type IN ('state','union_territory')),
  region TEXT,
  svg_id TEXT,
  capital TEXT,
  source_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','outdated','rejected')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS india_districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id TEXT NOT NULL REFERENCES india_states(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','outdated','rejected')),
  verified_at TIMESTAMPTZ,
  UNIQUE(state_id, name)
);

CREATE TABLE IF NOT EXISTS india_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id TEXT NOT NULL REFERENCES india_states(id) ON DELETE CASCADE,
  district_id UUID REFERENCES india_districts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  source_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','outdated','rejected')),
  verified_at TIMESTAMPTZ,
  UNIQUE(state_id, name)
);

CREATE TABLE IF NOT EXISTS india_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id TEXT NOT NULL REFERENCES india_states(id) ON DELETE CASCADE,
  district_id UUID REFERENCES india_districts(id) ON DELETE SET NULL,
  city_id UUID REFERENCES india_cities(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('school','college','university','company','industry','tourism','temple','heritage','hotel','hospital','airport','railway','transport','government_office')),
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  address TEXT,
  location GEOGRAPHY(POINT, 4326),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_name TEXT,
  source_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','outdated','rejected')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS india_agriculture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id TEXT NOT NULL REFERENCES india_states(id) ON DELETE CASCADE,
  district_id UUID REFERENCES india_districts(id) ON DELETE SET NULL,
  crop TEXT NOT NULL,
  crop_type TEXT,
  season TEXT,
  area_hectares NUMERIC,
  production_tonnes NUMERIC,
  source_name TEXT,
  source_url TEXT,
  verified_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS india_industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id TEXT NOT NULL REFERENCES india_states(id) ON DELETE CASCADE,
  district_id UUID REFERENCES india_districts(id) ON DELETE SET NULL,
  industry TEXT NOT NULL,
  description TEXT,
  source_name TEXT,
  source_url TEXT,
  verified_at TIMESTAMPTZ,
  UNIQUE(state_id, district_id, industry)
);

CREATE TABLE IF NOT EXISTS india_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id TEXT NOT NULL REFERENCES india_states(id) ON DELETE CASCADE,
  district_id UUID REFERENCES india_districts(id) ON DELETE SET NULL,
  fact_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source_name TEXT,
  source_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','outdated','rejected')),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_india_districts_state ON india_districts(state_id);
CREATE INDEX IF NOT EXISTS idx_india_cities_state ON india_cities(state_id);
CREATE INDEX IF NOT EXISTS idx_india_cities_location ON india_cities USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_india_places_state_category ON india_places(state_id, category);
CREATE INDEX IF NOT EXISTS idx_india_places_location ON india_places USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_india_places_status ON india_places(verification_status);
CREATE INDEX IF NOT EXISTS idx_india_agriculture_state_crop ON india_agriculture(state_id, crop);
CREATE INDEX IF NOT EXISTS idx_india_industries_state ON india_industries(state_id);
CREATE INDEX IF NOT EXISTS idx_india_facts_state_type ON india_facts(state_id, fact_type);

ALTER TABLE india_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_agriculture ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_facts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS india_states_public_read ON india_states;
CREATE POLICY india_states_public_read ON india_states FOR SELECT USING (verification_status = 'verified');
DROP POLICY IF EXISTS india_districts_public_read ON india_districts;
CREATE POLICY india_districts_public_read ON india_districts FOR SELECT USING (verification_status = 'verified');
DROP POLICY IF EXISTS india_cities_public_read ON india_cities;
CREATE POLICY india_cities_public_read ON india_cities FOR SELECT USING (verification_status = 'verified');
DROP POLICY IF EXISTS india_places_public_read ON india_places;
CREATE POLICY india_places_public_read ON india_places FOR SELECT USING (verification_status = 'verified');
DROP POLICY IF EXISTS india_agriculture_public_read ON india_agriculture;
CREATE POLICY india_agriculture_public_read ON india_agriculture FOR SELECT USING (verified_at IS NOT NULL);
DROP POLICY IF EXISTS india_industries_public_read ON india_industries;
CREATE POLICY india_industries_public_read ON india_industries FOR SELECT USING (verified_at IS NOT NULL);
DROP POLICY IF EXISTS india_facts_public_read ON india_facts;
CREATE POLICY india_facts_public_read ON india_facts FOR SELECT USING (verification_status = 'verified');
