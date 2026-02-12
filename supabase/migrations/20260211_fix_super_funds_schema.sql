-- Fix super_funds table schema if it has incorrect column names
DO $$
BEGIN
    -- Check if 'name' column exists but 'fund_name' does not
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'super_funds' AND column_name = 'name') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'super_funds' AND column_name = 'fund_name') THEN
        
        ALTER TABLE super_funds RENAME COLUMN name TO fund_name;
    END IF;

    -- Check if 'abn' column exists but 'fund_abn' does not
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'super_funds' AND column_name = 'abn') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'super_funds' AND column_name = 'fund_abn') THEN
        
        ALTER TABLE super_funds RENAME COLUMN abn TO fund_abn;
    END IF;

    -- Ensure 'usi' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'super_funds' AND column_name = 'usi') THEN
        ALTER TABLE super_funds ADD COLUMN usi VARCHAR(20);
    END IF;

    -- Ensure 'product_name' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'super_funds' AND column_name = 'product_name') THEN
        ALTER TABLE super_funds ADD COLUMN product_name TEXT;
    END IF;

    -- Ensure 'contribution_restrictions' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'super_funds' AND column_name = 'contribution_restrictions') THEN
        ALTER TABLE super_funds ADD COLUMN contribution_restrictions JSONB;
    END IF;
    
    -- Ensure 'is_active' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'super_funds' AND column_name = 'is_active') THEN
        ALTER TABLE super_funds ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

END $$;
