import { describe, it, expect } from 'vitest';
import { generatePayslipPdfBuffer } from '@/lib/payroll/payslipPdf';

describe('generatePayslipPdfBuffer', () => {
  it('generates a PDF buffer', () => {
    const pdf = generatePayslipPdfBuffer({
      payslip: {
        pay_period_start: '2026-02-01',
        pay_period_end: '2026-02-28',
        payment_date: '2026-03-06',
        pay_frequency: 'Monthly',
        gross_earnings: 8221.25,
        net_pay: 6353.25,
        income_tax: 1868.0,
        superannuation: 986.55,
        payslip_number: 'PS-TEST-1',
      },
      employee: {
        id: 'e1',
        first_name: 'Ramesh',
        last_name: 'Periyasamy',
        employee_code: 'EMP0007',
        address: '29 Ivory St\nCobblebank VIC 3338',
        bank_bsb: '083-214',
        bank_account_number: '123456789',
        super_fund_name: 'AustralianSuper',
        super_member_number: '1075902443',
      },
      payComponents: [
        { component_type: 'BaseSalary', description: 'Ordinary Hours', units: 160, rate: 51.3828, amount: 8221.25 },
      ],
      ytd: { gross: 49723.25, tax: 9066.0, net: 0, super: 5947.23 },
      branding: {
        companyName: 'STELLARIS CONSULTING AUSTRALIA PTY LTD',
        companyAddressLines: ['Level 1 182 La Trobe Terrace', 'WEST GEELONG VIC 3218'],
        abn: '81 624 546 649',
      },
      paymentReference: 'Salary',
      digitalSignatureText: 'Digitally signed',
    });

    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(pdf.slice(0, 4).toString()).toBe('%PDF');
  });
});

