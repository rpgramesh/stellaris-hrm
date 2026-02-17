-- Add BSB number for employee bank details

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS bank_bsb TEXT;

