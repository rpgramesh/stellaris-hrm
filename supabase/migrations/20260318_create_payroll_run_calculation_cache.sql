CREATE TABLE IF NOT EXISTS payroll_run_calculation_cache (
  payroll_run_id UUID PRIMARY KEY REFERENCES payroll_runs(id) ON DELETE CASCADE,
  report JSONB NOT NULL,
  report_version INTEGER NOT NULL DEFAULT 1,
  checksum TEXT,
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  invalid_reason TEXT,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_set_updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_payroll_run_calculation_cache') THEN
      EXECUTE 'CREATE TRIGGER set_updated_at_payroll_run_calculation_cache BEFORE UPDATE ON payroll_run_calculation_cache FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at()';
    END IF;
  END IF;
END $$;

ALTER TABLE payroll_run_calculation_cache ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'payroll_run_calculation_cache' AND policyname = 'HR Admins can manage payroll run calculation cache') THEN
    CREATE POLICY "HR Admins can manage payroll run calculation cache"
      ON payroll_run_calculation_cache
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM user_role_assignments ura
          JOIN user_roles ur ON ura.role_id = ur.id
          WHERE ura.user_id = auth.uid()
            AND ur.name IN ('HR Admin', 'HR Manager', 'Administrator')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM user_role_assignments ura
          JOIN user_roles ur ON ura.role_id = ur.id
          WHERE ura.user_id = auth.uid()
            AND ur.name IN ('HR Admin', 'HR Manager', 'Administrator')
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payroll_run_calculation_cache_updated_at
  ON payroll_run_calculation_cache(updated_at DESC);
