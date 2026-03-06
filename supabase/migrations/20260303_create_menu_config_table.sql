-- Create menu_item_configurations table
CREATE TABLE IF NOT EXISTS menu_item_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_key TEXT UNIQUE NOT NULL, -- The original/code name of the menu item (e.g., 'dashboard')
    display_name TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES auth.users(id),
    CONSTRAINT display_name_length CHECK (char_length(display_name) <= 50),
    CONSTRAINT display_name_validation CHECK (display_name ~ '^[a-zA-Z0-9 -]+$')
);

-- Enable RLS
ALTER TABLE menu_item_configurations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read access" ON menu_item_configurations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admins to update menu configs" ON menu_item_configurations
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE employees.user_id = auth.uid()
            AND role IN ('Super Admin', 'Administrator', 'HR Admin', 'HR Manager')
        )
    );

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_menu_item_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_menu_item_config_timestamp
BEFORE UPDATE ON menu_item_configurations
FOR EACH ROW EXECUTE FUNCTION update_menu_item_config_timestamp();
