import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('../statutoryTablesService', () => ({ statutoryTablesService: { getStatutoryRates: vi.fn() } }));
vi.mock('../timesheetService', () => ({ timesheetService: {} }));
vi.mock('../attendanceService', () => ({ attendanceService: {} }));
vi.mock('../awardInterpretationEngine', () => ({ awardInterpretationEngine: {} }));
vi.mock('../auditService', () => ({ auditService: { logAction: vi.fn() } }));

import { payrollProcessingEngine } from '../payrollProcessingEngine';

describe('payrollProcessingEngine.calculateEmployeePayroll', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('updates net pay when salary adjustments and deductions apply, without double-counting pre-tax deductions', async () => {
    vi.spyOn(payrollProcessingEngine, 'processTimesheetData').mockResolvedValue({
      earnings: [],
      deductions: [],
      superContributions: [],
    } as any);

    vi.spyOn(payrollProcessingEngine, 'calculateBaseSalary').mockReturnValue({
      id: 'c1',
      payslipId: '',
      componentType: 'BaseSalary',
      description: 'Base Salary',
      units: 1,
      rate: 1000,
      amount: 1000,
      taxTreatment: 'Taxable',
      stpCategory: 'SAW',
      isYtd: false,
      createdAt: new Date().toISOString(),
    } as any);

    vi.spyOn(payrollProcessingEngine, 'getSalaryAdjustments').mockResolvedValue([
      {
        id: 'a1',
        employeeId: 'emp1',
        adjustmentType: 'Bonus',
        amount: 200,
        adjustmentReason: 'Other',
        effectiveDate: '2026-02-01',
        isPermanent: true,
        isProcessed: false,
        status: 'Approved',
        requestedBy: 'emp1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'a2',
        employeeId: 'emp1',
        adjustmentType: 'Deduction',
        amount: 30,
        adjustmentReason: 'Other',
        effectiveDate: '2026-02-01',
        isPermanent: true,
        isProcessed: false,
        status: 'Approved',
        requestedBy: 'emp1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ] as any);

    vi.spyOn(payrollProcessingEngine, 'getPreTaxDeductions').mockResolvedValue([
      {
        id: 'd1',
        employeeId: 'emp1',
        deductionType: 'PreTax',
        category: 'Other',
        description: 'Salary Packaging',
        amount: 100,
        isFixed: true,
        isPercentage: false,
        priority: 100,
        effectiveFrom: '2026-02-01',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ] as any);

    vi.spyOn(payrollProcessingEngine, 'getPostTaxDeductions').mockResolvedValue([
      {
        id: 'd2',
        employeeId: 'emp1',
        deductionType: 'PostTax',
        category: 'Other',
        description: 'Union Fees',
        amount: 50,
        isFixed: true,
        isPercentage: false,
        priority: 100,
        effectiveFrom: '2026-02-01',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ] as any);

    vi.spyOn(payrollProcessingEngine, 'calculateTaxWithholding').mockResolvedValue(200);
    vi.spyOn(payrollProcessingEngine, 'calculateSuperannuation').mockResolvedValue(0);

    const employee: any = {
      id: 'pe1',
      employeeId: 'emp1',
      baseSalary: 26000,
      payFrequency: 'Fortnightly',
      taxScale: 'TaxFreeThreshold',
      residencyStatus: 'Resident',
      employmentType: 'FullTime',
      isSalarySacrifice: false,
      effectiveFrom: '2026-01-01',
      companyId: 'c',
    };

    const payrollRun: any = {
      id: 'run1',
      payPeriodStart: '2026-02-01',
      payPeriodEnd: '2026-02-14',
      paymentDate: '2026-02-15',
      payFrequency: 'Fortnightly',
      status: 'Draft',
      totalGrossPay: 0,
      totalTax: 0,
      totalSuper: 0,
      totalNetPay: 0,
      employeeCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await payrollProcessingEngine.calculateEmployeePayroll(employee, payrollRun);

    expect(result.totals.grossPay).toBe(1200);
    expect(result.totals.taxableIncome).toBe(1100);
    expect(result.totals.taxWithheld).toBe(200);
    expect(result.totals.totalDeductions).toBe(180);
    expect(result.totals.netPay).toBe(820);
  });
});

