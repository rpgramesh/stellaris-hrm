
-- Fix expense_items schema to ensure relationships work
-- This enables Supabase to infer relationships for joins

-- 1. Add Foreign Key to expenses table
ALTER TABLE expense_items
DROP CONSTRAINT IF EXISTS expense_items_claim_id_fkey;

ALTER TABLE expense_items
ADD CONSTRAINT expense_items_claim_id_fkey
FOREIGN KEY (claim_id) REFERENCES expenses(id)
ON DELETE CASCADE;

-- 2. Convert category_id and type_id to UUID and add Foreign Keys
-- Note: expense_items table is empty, so type conversion is safe.
-- If it wasn't empty, we'd need: USING category_id::UUID
ALTER TABLE expense_items
ALTER COLUMN category_id TYPE UUID USING category_id::UUID,
ALTER COLUMN type_id TYPE UUID USING type_id::UUID;

ALTER TABLE expense_items
DROP CONSTRAINT IF EXISTS expense_items_category_id_fkey;

ALTER TABLE expense_items
ADD CONSTRAINT expense_items_category_id_fkey
FOREIGN KEY (category_id) REFERENCES expense_categories(id)
ON DELETE SET NULL;

ALTER TABLE expense_items
DROP CONSTRAINT IF EXISTS expense_items_type_id_fkey;

ALTER TABLE expense_items
ADD CONSTRAINT expense_items_type_id_fkey
FOREIGN KEY (type_id) REFERENCES expense_types(id)
ON DELETE SET NULL;

-- 3. Enable RLS on expenses and expense_items if not already enabled
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

-- 4. Add policies for expenses
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON expenses;
CREATE POLICY "Enable read access for authenticated users" ON expenses FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON expenses;
CREATE POLICY "Enable insert access for authenticated users" ON expenses FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON expenses;
CREATE POLICY "Enable update access for authenticated users" ON expenses FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON expenses;
CREATE POLICY "Enable delete access for authenticated users" ON expenses FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Add policies for expense_items
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON expense_items;
CREATE POLICY "Enable read access for authenticated users" ON expense_items FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON expense_items;
CREATE POLICY "Enable insert access for authenticated users" ON expense_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON expense_items;
CREATE POLICY "Enable update access for authenticated users" ON expense_items FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON expense_items;
CREATE POLICY "Enable delete access for authenticated users" ON expense_items FOR DELETE USING (auth.role() = 'authenticated');
