
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  const email = 'admin.final@stellaris.com';
  const password = 'password123';

  console.log(`Testing Login for: ${email}`);
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('Sign In Failed:', signInError.message);
    return;
  }

  console.log('Sign In Successful! Session created.');
  console.log('Access Token:', signInData.session?.access_token.slice(0, 20) + '...');
}

testAuth().catch(console.error);
