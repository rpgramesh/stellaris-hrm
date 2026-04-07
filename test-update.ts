import { config } from 'dotenv';
config({ path: '.env.local' });
import { toggleMfaRequiredAction, getMfaRequiredAction } from './src/app/actions/auth';
import { employeeService } from './src/services/employeeService';

(async () => {
  try {
    const list = await employeeService.getAll();
    if (list.length > 0) {
      const emp = list[0];
      console.log('Got employee', emp.id);

      if (emp.userId) {
        console.log('Testing getMfaRequiredAction');
        const res1 = await getMfaRequiredAction(emp.userId);
        console.log(res1);

        console.log('Testing toggleMfaRequiredAction');
        const res2 = await toggleMfaRequiredAction(emp.userId, true);
        console.log(res2);
      }

      console.log('Testing employeeService.update');
      await employeeService.update(emp.id, { ...emp, isMfaRequired: true });
      console.log('Update success');
    } else {
      console.log('No employees found');
    }
  } catch(e) {
    console.error('Test failed:', e);
  }
})();
