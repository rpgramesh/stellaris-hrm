
const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificEmployee() {
  const email = 'manager.final@stellaris.com';
  console.log(`Checking data for employee with email: ${email}`);
  
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, employee_code, employment_status')
    .eq('email', email)
    .single();
    
  if (empError) {
    console.error('Error fetching employee:', empError);
    return;
  }
  
  console.log('Employee Record:', JSON.stringify(employee, null, 2));
  
  const { data: payrollConfigs, error: peError } = await supabase
    .from('payroll_employees')
    .select('*')
    .eq('employee_id', employee.id);
    
  if (peError) {
    console.error('Error fetching payroll config:', peError);
    return;
  }
  
  console.log('Payroll Configurations:', JSON.stringify(payrollConfigs, null, 2));
  
  // Test the join query exactly as it is in the code
  console.log('\nTesting the join query from the code...');
  const { data: joinData, error: joinError } = await supabase
    .from('employees')
    .select(`
      id,
      first_name,
      last_name,
      employee_code,
      employment_status,
      payroll_employees!inner (
        id,
        employment_type,
        pay_frequency,
        is_active
      )
    `)
    .eq('id', employee.id)
    .eq('employment_status', 'Active')
    .eq('payroll_employees.is_active', true);

  if (joinError) {
    console.error('Join query error:', joinError);
  } else {
    console.log('Join query result:', JSON.stringify(joinData, null, 2));
  }
}

checkSpecificEmployee();
