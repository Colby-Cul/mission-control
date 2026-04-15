-- Add optional display_name to entity_ownership for better dashboard titles.
-- Falls back to entity_name when null.
ALTER TABLE entity_ownership ADD COLUMN IF NOT EXISTS display_name text;

UPDATE entity_ownership SET display_name = 'Xome Home Loans'      WHERE slug = 'xome-home';
UPDATE entity_ownership SET display_name = 'California Luxury Stays' WHERE slug = 'ca-stays';
