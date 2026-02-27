
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

async function checkColumns() {
  console.log('Checking statutory_rates columns...');
  const { data, error } = await supabase.from('statutory_rates').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample data:', data[0]);
    console.log('Columns:', Object.keys(data[0] || {}));
  }
}

checkColumns();
