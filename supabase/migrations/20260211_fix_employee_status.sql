-- Update employees with 'Full Time' status to 'Active'
UPDATE employees 
SET employment_status = 'Active' 
WHERE employment_status = 'Full Time';

-- Ensure no null statuses exist (default to Active)
UPDATE employees 
SET employment_status = 'Active' 
WHERE employment_status IS NULL;
