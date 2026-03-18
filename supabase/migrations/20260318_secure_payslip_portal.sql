ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payslip_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tax_withheld NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pay_frequency TEXT;

UPDATE payslips
SET tax_withheld = COALESCE(tax_withheld, payg_tax, 0)
WHERE tax_withheld IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payslips_payslip_number_not_null
  ON payslips(payslip_number)
  WHERE payslip_number IS NOT NULL;

ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE deduction_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE deductions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON payslips;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON payslips;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON payslips;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON payslips;
DROP POLICY IF EXISTS "Employees can view their own payslips" ON payslips;
DROP POLICY IF EXISTS "Users can view their own payslips" ON payslips;
DROP POLICY IF EXISTS "Managers can view all payslips for their company" ON payslips;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON pay_components;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON deduction_applications;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON deductions;

CREATE POLICY "Employees can view their own payslips"
  ON payslips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.id = payslips.employee_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "HR can view all payslips"
  ON payslips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid()
        AND ur.name IN ('HR Admin', 'HR Manager', 'Administrator', 'Manager')
    )
  );

CREATE POLICY "HR can manage payslips"
  ON payslips
  FOR INSERT, UPDATE, DELETE
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

CREATE POLICY "Employees can view their own pay components"
  ON pay_components
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      WHERE p.id = pay_components.payslip_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "HR can view pay components"
  ON pay_components
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid()
        AND ur.name IN ('HR Admin', 'HR Manager', 'Administrator', 'Manager')
    )
  );

CREATE POLICY "HR can manage pay components"
  ON pay_components
  FOR INSERT, UPDATE, DELETE
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

CREATE POLICY "Employees can view their own deduction applications"
  ON deduction_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      WHERE p.id = deduction_applications.payslip_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "HR can view deduction applications"
  ON deduction_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid()
        AND ur.name IN ('HR Admin', 'HR Manager', 'Administrator', 'Manager')
    )
  );

CREATE POLICY "HR can manage deduction applications"
  ON deduction_applications
  FOR INSERT, UPDATE, DELETE
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

CREATE POLICY "Employees can view their own deductions"
  ON deductions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.id = deductions.employee_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "HR can manage deductions"
  ON deductions
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

