
-- Migration to add ON DELETE CASCADE to foreign keys referencing employees
-- This allows deleting an employee to automatically remove their related records

-- 1. Timesheets (Remove orphaned timesheets)
ALTER TABLE timesheets 
DROP CONSTRAINT IF EXISTS timesheets_employee_id_fkey;

ALTER TABLE timesheets 
ADD CONSTRAINT timesheets_employee_id_fkey 
FOREIGN KEY (employee_id) 
REFERENCES employees(id) 
ON DELETE CASCADE;

-- 2. Timesheet Templates (Remove orphaned templates)
ALTER TABLE timesheet_templates
DROP CONSTRAINT IF EXISTS timesheet_templates_employee_id_fkey;

ALTER TABLE timesheet_templates
ADD CONSTRAINT timesheet_templates_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 3. Payroll Employees (Remove orphaned payroll config)
ALTER TABLE payroll_employees
DROP CONSTRAINT IF EXISTS payroll_employees_employee_id_fkey;

ALTER TABLE payroll_employees
ADD CONSTRAINT payroll_employees_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 4. Employee Loans (Remove orphaned loans)
ALTER TABLE employee_loans
DROP CONSTRAINT IF EXISTS employee_loans_employee_id_fkey;

ALTER TABLE employee_loans
ADD CONSTRAINT employee_loans_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 5. Salary Arrears (Remove orphaned arrears)
ALTER TABLE salary_arrears
DROP CONSTRAINT IF EXISTS salary_arrears_employee_id_fkey;

ALTER TABLE salary_arrears
ADD CONSTRAINT salary_arrears_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 6. Departments (Manager reference - SET NULL)
-- If a manager is deleted, the department should just have no manager, not be deleted
ALTER TABLE departments
DROP CONSTRAINT IF EXISTS departments_manager_id_fkey; -- Assuming standard naming, might need to check specific name

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_departments_manager') THEN
        ALTER TABLE departments DROP CONSTRAINT fk_departments_manager;
    END IF;
END $$;

ALTER TABLE departments
ADD CONSTRAINT fk_departments_manager
FOREIGN KEY (manager_id)
REFERENCES employees(id)
ON DELETE SET NULL;

-- 7. Employees (Line Manager reference - SET NULL)
-- If a line manager is deleted, their direct reports should just have no manager
ALTER TABLE employees
DROP CONSTRAINT IF EXISTS employees_line_manager_id_fkey;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_employees_line_manager') THEN
        ALTER TABLE employees DROP CONSTRAINT fk_employees_line_manager;
    END IF;
END $$;

ALTER TABLE employees
ADD CONSTRAINT fk_employees_line_manager
FOREIGN KEY (line_manager_id)
REFERENCES employees(id)
ON DELETE SET NULL;

-- 8. Jobs (Hiring Manager reference - SET NULL)
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_hiring_manager_id_fkey;

ALTER TABLE jobs
ADD CONSTRAINT jobs_hiring_manager_id_fkey
FOREIGN KEY (hiring_manager_id)
REFERENCES employees(id)
ON DELETE SET NULL;

-- 9. Leave Entitlements (Remove orphaned entitlements)
-- Check if constraint exists first, usually created with default name
ALTER TABLE leave_entitlements
DROP CONSTRAINT IF EXISTS leave_entitlements_employee_id_fkey;

ALTER TABLE leave_entitlements
ADD CONSTRAINT leave_entitlements_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;
