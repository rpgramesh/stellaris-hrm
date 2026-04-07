import { NextResponse } from 'next/server';
import { toggleMfaRequiredAction } from '@/app/actions/auth';
import { employeeService } from '@/services/employeeService';

export async function GET() {
  try {
    const list = await employeeService.getAll();
    if (list.length === 0) return NextResponse.json({ error: 'No employees' });

    const emp = list[0];
    
    // Attempt toggle
    let toggleResStr = 'skipped';
    if (emp.userId) {
      const toggleRes = await toggleMfaRequiredAction(emp.userId, true);
      toggleResStr = JSON.stringify(toggleRes);
    }

    delete emp.employmentType;
    // Attempt update
    await employeeService.update(emp.id, { ...emp, isMfaRequired: true });

    return NextResponse.json({ success: true, toggleRes: toggleResStr, empId: emp.id });
  } catch (e: any) {
    return NextResponse.json({ 
      error: e.message, 
      stack: e.stack, 
      details: e.details || (e.response ? e.response.body : null), 
      code: e.code,
      all: JSON.stringify(e)
    }, { status: 500 });
  }
}
