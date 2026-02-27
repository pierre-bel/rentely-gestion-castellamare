-- Step 1: Create helper function for timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create countries table
CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(2) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone_code VARCHAR(10),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for countries
CREATE INDEX idx_countries_code ON countries(code);
CREATE INDEX idx_countries_name ON countries(name);
CREATE INDEX idx_countries_is_active ON countries(is_active);

-- RLS Policies for countries
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Countries are viewable by everyone" 
  ON countries FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can insert countries" 
  ON countries FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update countries" 
  ON countries FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete countries" 
  ON countries FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for countries
CREATE TRIGGER update_countries_updated_at
  BEFORE UPDATE ON countries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 3: Create states_regions table
CREATE TABLE states_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  code VARCHAR(10),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(country_id, code)
);

-- Indexes for states_regions
CREATE INDEX idx_states_country_id ON states_regions(country_id);
CREATE INDEX idx_states_name ON states_regions(name);
CREATE INDEX idx_states_is_active ON states_regions(is_active);
CREATE INDEX idx_states_country_name ON states_regions(country_id, name);

-- RLS Policies for states_regions
ALTER TABLE states_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "States are viewable by everyone" 
  ON states_regions FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can insert states" 
  ON states_regions FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update states" 
  ON states_regions FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete states" 
  ON states_regions FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for states_regions
CREATE TRIGGER update_states_regions_updated_at
  BEFORE UPDATE ON states_regions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Create cities table
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_region_id UUID REFERENCES states_regions(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  timezone VARCHAR(50),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for cities
CREATE INDEX idx_cities_country_id ON cities(country_id);
CREATE INDEX idx_cities_state_region_id ON cities(state_region_id);
CREATE INDEX idx_cities_name ON cities(name);
CREATE INDEX idx_cities_is_active ON cities(is_active);
CREATE INDEX idx_cities_country_name ON cities(country_id, name);

-- RLS Policies for cities
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cities are viewable by everyone" 
  ON cities FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can insert cities" 
  ON cities FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cities" 
  ON cities FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cities" 
  ON cities FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for cities
CREATE TRIGGER update_cities_updated_at
  BEFORE UPDATE ON cities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Add foreign keys to listings table
ALTER TABLE listings ADD COLUMN country_id UUID REFERENCES countries(id);
ALTER TABLE listings ADD COLUMN state_region_id UUID REFERENCES states_regions(id);
ALTER TABLE listings ADD COLUMN city_id UUID REFERENCES cities(id);

-- Indexes for listings foreign keys
CREATE INDEX idx_listings_country_id ON listings(country_id);
CREATE INDEX idx_listings_state_region_id ON listings(state_region_id);
CREATE INDEX idx_listings_city_id ON listings(city_id);
CREATE INDEX idx_listings_location ON listings(country_id, state_region_id, city_id) WHERE status = 'approved';

-- Step 6: Seed initial country data
INSERT INTO countries (code, name, phone_code) VALUES
  ('US', 'United States', '+1'),
  ('CA', 'Canada', '+1'),
  ('MX', 'Mexico', '+52'),
  ('GB', 'United Kingdom', '+44'),
  ('FR', 'France', '+33'),
  ('DE', 'Germany', '+49'),
  ('ES', 'Spain', '+34'),
  ('IT', 'Italy', '+39'),
  ('PT', 'Portugal', '+351'),
  ('NL', 'Netherlands', '+31'),
  ('BE', 'Belgium', '+32'),
  ('CH', 'Switzerland', '+41'),
  ('AT', 'Austria', '+43'),
  ('JP', 'Japan', '+81'),
  ('AU', 'Australia', '+61');