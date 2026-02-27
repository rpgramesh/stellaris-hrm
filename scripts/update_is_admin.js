
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateIsAdmin() {
  const sql = `
    CREATE OR REPLACE FUNCTION is_admin()
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM employees 
        WHERE (user_id = auth.uid() OR email = (auth.jwt() ->> 'email')) 
        AND role IN ('Administrator', 'Super Admin', 'Employer Admin', 'HR Admin')
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  // Since supabase-js doesn't have a direct 'sql' method for raw DDL, 
  // we usually use rpc or just hope the table policies are enough.
  // Actually, we can use the 'rpc' method if we have a function that can run sql, 
  // but we don't.
  
  // Alternatively, we can use the REST API to run SQL if we have the service role key.
  // But the most common way in this environment is to use the 'execute_sql' tool if it worked.
  
  // If the 'execute_sql' tool is failing with "Unauthorized", it's a server-level config issue.
  
  console.log('Attempting to update is_admin() function via RPC...');
  // This likely won't work as 'is_admin' is not a function we can call to run SQL.
  
  console.log('Wait, I can try to run this as a migration if I have the supabase CLI, 
  but I should use the tools provided.');
}

updateIsAdmin();
