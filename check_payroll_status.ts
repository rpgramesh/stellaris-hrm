
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPayrollStatus() {
  console.log('--- Checking Employee: rpgramesh@gmail.com ---');
  
  // 1. Get Employee Details
  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email')
    .eq('email', 'rpgramesh@gmail.com')
    .single();

  if (empErr) {
    console.error('Error fetching employee:', empErr);
    return;
  }
  
  console.log('Employee Found:', JSON.stringify(employee, null, 2));

  // 2. Check Payroll Configuration
  console.log('\n--- Checking Payroll Configuration (payroll_employees) ---');
  const { data: payrollConfig, error: payErr } = await supabase
    .from('payroll_employees')
    .select('*')
    .eq('employee_id', employee.id);

  if (payErr) {
    console.error('Error fetching payroll config:', payErr);
  } else if (!payrollConfig || payrollConfig.length === 0) {
    console.error('❌ NO PAYROLL CONFIGURATION FOUND for this employee.');
    console.log('This explains why they are missing from the payroll run.');
  } else {
    console.log('Payroll Config Found:', JSON.stringify(payrollConfig, null, 2));
  }

  // 3. Check Timesheets
  console.log('\n--- Checking Timesheets ---');
  const { data: timesheets, error: tsErr } = await supabase
    .from('timesheets')
    .select('*')
    .eq('employee_id', employee.id)
    .order('week_start_date', { ascending: false })
    .limit(5);

  if (tsErr) {
    console.error('Error fetching timesheets:', tsErr);
  } else {
    console.log('Recent Timesheets:', JSON.stringify(timesheets, null, 2));
  }

  // 4. Check Payroll Runs
  console.log('\n--- Checking Active Payroll Runs ---');
  const { data: runs, error: runErr } = await supabase
    .from('payroll_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (runErr) {
    console.error('Error fetching payroll runs:', runErr);
  } else {
    console.log('Recent Payroll Runs:', JSON.stringify(runs, null, 2));
  }
}

checkPayrollStatus();
