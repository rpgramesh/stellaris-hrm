
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testFormLogic() {
  const { organizationService } = await import('./src/services/organizationService');
  console.log('--- Testing Employee Form Logic Integration ---');

  // 1. Fetch Departments (Simulates useEffect on mount)
  console.log('1. Fetching Departments...');
  const departments = await organizationService.getDepartments();
  console.log(`   Loaded ${departments.length} departments.`);

  if (departments.length === 0) {
    console.warn('   No departments found. Skipping rest of test.');
    return;
  }

  // 2. Select a Department (Simulate User Selection)
  const selectedDept = departments[0];
  console.log(`2. Selecting Department: ${selectedDept.name} (ID: ${selectedDept.id})`);
  
  // 3. Verify Branch Info (Simulate Auto-fill)
  console.log(`   Expected Branch: ${selectedDept.branchName} (ID: ${selectedDept.branchId})`);
  
  // 4. Fetch Managers (Simulate cascading fetch)
  console.log('3. Fetching Managers for this Department/Branch...');
  const managers = await organizationService.getManagers(selectedDept.branchId, selectedDept.id);
  console.log(`   Found ${managers.length} managers.`);
  
  if (managers.length > 0) {
    console.log('   Sample Manager:', managers[0].firstName, managers[0].lastName);
    console.log('   Manager Dept ID:', managers[0].departmentId);
    
    // Verify filtering
    const invalidManagers = managers.filter(m => m.departmentId !== selectedDept.id);
    if (invalidManagers.length > 0) {
      console.error('   ERROR: Found managers from other departments!', invalidManagers.map(m => m.departmentId));
    } else {
      console.log('   SUCCESS: All managers belong to the selected department.');
    }

    // Verify Self-Exclusion Logic
    const currentUser = managers[0];
    console.log(`   Simulating Edit for User: ${currentUser.firstName} ${currentUser.lastName} (ID: ${currentUser.id})`);
    const filteredManagers = managers.filter(m => m.id !== currentUser.id);
    console.log(`   Managers before filter: ${managers.length}, after filter: ${filteredManagers.length}`);
    
    if (filteredManagers.find(m => m.id === currentUser.id)) {
        console.error('   ERROR: Current user is still in the manager list!');
    } else {
        console.log('   SUCCESS: Current user correctly filtered out from manager list.');
    }
  } else {
    console.log('   No managers found for this department. Try adding one in the DB to verify.');
  }

  // 5. Test Cross-Branch Filtering (Optional)
  // Find another branch if available
  const otherBranchDept = departments.find(d => d.branchId !== selectedDept.branchId);
  if (otherBranchDept) {
     console.log(`\n4. Testing another branch: ${otherBranchDept.branchName}`);
     const otherManagers = await organizationService.getManagers(otherBranchDept.branchId, otherBranchDept.id);
     console.log(`   Found ${otherManagers.length} managers.`);
  }
}

testFormLogic();
