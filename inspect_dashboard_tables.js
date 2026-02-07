
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTables() {
  console.log('Inspecting tables...');
  
  // Check leave_entitlements
  const { error: errorEntitlements } = await supabase
    .from('leave_entitlements')
    .select('id')
    .limit(1);
    
  if (errorEntitlements) {
      console.log(`[MISSING] leave_entitlements table: ${errorEntitlements.message}`);
  } else {
      console.log(`[EXISTS]  leave_entitlements table`);
  }

  // Check attendance_records
  const { error: errorAttendance } = await supabase
    .from('attendance_records')
    .select('id')
    .limit(1);

  if (errorAttendance) {
      console.log(`[MISSING] attendance_records table: ${errorAttendance.message}`);
  } else {
      console.log(`[EXISTS]  attendance_records table`);
  }

  // Check payslips (verify previous fix)
  const { error: errorPayslips } = await supabase
    .from('payslips')
    .select('period_start, payment_date') // Check specific columns we added
    .limit(1);

  if (errorPayslips) {
      console.log(`[ERROR] payslips columns: ${errorPayslips.message}`);
  } else {
      console.log(`[EXISTS]  payslips table with new columns`);
  }
}

inspectTables();
