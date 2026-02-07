
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Starting seed process...');

  // 1. Departments
  console.log('Checking Departments...');
  let { data: depts } = await supabase.from('departments').select('id, name');
  
  let hrDeptId, engDeptId;

  if (!depts || depts.length === 0) {
    console.log('Creating Departments...');
    const { data: newDepts, error } = await supabase.from('departments').insert([
      { name: 'Human Resources', location: 'Headquarters' },
      { name: 'Engineering', location: 'Remote' }
    ]).select();
    
    if (error) throw error;
    depts = newDepts;
  }
  
  hrDeptId = depts?.find(d => d.name === 'Human Resources')?.id;
  engDeptId = depts?.find(d => d.name === 'Engineering')?.id;

  // 2. Job Positions
  console.log('Checking Job Positions...');
  let { data: positions } = await supabase.from('job_positions').select('id, title');
  
  if (!positions || positions.length === 0) {
    console.log('Creating Job Positions...');
    const { data: newPos, error } = await supabase.from('job_positions').insert([
      { title: 'HR Manager', department_id: hrDeptId, level: 'Senior' },
      { title: 'Software Engineer', department_id: engDeptId, level: 'Mid' }
    ]).select();

    if (error) throw error;
    positions = newPos;
  }

  const hrPosId = positions?.find(p => p.title === 'HR Manager')?.id;
  const devPosId = positions?.find(p => p.title === 'Software Engineer')?.id;

  // 3. Employees
  console.log('Checking Employees...');
  const { data: employees } = await supabase.from('employees').select('id, email');

  if (!employees || employees.length === 0) {
    console.log('Creating Employees...');
    
    // Admin Employee
    await supabase.from('employees').insert([{
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@stellaris.com',
      role: 'Administrator',
      department_id: hrDeptId,
      position_id: hrPosId,
      employment_status: 'Full Time',
      start_date: '2023-01-01',
      salary: 100000
    }]);

    // Standard Employee
    await supabase.from('employees').insert([{
      first_name: 'John',
      last_name: 'Doe',
      email: 'employee@stellaris.com',
      role: 'Employee',
      department_id: engDeptId,
      position_id: devPosId,
      employment_status: 'Full Time',
      start_date: '2023-06-01',
      salary: 80000
    }]);
    
    console.log('Employees created.');
  } else {
    console.log('Employees already exist.');
  }

  // 4. Create Auth Users (Attempt)
  // Note: This might fail if email confirmation is required or if users exist.
  console.log('Attempting to create Auth Users...');
  
  const users = [
    { email: 'admin.final@stellaris.com', password: 'password123', role: 'Administrator', firstName: 'Admin', lastName: 'User' },
    { email: 'staff.final@stellaris.com', password: 'password123', role: 'Employee', firstName: 'Staff', lastName: 'User' },
    { email: 'hr.final@stellaris.com', password: 'password123', role: 'HR Admin', firstName: 'HR', lastName: 'Admin' },
    { email: 'manager.final@stellaris.com', password: 'password123', role: 'Manager', firstName: 'Line', lastName: 'Manager' }
  ];

  for (const user of users) {
    // Check if employee exists first
    const { data: existingEmp } = await supabase.from('employees').select('id').eq('email', user.email).single();
    
    if (!existingEmp) {
        // Create Employee Record
        await supabase.from('employees').insert([{
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
            role: user.role,
            department_id: user.role === 'Administrator' ? hrDeptId : engDeptId,
            position_id: user.role === 'Administrator' ? hrPosId : devPosId,
            employment_status: 'Full Time',
            start_date: '2024-01-01',
            salary: user.role === 'Administrator' ? 120000 : 90000
        }]);
    }

    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
    });

    let userId = data.user?.id;

    if (error) {
      console.log(`User ${user.email} already exists or error: ${error.message}`);
      // If user exists, try to sign in to get the ID
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });
      
      if (signInData.user) {
        userId = signInData.user.id;
        console.log(`Logged in as ${user.email}, ID: ${userId}`);
      } else {
        console.error(`Could not sign in as ${user.email}:`, signInError?.message);
      }
    } else if (data.user) {
      console.log(`User ${user.email} created! ID: ${data.user.id}`);
    }

    if (userId) {
       const { error: updateError } = await supabase
        .from('employees')
        .update({ user_id: userId })
        .eq('email', user.email);
        
       if (updateError) {
         console.error(`Failed to link user ${userId} to employee ${user.email}:`, updateError.message);
       } else {
         console.log(`Successfully linked user ${userId} to employee ${user.email}`);
       }
    }
  }

  console.log('Seed process completed!');
  console.log('---------------------------------------------------');
  console.log('Login Credentials (FINAL):');
  console.log('Admin: admin.final@stellaris.com / password123');
  console.log('HR Admin: hr.final@stellaris.com / password123');
  console.log('Manager: manager.final@stellaris.com / password123');
  console.log('Employee: staff.final@stellaris.com / password123');
  console.log('---------------------------------------------------');
}

seed().catch(console.error);
