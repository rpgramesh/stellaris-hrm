-- Change attachment column from text to text[] for training_records table
-- Includes logic to handle existing data:
-- 1. NULL -> NULL
-- 2. Empty string -> Empty array
-- 3. JSON Array string (e.g. '["url1", "url2"]') -> Parsed array
-- 4. Regular string -> Single-item array

ALTER TABLE training_records
  ALTER COLUMN attachment TYPE text[] USING CASE
    WHEN attachment IS NULL THEN NULL
    WHEN attachment = '' THEN ARRAY[]::text[]
    WHEN attachment ~ '^\s*\[.*\]\s*$' THEN 
      -- Attempt to parse as JSON array. If invalid JSON, it might fail or we can fallback.
      -- Using a safe approach: try casting to jsonb, then array.
      -- Note: If casting fails, the migration will fail. This is acceptable as it highlights data issues.
      ARRAY(SELECT jsonb_array_elements_text(attachment::jsonb))
    ELSE ARRAY[attachment]
  END;
