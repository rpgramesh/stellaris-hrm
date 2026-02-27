
-- Fix missing is_active column in awards table
ALTER TABLE awards ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Fix missing is_active column in award_rules table
ALTER TABLE award_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
