DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loan_repayments') THEN
    EXECUTE 'ALTER TABLE loan_repayments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()';
    EXECUTE 'UPDATE loan_repayments SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL';

    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_loan_repayments') THEN
      EXECUTE 'DROP TRIGGER IF EXISTS set_updated_at_loan_repayments ON loan_repayments';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_set_updated_at') THEN
      EXECUTE 'CREATE TRIGGER set_updated_at_loan_repayments BEFORE UPDATE ON loan_repayments FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at()';
    END IF;
  END IF;
END $$;

