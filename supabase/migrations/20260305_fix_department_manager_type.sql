
-- Fix manager_id type in departments table before applying foreign key constraints
-- It seems manager_id might be TEXT, but employees.id is UUID.

-- 1. Drop existing constraint if it exists (to allow type change)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_departments_manager') THEN
        ALTER TABLE departments DROP CONSTRAINT fk_departments_manager;
    END IF;
END $$;

-- 2. Convert manager_id to UUID (handling empty strings or invalid UUIDs by setting them to NULL)
ALTER TABLE departments 
ALTER COLUMN manager_id TYPE UUID USING (
    CASE 
        WHEN manager_id IS NULL OR manager_id = '' THEN NULL 
        ELSE manager_id::UUID 
    END
);

-- 3. Now re-apply the foreign key constraint with ON DELETE SET NULL
ALTER TABLE departments
ADD CONSTRAINT fk_departments_manager
FOREIGN KEY (manager_id)
REFERENCES employees(id)
ON DELETE SET NULL;
