
-- Add cascade delete to remaining foreign key constraints
-- This handles Onboarding, Offboarding, Hardware, and other related modules

-- 1. Onboarding Workflows
ALTER TABLE onboarding_workflows
DROP CONSTRAINT IF EXISTS onboarding_workflows_employee_id_fkey;

ALTER TABLE onboarding_workflows
ADD CONSTRAINT onboarding_workflows_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 2. Offboarding Workflows
ALTER TABLE offboarding_workflows
DROP CONSTRAINT IF EXISTS offboarding_workflows_employee_id_fkey;

ALTER TABLE offboarding_workflows
ADD CONSTRAINT offboarding_workflows_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 3. Hardware Onboarding
ALTER TABLE hardware_onboarding
DROP CONSTRAINT IF EXISTS hardware_onboarding_employee_id_fkey;

ALTER TABLE hardware_onboarding
ADD CONSTRAINT hardware_onboarding_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 4. Employee Experience
ALTER TABLE employee_experience
DROP CONSTRAINT IF EXISTS employee_experience_employee_id_fkey;

ALTER TABLE employee_experience
ADD CONSTRAINT employee_experience_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 5. Web Accounts
ALTER TABLE web_accounts
DROP CONSTRAINT IF EXISTS web_accounts_employee_id_fkey;

ALTER TABLE web_accounts
ADD CONSTRAINT web_accounts_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 6. Employee Requests
ALTER TABLE employee_requests
DROP CONSTRAINT IF EXISTS employee_requests_employee_id_fkey;

ALTER TABLE employee_requests
ADD CONSTRAINT employee_requests_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 7. Employment Terms
ALTER TABLE employment_terms
DROP CONSTRAINT IF EXISTS employment_terms_employee_id_fkey;

ALTER TABLE employment_terms
ADD CONSTRAINT employment_terms_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 8. Experiences (Old table, keeping for safety)
ALTER TABLE experiences
DROP CONSTRAINT IF EXISTS experiences_employee_id_fkey;

ALTER TABLE experiences
ADD CONSTRAINT experiences_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 9. Educations
ALTER TABLE educations
DROP CONSTRAINT IF EXISTS educations_employee_id_fkey;

ALTER TABLE educations
ADD CONSTRAINT educations_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 10. Placements
ALTER TABLE placements
DROP CONSTRAINT IF EXISTS placements_employee_id_fkey;

ALTER TABLE placements
ADD CONSTRAINT placements_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

-- 11. Leave Requests
ALTER TABLE leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_employee_id_fkey;

ALTER TABLE leave_requests
ADD CONSTRAINT leave_requests_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;
