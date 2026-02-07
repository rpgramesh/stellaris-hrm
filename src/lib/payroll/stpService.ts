import { STPPayEvent, STPPayeePayload } from "@/types/payroll";
import { Payslip } from "@/types";

// Mocking ATO SBR (Standard Business Reporting) Interaction

export const generatePayEvent = (
  payRunId: string,
  payslips: Payslip[],
  previousEvents: STPPayEvent[] = []
): STPPayEvent => {
  const runDate = new Date().toISOString().split('T')[0];
  const submissionDate = new Date().toISOString();
  
  // Aggregate totals
  const totalGross = payslips.reduce((sum, p) => sum + p.grossPay, 0);
  const totalTax = payslips.reduce((sum, p) => sum + p.paygTax, 0);
  const totalSuper = payslips.reduce((sum, p) => sum + p.superannuation, 0);

  // Generate Payee Payloads (YTD Logic)
  // In a real app, we would query the DB for previous YTD values for each employee.
  // Here we mock it by looking at 'previousEvents' and adding current.
  
  const payees: STPPayeePayload[] = payslips.map(slip => {
    // Find previous YTD for this employee
    let ytdGross = 0;
    let ytdTax = 0;
    let ytdSuper = 0;

    // Simplified: Just iterate all previous events and sum up (inefficient but works for mock)
    previousEvents.forEach(evt => {
      const payee = evt.payees.find(p => p.employeeId === slip.employeeId);
      if (payee) {
        // Warning: STP usually sends cumulative YTD, so we should take the *latest* YTD, not sum them up if they are already YTD.
        // Assuming previousEvents contains just the *last* event which has the YTDs? 
        // Or assuming we store YTD in DB. 
        // Let's assume we just sum up historical payslips for now.
        // For this mock function, let's just assume previousEvents are *transactional* and we sum them (not strictly how STP works, but sufficient for logic demo).
        ytdGross += payee.payPeriodGross;
        ytdTax += payee.payPeriodTax;
        ytdSuper += payee.payPeriodSuper;
      }
    });

    // Add current
    ytdGross += slip.grossPay;
    ytdTax += slip.paygTax;
    ytdSuper += slip.superannuation;

    return {
      employeeId: slip.employeeId,
      payPeriodGross: slip.grossPay,
      payPeriodTax: slip.paygTax,
      payPeriodSuper: slip.superannuation,
      ytdGross,
      ytdTax,
      ytdSuper
    };
  });

  return {
    id: `STP-${payRunId}-${Date.now()}`,
    submissionDate,
    runDate,
    transactionId: crypto.randomUUID(),
    status: 'Draft',
    employeeCount: payslips.length,
    totalGross,
    totalTax,
    totalSuper,
    payees
  };
};

export const submitToATO = async (event: STPPayEvent): Promise<{ success: boolean; message: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Simulate validation
  if (event.totalGross < 0) {
    return { success: false, message: 'Total Gross cannot be negative.' };
  }

  return { success: true, message: 'Success: Received by ATO with Receipt #123456789' };
};
