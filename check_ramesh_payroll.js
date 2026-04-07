
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRamesh() {
  console.log('Checking Ramesh P payroll data...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email')
    .ilike('first_name', '%Ramesh%');

  if (empError) {
    console.error('Error fetching employees:', empError);
    return;
  }

  if (employees.length === 0) {
    console.log('No employee found with name Ramesh');
    return;
  }

  for (const emp of employees) {
    console.log(`\nEmployee: ${emp.first_name} ${emp.last_name} (${emp.id})`);
    
    const { data: payroll, error: payrollError } = await supabase
      .from('payroll_employees')
      .select('*')
      .eq('employee_id', emp.id)
      .single();

    if (payrollError) {
       console.error('Error fetching payroll data:', payrollError);
       continue;
    }

    console.log('Payroll Data:', JSON.stringify(payroll, null, 2));
  }
}

checkRamesh();
