-- 012_coffee_cup_catalog.sql
-- Server-driven catalog of coffee cup variants for the FocusScreen picker.
--
-- Apps fetch this catalog on startup. New variants are added by:
--   1. Uploading the SVG to the `coffee-cups` Storage bucket
--   2. Inserting a row here pointing at it
-- No app release required.
--
-- The svg_url column accepts either:
--   - a full https:// URL (any CDN), OR
--   - a relative path like 'classic.svg' (resolved against the
--     `coffee-cups` Storage bucket public URL by the client)
-- The bundled fallback set in the client covers offline / catalog-empty cases.

CREATE TABLE IF NOT EXISTS coffee_cup_variants (
  id              TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  subtitle        TEXT NOT NULL,
  svg_url         TEXT NOT NULL,
  supports_steam  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  is_premium      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Catalog is global, not per-user, so every authenticated user reads the same
-- list. Writes are admin-only (Supabase dashboard or service role).
ALTER TABLE coffee_cup_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coffee cup catalog readable by all" ON coffee_cup_variants;
CREATE POLICY "Coffee cup catalog readable by all"
  ON coffee_cup_variants
  FOR SELECT
  USING (TRUE);

-- Auto-bump updated_at so the client cache key naturally invalidates whenever
-- a row changes (cache is keyed `cup-svg:<id>:<updated_at>`).
CREATE OR REPLACE FUNCTION coffee_cup_variants_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coffee_cup_variants_touch ON coffee_cup_variants;
CREATE TRIGGER coffee_cup_variants_touch
  BEFORE UPDATE ON coffee_cup_variants
  FOR EACH ROW EXECUTE FUNCTION coffee_cup_variants_touch_updated_at();

-- Seed the six bundled defaults. svg_url is a relative path; the client
-- resolves it against the `coffee-cups` bucket public URL.
INSERT INTO coffee_cup_variants
  (id, label, subtitle, svg_url, supports_steam, sort_order, is_premium)
VALUES
  ('classic',    'Classic',    'The original brew',  'classic.svg',    TRUE,  10, FALSE),
  ('latte',      'Latte',      'Layered & creamy',   'latte.svg',      TRUE,  20, FALSE),
  ('cappuccino', 'Cappuccino', 'Foam-art heart',     'cappuccino.svg', TRUE,  30, FALSE),
  ('espresso',   'Espresso',   'Short & strong',     'espresso.svg',   TRUE,  40, FALSE),
  ('cold-brew',  'Cold Brew',  'On the rocks',       'cold-brew.svg',  FALSE, 50, FALSE),
  ('matcha',     'Matcha',     'Whisked & green',    'matcha.svg',     FALSE, 60, FALSE)
ON CONFLICT (id) DO UPDATE SET
  label          = EXCLUDED.label,
  subtitle       = EXCLUDED.subtitle,
  svg_url        = EXCLUDED.svg_url,
  supports_steam = EXCLUDED.supports_steam,
  sort_order     = EXCLUDED.sort_order;
