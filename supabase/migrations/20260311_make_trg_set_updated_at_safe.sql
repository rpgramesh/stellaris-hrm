CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW := jsonb_populate_record(NEW, jsonb_build_object('updated_at', NOW()));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

