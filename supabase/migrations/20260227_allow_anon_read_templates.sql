-- Allow anon users to read email templates for forgot password flow
CREATE POLICY "Enable read access for anon users" ON email_templates
    FOR SELECT TO anon USING (true);
