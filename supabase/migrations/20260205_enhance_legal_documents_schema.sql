-- Create document_categories table
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create legal_documents table
CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_number TEXT NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    issuing_authority TEXT,
    attachment TEXT,
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure updated_at column exists (for existing tables)
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable RLS for legal_documents
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable access for authenticated users" ON legal_documents;
CREATE POLICY "Enable access for authenticated users" ON legal_documents
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Enable RLS for document_categories
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable access for authenticated users" ON document_categories;
CREATE POLICY "Enable access for authenticated users" ON document_categories
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add trigger for legal_documents updated_at
DROP TRIGGER IF EXISTS update_legal_documents_updated_at ON legal_documents;
CREATE TRIGGER update_legal_documents_updated_at
    BEFORE UPDATE ON legal_documents
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
