-- Fix onboarding schema: Add missing columns and ensure tables exist

-- 1. Ensure uuid-ossp extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Fix onboarding_workflows table (add missing columns if they don't exist)
-- Note: Postgres 9.6+ supports IF NOT EXISTS for ADD COLUMN
ALTER TABLE onboarding_workflows ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Onboarding';
ALTER TABLE onboarding_workflows ADD COLUMN IF NOT EXISTS current_stage TEXT;
ALTER TABLE onboarding_workflows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Ensure workflow_tasks table exists
CREATE TABLE IF NOT EXISTS workflow_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES onboarding_workflows(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS on workflow_tasks
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for workflow_tasks (drop first to avoid error if exists)
DROP POLICY IF EXISTS "Enable access for authenticated users" ON workflow_tasks;
CREATE POLICY "Enable access for authenticated users" ON workflow_tasks 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- 6. Reload schema cache (optional, but good practice when columns change)
NOTIFY pgrst, 'reload schema';
