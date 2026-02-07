ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_password_change_required BOOLEAN DEFAULT FALSE;
