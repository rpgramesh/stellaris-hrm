import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  const supabase = createClient(url, key);
  try {
    const { data, error } = await supabase.from('employees').select('id').limit(1);
    if (error) {
      console.error('Query error:', error.message);
      process.exit(2);
    }
    console.log('Connectivity OK. Sample:', data);
  } catch (e) {
    console.error('Fetch failed:', e);
    process.exit(3);
  }
}

main();
