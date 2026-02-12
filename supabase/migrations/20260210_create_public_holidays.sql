
-- Create public_holidays table
CREATE TABLE IF NOT EXISTS public_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view holidays
CREATE POLICY "Everyone can view holidays" ON public_holidays
  FOR SELECT USING (true);

-- Policy: Only Admins/HR can manage holidays (simplified for now to authenticated users)
CREATE POLICY "Authenticated users can manage holidays" ON public_holidays
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert some sample holidays for 2026
INSERT INTO public_holidays (name, date, description) VALUES
  ('New Year''s Day', '2026-01-01', 'First day of the year'),
  ('Australia Day', '2026-01-26', 'National Day'),
  ('Good Friday', '2026-04-03', 'Public Holiday'),
  ('Easter Monday', '2026-04-06', 'Public Holiday'),
  ('Anzac Day', '2026-04-25', 'National Day of Remembrance'),
  ('Christmas Day', '2026-12-25', 'Christian Holiday'),
  ('Boxing Day', '2026-12-26', 'Commonwealth Holiday');
