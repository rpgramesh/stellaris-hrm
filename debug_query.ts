
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugQuery() {
  console.log('--- Debugging getDepartments Query ---');

  // 1. Check if columns exist
  console.log('\n1. Inspecting one department record (raw):');
  const { data: rawData, error: rawError } = await supabase
    .from('departments')
    .select('*')
    .limit(1);
  
  if (rawError) {
    console.error('Error fetching raw departments:', rawError);
  } else {
    console.log('Raw Department Data:', rawData);
  }

  // 2. Try the complex query with relationships
  console.log('\n2. Attempting query with relations:');
  try {
    const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          branches (name),
          manager:employees!manager_id (first_name, last_name)
        `)
        .limit(5);

    if (error) {
      console.error('RELATION QUERY FAILED:', error);
      console.error('Error Code:', error.code);
      console.error('Error Details:', error.details);
      console.error('Error Hint:', error.hint);
      console.error('Error Message:', error.message);
    } else {
      console.log('RELATION QUERY SUCCESS!');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Exception during relation query:', err);
  }

  // 3. Try alternative query syntax if needed (e.g. without explicit FK hint)
  console.log('\n3. Attempting alternative query (no FK hint for manager):');
  try {
    const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          branches (name),
          employees (first_name, last_name)
        `)
        .limit(1);

    if (error) {
       console.log('Alternative query failed:', error.message);
    } else {
       console.log('Alternative query success:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
      console.log(err);
  }
}

debugQuery();
