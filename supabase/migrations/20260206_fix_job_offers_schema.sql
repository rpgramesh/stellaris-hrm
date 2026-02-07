-- Fix for missing columns in job_offers table
-- Detected missing: base_salary, currency, frequency, probation_period, notice_period, sent_date

ALTER TABLE job_offers 
  ADD COLUMN IF NOT EXISTS base_salary NUMERIC,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'AUD',
  ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'Annually',
  ADD COLUMN IF NOT EXISTS probation_period TEXT, -- using TEXT to match existing schema usage, or NUMERIC? existing migration said TEXT
  ADD COLUMN IF NOT EXISTS notice_period TEXT,    -- existing migration said TEXT
  ADD COLUMN IF NOT EXISTS sent_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS response_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approved_by TEXT;
