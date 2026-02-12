-- Add type and is_recurring columns to public_holidays
ALTER TABLE public_holidays 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Public',
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true;

-- Update existing records to have defaults
UPDATE public_holidays SET type = 'Public', is_recurring = true WHERE type IS NULL;
