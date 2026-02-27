
const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmployees() {
  console.log('Checking payroll_employees table...');
  
  const { data: allPE, error: peError } = await supabase
    .from('payroll_employees')
    .select('id, employee_id, pay_frequency, is_active');
    
  if (peError) {
    console.error('Error fetching payroll_employees:', peError);
    return;
  }
  
  console.log(`Total payroll_employees records: ${allPE.length}`);
  console.log('Records:', JSON.stringify(allPE, null, 2));
  
  const frequencies = ['Weekly', 'Fortnightly', 'Monthly'];
  for (const freq of frequencies) {
    const count = allPE.filter(e => e.pay_frequency === freq && e.is_active).length;
    console.log(`Active employees with frequency "${freq}": ${count}`);
  }
  
  console.log('\nChecking employees table...');
  const { data: allEmp, error: empError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, employment_status');
    
  if (empError) {
    console.error('Error fetching employees:', empError);
    return;
  }
  
  console.log(`Total employees records: ${allEmp.length}`);
  console.log('Active employees:', allEmp.filter(e => e.employment_status === 'Active').length);
}

checkEmployees();
