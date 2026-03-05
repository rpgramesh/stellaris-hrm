
-- Insert default payroll configuration for Ramesh P (rpgramesh@gmail.com)
-- Employee ID: 7e45c228-c2a3-4df3-8de8-a922bb4a6e2e

INSERT INTO payroll_employees (
  employee_id,
  base_salary,
  pay_frequency,
  tax_scale,
  residency_status,
  employment_type,
  is_active,
  effective_from
)
VALUES (
  '7e45c228-c2a3-4df3-8de8-a922bb4a6e2e',
  80000, -- Default salary, can be updated later
  'Monthly', -- Matching the draft payroll run
  'TaxFreeThreshold',
  'Resident',
  'FullTime',
  true,
  '2024-01-01'
)
ON CONFLICT (id) DO NOTHING;
