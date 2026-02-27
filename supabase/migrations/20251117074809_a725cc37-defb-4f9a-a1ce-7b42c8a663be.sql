-- Phase 2A: Seed location data for states/regions and cities

-- Insert States/Regions for USA
INSERT INTO public.states_regions (country_id, code, name, type, is_active) 
SELECT c.id, state_code, state_name, 'state', true
FROM public.countries c,
(VALUES 
  ('US', 'CA', 'California'),
  ('US', 'NY', 'New York'),
  ('US', 'TX', 'Texas'),
  ('US', 'FL', 'Florida'),
  ('US', 'IL', 'Illinois'),
  ('US', 'WA', 'Washington'),
  ('US', 'MA', 'Massachusetts'),
  ('US', 'CO', 'Colorado'),
  ('US', 'OR', 'Oregon'),
  ('US', 'GA', 'Georgia'),
  ('US', 'NC', 'North Carolina'),
  ('US', 'AZ', 'Arizona'),
  ('US', 'NV', 'Nevada'),
  ('US', 'MI', 'Michigan'),
  ('US', 'PA', 'Pennsylvania')
) AS states(country_code, state_code, state_name)
WHERE c.code = states.country_code;

-- Insert States/Regions for Canada
INSERT INTO public.states_regions (country_id, code, name, type, is_active) 
SELECT c.id, prov_code, prov_name, 'province', true
FROM public.countries c,
(VALUES 
  ('CA', 'ON', 'Ontario'),
  ('CA', 'BC', 'British Columbia'),
  ('CA', 'QC', 'Quebec'),
  ('CA', 'AB', 'Alberta'),
  ('CA', 'MB', 'Manitoba'),
  ('CA', 'SK', 'Saskatchewan')
) AS provinces(country_code, prov_code, prov_name)
WHERE c.code = provinces.country_code;

-- Insert States/Regions for Germany
INSERT INTO public.states_regions (country_id, code, name, type, is_active) 
SELECT c.id, state_code, state_name, 'state', true
FROM public.countries c,
(VALUES 
  ('DE', 'BY', 'Bavaria'),
  ('DE', 'BE', 'Berlin'),
  ('DE', 'HH', 'Hamburg'),
  ('DE', 'HE', 'Hesse'),
  ('DE', 'NW', 'North Rhine-Westphalia')
) AS states(country_code, state_code, state_name)
WHERE c.code = states.country_code;

-- Insert States/Regions for Australia
INSERT INTO public.states_regions (country_id, code, name, type, is_active) 
SELECT c.id, state_code, state_name, 'state', true
FROM public.countries c,
(VALUES 
  ('AU', 'NSW', 'New South Wales'),
  ('AU', 'VIC', 'Victoria'),
  ('AU', 'QLD', 'Queensland'),
  ('AU', 'WA', 'Western Australia')
) AS states(country_code, state_code, state_name)
WHERE c.code = states.country_code;

-- Insert Cities for USA
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, sr.id, city_name, tz, true
FROM public.countries c
JOIN public.states_regions sr ON sr.country_id = c.id
CROSS JOIN (VALUES 
  ('California', 'Los Angeles', 'America/Los_Angeles'),
  ('California', 'San Francisco', 'America/Los_Angeles'),
  ('California', 'San Diego', 'America/Los_Angeles'),
  ('New York', 'New York', 'America/New_York'),
  ('Texas', 'Houston', 'America/Chicago'),
  ('Texas', 'Austin', 'America/Chicago'),
  ('Texas', 'Dallas', 'America/Chicago'),
  ('Florida', 'Miami', 'America/New_York'),
  ('Florida', 'Orlando', 'America/New_York'),
  ('Illinois', 'Chicago', 'America/Chicago'),
  ('Washington', 'Seattle', 'America/Los_Angeles'),
  ('Massachusetts', 'Boston', 'America/New_York'),
  ('Colorado', 'Denver', 'America/Denver'),
  ('Oregon', 'Portland', 'America/Los_Angeles'),
  ('Georgia', 'Atlanta', 'America/New_York'),
  ('Arizona', 'Phoenix', 'America/Phoenix'),
  ('Nevada', 'Las Vegas', 'America/Los_Angeles')
) AS cities(state_name, city_name, tz)
WHERE c.code = 'US' AND sr.name = cities.state_name;

-- Insert Cities for Canada
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, sr.id, city_name, tz, true
FROM public.countries c
JOIN public.states_regions sr ON sr.country_id = c.id
CROSS JOIN (VALUES 
  ('Ontario', 'Toronto', 'America/Toronto'),
  ('Ontario', 'Ottawa', 'America/Toronto'),
  ('British Columbia', 'Vancouver', 'America/Vancouver'),
  ('Quebec', 'Montreal', 'America/Toronto'),
  ('Alberta', 'Calgary', 'America/Edmonton')
) AS cities(prov_name, city_name, tz)
WHERE c.code = 'CA' AND sr.name = cities.prov_name;

-- Insert Cities for Mexico
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, NULL, city_name, tz, true
FROM public.countries c
CROSS JOIN (VALUES 
  ('Mexico City', 'America/Mexico_City'),
  ('Cancun', 'America/Cancun'),
  ('Guadalajara', 'America/Mexico_City'),
  ('Monterrey', 'America/Monterrey'),
  ('Playa del Carmen', 'America/Cancun')
) AS cities(city_name, tz)
WHERE c.code = 'MX';

-- Insert Cities for UK
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, NULL, city_name, tz, true
FROM public.countries c
CROSS JOIN (VALUES 
  ('London', 'Europe/London'),
  ('Manchester', 'Europe/London'),
  ('Edinburgh', 'Europe/London'),
  ('Birmingham', 'Europe/London'),
  ('Liverpool', 'Europe/London'),
  ('Bristol', 'Europe/London')
) AS cities(city_name, tz)
WHERE c.code = 'GB';

-- Insert Cities for France
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, NULL, city_name, tz, true
FROM public.countries c
CROSS JOIN (VALUES 
  ('Paris', 'Europe/Paris'),
  ('Nice', 'Europe/Paris'),
  ('Lyon', 'Europe/Paris'),
  ('Marseille', 'Europe/Paris'),
  ('Bordeaux', 'Europe/Paris'),
  ('Cannes', 'Europe/Paris')
) AS cities(city_name, tz)
WHERE c.code = 'FR';

-- Insert Cities for Germany
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, sr.id, city_name, tz, true
FROM public.countries c
JOIN public.states_regions sr ON sr.country_id = c.id
CROSS JOIN (VALUES 
  ('Bavaria', 'Munich', 'Europe/Berlin'),
  ('Berlin', 'Berlin', 'Europe/Berlin'),
  ('Hamburg', 'Hamburg', 'Europe/Berlin'),
  ('Hesse', 'Frankfurt', 'Europe/Berlin'),
  ('North Rhine-Westphalia', 'Cologne', 'Europe/Berlin')
) AS cities(state_name, city_name, tz)
WHERE c.code = 'DE' AND sr.name = cities.state_name;

-- Insert Cities for Spain
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, NULL, city_name, tz, true
FROM public.countries c
CROSS JOIN (VALUES 
  ('Madrid', 'Europe/Madrid'),
  ('Barcelona', 'Europe/Madrid'),
  ('Valencia', 'Europe/Madrid'),
  ('Seville', 'Europe/Madrid'),
  ('Mallorca', 'Europe/Madrid'),
  ('Ibiza', 'Europe/Madrid')
) AS cities(city_name, tz)
WHERE c.code = 'ES';

-- Insert Cities for Italy
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, NULL, city_name, tz, true
FROM public.countries c
CROSS JOIN (VALUES 
  ('Rome', 'Europe/Rome'),
  ('Milan', 'Europe/Rome'),
  ('Florence', 'Europe/Rome'),
  ('Venice', 'Europe/Rome'),
  ('Naples', 'Europe/Rome'),
  ('Turin', 'Europe/Rome')
) AS cities(city_name, tz)
WHERE c.code = 'IT';

-- Insert Cities for Portugal
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, NULL, city_name, tz, true
FROM public.countries c
CROSS JOIN (VALUES 
  ('Lisbon', 'Europe/Lisbon'),
  ('Porto', 'Europe/Lisbon'),
  ('Faro', 'Europe/Lisbon'),
  ('Albufeira', 'Europe/Lisbon')
) AS cities(city_name, tz)
WHERE c.code = 'PT';

-- Insert Cities for Netherlands
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, NULL, city_name, tz, true
FROM public.countries c
CROSS JOIN (VALUES 
  ('Amsterdam', 'Europe/Amsterdam'),
  ('Rotterdam', 'Europe/Amsterdam'),
  ('The Hague', 'Europe/Amsterdam'),
  ('Utrecht', 'Europe/Amsterdam')
) AS cities(city_name, tz)
WHERE c.code = 'NL';

-- Insert Cities for Belgium
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, NULL, city_name, tz, true
FROM public.countries c
CROSS JOIN (VALUES 
  ('Brussels', 'Europe/Brussels'),
  ('Antwerp', 'Europe/Brussels'),
  ('Bruges', 'Europe/Brussels'),
  ('Ghent', 'Europe/Brussels')
) AS cities(city_name, tz)
WHERE c.code = 'BE';

-- Insert Cities for Switzerland
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, NULL, city_name, tz, true
FROM public.countries c
CROSS JOIN (VALUES 
  ('Zurich', 'Europe/Zurich'),
  ('Geneva', 'Europe/Zurich'),
  ('Lucerne', 'Europe/Zurich'),
  ('Bern', 'Europe/Zurich'),
  ('Basel', 'Europe/Zurich')
) AS cities(city_name, tz)
WHERE c.code = 'CH';

-- Insert Cities for Austria
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, NULL, city_name, tz, true
FROM public.countries c
CROSS JOIN (VALUES 
  ('Vienna', 'Europe/Vienna'),
  ('Salzburg', 'Europe/Vienna'),
  ('Innsbruck', 'Europe/Vienna'),
  ('Graz', 'Europe/Vienna')
) AS cities(city_name, tz)
WHERE c.code = 'AT';

-- Insert Cities for Japan
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, NULL, city_name, tz, true
FROM public.countries c
CROSS JOIN (VALUES 
  ('Tokyo', 'Asia/Tokyo'),
  ('Osaka', 'Asia/Tokyo'),
  ('Kyoto', 'Asia/Tokyo'),
  ('Hiroshima', 'Asia/Tokyo'),
  ('Fukuoka', 'Asia/Tokyo')
) AS cities(city_name, tz)
WHERE c.code = 'JP';

-- Insert Cities for Australia
INSERT INTO public.cities (country_id, state_region_id, name, timezone, is_active)
SELECT c.id, sr.id, city_name, tz, true
FROM public.countries c
JOIN public.states_regions sr ON sr.country_id = c.id
CROSS JOIN (VALUES 
  ('New South Wales', 'Sydney', 'Australia/Sydney'),
  ('Victoria', 'Melbourne', 'Australia/Melbourne'),
  ('Queensland', 'Brisbane', 'Australia/Brisbane'),
  ('Western Australia', 'Perth', 'Australia/Perth')
) AS cities(state_name, city_name, tz)
WHERE c.code = 'AU' AND sr.name = cities.state_name;