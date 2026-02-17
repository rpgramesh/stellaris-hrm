CREATE TABLE IF NOT EXISTS hardware_onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    client_manager_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    remark TEXT
);

CREATE TABLE IF NOT EXISTS hardware_onboarding_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    onboarding_id UUID NOT NULL REFERENCES hardware_onboarding(id) ON DELETE CASCADE,
    asset_tag TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    serial_number TEXT,
    model TEXT,
    status TEXT NOT NULL,
    asset_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hardware_onboarding_employee
    ON hardware_onboarding (employee_id);

CREATE INDEX IF NOT EXISTS idx_hardware_onboarding_assets_onboarding
    ON hardware_onboarding_assets (onboarding_id);

ALTER TABLE hardware_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_onboarding_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable access for authenticated users" ON hardware_onboarding;
CREATE POLICY "Enable access for authenticated users" ON hardware_onboarding
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable access for authenticated users" ON hardware_onboarding_assets;
CREATE POLICY "Enable access for authenticated users" ON hardware_onboarding_assets
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

