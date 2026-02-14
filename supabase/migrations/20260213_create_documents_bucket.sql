-- Create 'documents' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public viewing of documents
CREATE POLICY "Public Access to Documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Policy to allow authenticated users to upload documents
CREATE POLICY "Authenticated Users Can Upload Documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy to allow authenticated users to update their documents
CREATE POLICY "Authenticated Users Can Update Documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Policy to allow authenticated users to delete documents
CREATE POLICY "Authenticated Users Can Delete Documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
