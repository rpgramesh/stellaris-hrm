## Fix Missing Payslip Interface Build Error

**Problem**: The [payrollProcessingEngine.ts](file:///Users/admin/Stellaris-HRM/stellaris-hrm/src/services/payrollProcessingEngine.ts) file cannot import `Payslip` from [payroll.ts](file:///Users/admin/Stellaris-HRM/stellaris-hrm/src/types/payroll.ts) because the interface doesn't exist.

**Solution**: Add the missing `Payslip` interface to [payroll.ts](file:///Users/admin/Stellaris-HRM/stellaris-hrm/src/types/payroll.ts) based on the existing structure from [index.ts](file:///Users/admin/Stellaris-HRM/stellaris-hrm/src/types/index.ts).

**Implementation Steps**:
1. Add `Payslip` interface to [payroll.ts](file:///Users/admin/Stellaris-HRM/stellaris-hrm/src/types/payroll.ts) with proper fields
2. Ensure the interface is properly exported
3. Run build to verify the fix works

**Expected Result**: Build should complete successfully without TypeScript errors.