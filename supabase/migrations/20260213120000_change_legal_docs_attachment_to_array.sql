-- Change attachment column from text to text[]
ALTER TABLE legal_documents
  ALTER COLUMN attachment TYPE text[] USING CASE
    WHEN attachment IS NULL THEN NULL
    WHEN attachment = '' THEN ARRAY[]::text[]
    ELSE ARRAY[attachment]
  END;
