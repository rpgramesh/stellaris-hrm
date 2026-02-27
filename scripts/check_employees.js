
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmployees() {
  const { data, error } = await supabase.from('employees').select('id, email, role, user_id');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Employees found:', data.length);
  console.table(data);
}

checkEmployees();
