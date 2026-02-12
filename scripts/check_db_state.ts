
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkState() {
  console.log('Checking database state...');

  // Check audit_logs
  const { error: auditError } = await supabase.from('audit_logs').select('count', { count: 'exact', head: true });
  if (auditError) {
    console.log('audit_logs check failed:', auditError.message);
  } else {
    console.log('audit_logs table exists.');
  }

  // Check user_roles
  const { error: rolesError } = await supabase.from('user_roles').select('count', { count: 'exact', head: true });
  if (rolesError) {
    console.log('user_roles check failed:', JSON.stringify(rolesError, null, 2));
  } else {
    console.log('user_roles table exists.');
  }

  // Check user_role_assignments
  const { error: uraError } = await supabase.from('user_role_assignments').select('count', { count: 'exact', head: true });
  if (uraError) {
    console.log('user_role_assignments check failed:', JSON.stringify(uraError, null, 2));
  } else {
    console.log('user_role_assignments table exists.');
  }
}

checkState();
