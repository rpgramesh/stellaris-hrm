import { supabase } from '../lib/supabase';
import { AnnualSalaryStatement, PayrollEmployee, PayComponent, Deduction, SuperannuationContribution, STPSubmission } from '../types/payroll';
import { addDays, format, parseISO, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

export class AnnualSalaryStatementService {
  private static readonly ATO_PAYG_SUMMARY_CODES = {
    GROSS_PAYMENTS: '001',
    TAX_WITHHELD: '002',
    SUPERANNUATION: '003',
    REPORTABLE_FRINGE_BENEFITS: '004',
    REPORTABLE_SUPER_CONTRIBUTIONS: '005',
    WORKPLACE_GIVING: '006',
    ALLOWANCES: '007',
    LUMP_SUM_A: '008',
    LUMP_SUM_B: '009',
    LUMP_SUM_D: '010',
    LUMP_SUM_E: '011',
    TERMINATION_PAYMENTS: '012'
  };

  /**
   * Generate annual salary statement for an employee
   */
  async generateAnnualSalaryStatement(
    employeeId: string,
    financialYear: string,
    regenerate: boolean = false
  ): Promise<AnnualSalaryStatement> {
    try {
      // Check if statement already exists and is final
      if (!regenerate) {
        const existingStatement = await this.getExistingStatement(employeeId, financialYear);
        if (existingStatement && existingStatement.isFinal) {
          return existingStatement;
        }
      }

      // Get employee payroll data
      const employeeData = await this.getEmployeePayrollData(employeeId, financialYear);
      
      // Calculate all components for the statement
      const grossPayments = await this.calculateGrossPayments(employeeId, financialYear);
      const taxWithheld = await this.calculateTaxWithheld(employeeId, financialYear);
      const superannuation = await this.calculateSuperannuation(employeeId, financialYear);
      const reportableFringeBenefits = await this.calculateReportableFringeBenefits(employeeId, financialYear);
      const reportableSuperContributions = await this.calculateReportableSuperContributions(employeeId, financialYear);
      const workplaceGiving = await this.calculateWorkplaceGiving(employeeId, financialYear);
      const allowances = await this.calculateAllowances(employeeId, financialYear);
      const lumpSumPayments = await this.calculateLumpSumPayments(employeeId, financialYear);
      const terminationPayments = await this.calculateTerminationPayments(employeeId, financialYear);

      // Create statement record
      const statement: Omit<AnnualSalaryStatement, 'id' | 'generatedAt' | 'amendedFrom'> = {
        employeeId,
        financialYear,
        grossPayments,
        taxWithheld,
        superannuation,
        reportableFringeBenefits,
        reportableSuperContributions,
        workplaceGiving,
        allowances,
        lumpSumPayments,
        terminationPayments,
        isFinal: false // Draft until reviewed
      };

      // Store the statement
      const newStatement = await this.storeStatement(statement);

      // Generate ATO-compliant data for STP submission
      const atoData = await this.generateATOData(newStatement);

      // Store ATO data for potential STP submission
      await this.storeATOData(newStatement.id, atoData);

      return newStatement;
    } catch (error) {
      console.error('Error generating annual salary statement:', error);
      throw error;
    }
  }

  /**
   * Get existing annual salary statement
   */
  private async getExistingStatement(employeeId: string, financialYear: string): Promise<AnnualSalaryStatement | null> {
    try {
      const { data, error } = await supabase
        .from('annual_salary_statements')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('financial_year', financialYear)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw new Error(`Failed to fetch existing statement: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching existing statement:', error);
      throw error;
    }
  }

  /**
   * Get employee payroll data for the financial year
   */
  private async getEmployeePayrollData(employeeId: string, financialYear: string): Promise<any> {
    try {
      const [startDate, endDate] = this.getFinancialYearDates(financialYear);

      // Get employee details
      const { data: employee, error: employeeError } = await supabase
        .from('payroll_employees')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      if (employeeError || !employee) {
        throw new Error(`Employee not found: ${employeeId}`);
      }

      // Get payroll runs for the financial year
      const { data: payrollRuns, error: runsError } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('status', 'Paid')
        .gte('pay_period_start', startDate)
        .lte('pay_period_end', endDate)
        .order('pay_period_start', { ascending: true });

      if (runsError) {
        throw new Error(`Failed to fetch payroll runs: ${runsError.message}`);
      }

      return {
        employee,
        payrollRuns: payrollRuns || []
      };
    } catch (error) {
      console.error('Error fetching employee payroll data:', error);
      throw error;
    }
  }

  /**
   * Calculate gross payments for the financial year
   */
  private async calculateGrossPayments(employeeId: string, financialYear: string): Promise<number> {
    try {
      const [startDate, endDate] = this.getFinancialYearDates(financialYear);

      const { data: payslips, error } = await supabase
        .from('payslips')
        .select('gross_pay')
        .eq('employee_id', employeeId)
        .gte('pay_period_start', startDate)
        .lte('pay_period_end', endDate);

      if (error) {
        throw new Error(`Failed to calculate gross payments: ${error.message}`);
      }

      return payslips?.reduce((total, payslip) => total + (payslip.gross_pay || 0), 0) || 0;
    } catch (error) {
      console.error('Error calculating gross payments:', error);
      throw error;
    }
  }

  /**
   * Calculate tax withheld for the financial year
   */
  private async calculateTaxWithheld(employeeId: string, financialYear: string): Promise<number> {
    try {
      const [startDate, endDate] = this.getFinancialYearDates(financialYear);

      const { data: payslips, error } = await supabase
        .from('payslips')
        .select('tax_withheld')
        .eq('employee_id', employeeId)
        .gte('pay_period_start', startDate)
        .lte('pay_period_end', endDate);

      if (error) {
        throw new Error(`Failed to calculate tax withheld: ${error.message}`);
      }

      return payslips?.reduce((total, payslip) => total + (payslip.tax_withheld || 0), 0) || 0;
    } catch (error) {
      console.error('Error calculating tax withheld:', error);
      throw error;
    }
  }

  /**
   * Calculate superannuation contributions for the financial year
   */
  private async calculateSuperannuation(employeeId: string, financialYear: string): Promise<number> {
    try {
      const [startDate, endDate] = this.getFinancialYearDates(financialYear);

      const { data: contributions, error } = await supabase
        .from('superannuation_contributions')
        .select('amount')
        .eq('employee_id', employeeId)
        .eq('is_paid', true)
        .gte('period_start', startDate)
        .lte('period_end', endDate);

      if (error) {
        throw new Error(`Failed to calculate superannuation: ${error.message}`);
      }

      return contributions?.reduce((total, contribution) => total + (contribution.amount || 0), 0) || 0;
    } catch (error) {
      console.error('Error calculating superannuation:', error);
      throw error;
    }
  }

  /**
   * Calculate reportable fringe benefits for the financial year
   */
  private async calculateReportableFringeBenefits(employeeId: string, financialYear: string): Promise<number> {
    try {
      const [startDate, endDate] = this.getFinancialYearDates(financialYear);

      const { data: fringeBenefits, error } = await supabase
        .from('fringe_benefits')
        .select('amount')
        .eq('employee_id', employeeId)
        .eq('reportable', true)
        .gte('period_start', startDate)
        .lte('period_end', endDate);

      if (error) {
        throw new Error(`Failed to calculate reportable fringe benefits: ${error.message}`);
      }

      return fringeBenefits?.reduce((total, benefit) => total + (benefit.amount || 0), 0) || 0;
    } catch (error) {
      console.error('Error calculating reportable fringe benefits:', error);
      throw error;
    }
  }

  /**
   * Calculate reportable super contributions for the financial year
   */
  private async calculateReportableSuperContributions(employeeId: string, financialYear: string): Promise<number> {
    try {
      const [startDate, endDate] = this.getFinancialYearDates(financialYear);

      const { data: contributions, error } = await supabase
        .from('superannuation_contributions')
        .select('amount')
        .eq('employee_id', employeeId)
        .in('contribution_type', ['SalarySacrifice', 'Reportable'])
        .gte('period_start', startDate)
        .lte('period_end', endDate);

      if (error) {
        throw new Error(`Failed to calculate reportable super contributions: ${error.message}`);
      }

      return contributions?.reduce((total, contribution) => total + (contribution.amount || 0), 0) || 0;
    } catch (error) {
      console.error('Error calculating reportable super contributions:', error);
      throw error;
    }
  }

  /**
   * Calculate workplace giving for the financial year
   */
  private async calculateWorkplaceGiving(employeeId: string, financialYear: string): Promise<number> {
    try {
      const [startDate, endDate] = this.getFinancialYearDates(financialYear);

      const { data: deductions, error } = await supabase
        .from('deductions')
        .select('amount')
        .eq('employee_id', employeeId)
        .eq('category', 'WorkplaceGiving')
        .eq('is_active', true)
        .gte('effective_from', startDate)
        .or(`effective_to.is.null,effective_to.gte.${startDate}`);

      if (error) {
        throw new Error(`Failed to calculate workplace giving: ${error.message}`);
      }

      return deductions?.reduce((total, deduction) => total + (deduction.amount || 0), 0) || 0;
    } catch (error) {
      console.error('Error calculating workplace giving:', error);
      throw error;
    }
  }

  /**
   * Calculate allowances for the financial year
   */
  private async calculateAllowances(employeeId: string, financialYear: string): Promise<number> {
    try {
      const [startDate, endDate] = this.getFinancialYearDates(financialYear);

      const { data: allowances, error } = await supabase
        .from('pay_components')
        .select('amount')
        .eq('employee_id', employeeId)
        .eq('component_type', 'Allowance')
        .eq('tax_treatment', 'Reportable')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) {
        throw new Error(`Failed to calculate allowances: ${error.message}`);
      }

      return allowances?.reduce((total, allowance) => total + (allowance.amount || 0), 0) || 0;
    } catch (error) {
      console.error('Error calculating allowances:', error);
      throw error;
    }
  }

  /**
   * Calculate lump sum payments for the financial year
   */
  private async calculateLumpSumPayments(employeeId: string, financialYear: string): Promise<number> {
    try {
      const [startDate, endDate] = this.getFinancialYearDates(financialYear);

      const { data: lumpSums, error } = await supabase
        .from('bonus_payments')
        .select('amount')
        .eq('employee_id', employeeId)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (error) {
        throw new Error(`Failed to calculate lump sum payments: ${error.message}`);
      }

      return lumpSums?.reduce((total, lumpSum) => total + (lumpSum.amount || 0), 0) || 0;
    } catch (error) {
      console.error('Error calculating lump sum payments:', error);
      throw error;
    }
  }

  /**
   * Calculate termination payments for the financial year
   */
  private async calculateTerminationPayments(employeeId: string, financialYear: string): Promise<number> {
    try {
      const [startDate, endDate] = this.getFinancialYearDates(financialYear);

      const { data: terminationPayments, error } = await supabase
        .from('termination_payments')
        .select('amount')
        .eq('employee_id', employeeId)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (error) {
        throw new Error(`Failed to calculate termination payments: ${error.message}`);
      }

      return terminationPayments?.reduce((total, payment) => total + (payment.amount || 0), 0) || 0;
    } catch (error) {
      console.error('Error calculating termination payments:', error);
      throw error;
    }
  }

  /**
   * Store annual salary statement
   */
  private async storeStatement(statement: Omit<AnnualSalaryStatement, 'id' | 'generatedAt' | 'amendedFrom'>): Promise<AnnualSalaryStatement> {
    try {
      const statementData = {
        ...statement,
        generated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('annual_salary_statements')
        .insert(statementData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store annual salary statement: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error storing annual salary statement:', error);
      throw error;
    }
  }

  /**
   * Generate ATO-compliant data for STP submission
   */
  private async generateATOData(statement: AnnualSalaryStatement): Promise<any> {
    try {
      // Get employee details
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('first_name, last_name, date_of_birth, address, tax_file_number')
        .eq('id', statement.employeeId)
        .single();

      if (employeeError || !employee) {
        throw new Error(`Employee not found: ${statement.employeeId}`);
      }

      // Get employer details
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name, abn, address')
        .limit(1)
        .single();

      if (companyError || !company) {
        throw new Error('Company details not found');
      }

      const atoData = {
        submissionType: 'PaygWithholdingAnnualReport',
        financialYear: statement.financialYear,
        employer: {
          abn: company.abn,
          name: company.name,
          address: company.address
        },
        employee: {
          id: statement.employeeId,
          firstName: employee.first_name,
          lastName: employee.last_name,
          dateOfBirth: employee.date_of_birth,
          address: employee.address,
          taxFileNumber: employee.tax_file_number
        },
        incomeDetails: {
          grossPayments: {
            amount: statement.grossPayments,
            code: AnnualSalaryStatementService.ATO_PAYG_SUMMARY_CODES.GROSS_PAYMENTS
          },
          taxWithheld: {
            amount: statement.taxWithheld,
            code: AnnualSalaryStatementService.ATO_PAYG_SUMMARY_CODES.TAX_WITHHELD
          },
          superannuation: {
            amount: statement.superannuation,
            code: AnnualSalaryStatementService.ATO_PAYG_SUMMARY_CODES.SUPERANNUATION
          },
          reportableFringeBenefits: {
            amount: statement.reportableFringeBenefits,
            code: AnnualSalaryStatementService.ATO_PAYG_SUMMARY_CODES.REPORTABLE_FRINGE_BENEFITS
          },
          reportableSuperContributions: {
            amount: statement.reportableSuperContributions,
            code: AnnualSalaryStatementService.ATO_PAYG_SUMMARY_CODES.REPORTABLE_SUPER_CONTRIBUTIONS
          },
          workplaceGiving: {
            amount: statement.workplaceGiving,
            code: AnnualSalaryStatementService.ATO_PAYG_SUMMARY_CODES.WORKPLACE_GIVING
          },
          allowances: {
            amount: statement.allowances,
            code: AnnualSalaryStatementService.ATO_PAYG_SUMMARY_CODES.ALLOWANCES
          },
          lumpSumPayments: {
            amount: statement.lumpSumPayments,
            code: AnnualSalaryStatementService.ATO_PAYG_SUMMARY_CODES.LUMP_SUM_A
          },
          terminationPayments: {
            amount: statement.terminationPayments,
            code: AnnualSalaryStatementService.ATO_PAYG_SUMMARY_CODES.TERMINATION_PAYMENTS
          }
        },
        generatedAt: statement.generatedAt,
        isFinal: statement.isFinal
      };

      return atoData;
    } catch (error) {
      console.error('Error generating ATO data:', error);
      throw error;
    }
  }

  /**
   * Store ATO data for the statement
   */
  private async storeATOData(statementId: string, atoData: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('annual_salary_statement_ato_data')
        .insert({
          statement_id: statementId,
          ato_data: atoData,
          created_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Failed to store ATO data: ${error.message}`);
      }
    } catch (error) {
      console.error('Error storing ATO data:', error);
      throw error;
    }
  }

  /**
   * Finalize annual salary statement
   */
  async finalizeStatement(statementId: string): Promise<AnnualSalaryStatement> {
    try {
      // Get the statement
      const { data: statement, error: fetchError } = await supabase
        .from('annual_salary_statements')
        .select('*')
        .eq('id', statementId)
        .single();

      if (fetchError || !statement) {
        throw new Error(`Statement not found: ${statementId}`);
      }

      if (statement.is_final) {
        throw new Error('Statement is already finalized');
      }

      // Update statement as final
      const { data: updatedStatement, error: updateError } = await supabase
        .from('annual_salary_statements')
        .update({ is_final: true })
        .eq('id', statementId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to finalize statement: ${updateError.message}`);
      }

      // Generate STP submission for ATO
      await this.generateSTPSubmission(updatedStatement);

      return updatedStatement;
    } catch (error) {
      console.error('Error finalizing annual salary statement:', error);
      throw error;
    }
  }

  /**
   * Generate STP submission for finalized statement
   */
  private async generateSTPSubmission(statement: AnnualSalaryStatement): Promise<STPSubmission> {
    try {
      // Get ATO data
      const { data: atoDataRecord, error: atoError } = await supabase
        .from('annual_salary_statement_ato_data')
        .select('ato_data')
        .eq('statement_id', statement.id)
        .single();

      if (atoError || !atoDataRecord) {
        throw new Error(`ATO data not found for statement: ${statement.id}`);
      }

      const atoData = atoDataRecord.ato_data;

      // Create STP submission
      const stpSubmission: Omit<STPSubmission, 'id' | 'createdAt' | 'updatedAt'> = {
        payrollRunId: null, // Annual statement is not tied to a specific payroll run
        submissionType: 'PaygWithholdingAnnualReport',
        submissionId: `ASS-${statement.financialYear}-${statement.employeeId}`,
        status: 'Draft',
        submissionDate: new Date().toISOString(),
        employeeCount: 1,
        totalGross: statement.grossPayments,
        totalTax: statement.taxWithheld,
        totalSuper: statement.superannuation
      };

      const { data: newSubmission, error: submissionError } = await supabase
        .from('stp_submissions')
        .insert(stpSubmission)
        .select()
        .single();

      if (submissionError) {
        throw new Error(`Failed to create STP submission: ${submissionError.message}`);
      }

      // Create STP payee data
      const stpPayeeData = {
        stpSubmissionId: newSubmission.id,
        employeeId: statement.employeeId,
        incomeType: 'SAW', // Salary and wages
        grossAmount: statement.grossPayments,
        taxAmount: statement.taxWithheld,
        superAmount: statement.superannuation,
        ytdGross: statement.grossPayments,
        ytdTax: statement.taxWithheld,
        ytdSuper: statement.superannuation,
        payPeriodStart: startOfYear(new Date(parseInt(statement.financialYear.split('-')[0]), 6, 1)).toISOString(),
        payPeriodEnd: endOfYear(new Date(parseInt(statement.financialYear.split('-')[1]), 5, 30)).toISOString()
      };

      const { error: payeeError } = await supabase
        .from('stp_payee_data')
        .insert(stpPayeeData);

      if (payeeError) {
        throw new Error(`Failed to create STP payee data: ${payeeError.message}`);
      }

      return newSubmission;
    } catch (error) {
      console.error('Error generating STP submission:', error);
      throw error;
    }
  }

  /**
   * Get annual salary statement by ID
   */
  async getStatement(statementId: string): Promise<AnnualSalaryStatement | null> {
    try {
      const { data, error } = await supabase
        .from('annual_salary_statements')
        .select('*')
        .eq('id', statementId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch statement: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching statement:', error);
      throw error;
    }
  }

  /**
   * Get employee's annual salary statements
   */
  async getEmployeeStatements(employeeId: string): Promise<AnnualSalaryStatement[]> {
    try {
      const { data, error } = await supabase
        .from('annual_salary_statements')
        .select('*')
        .eq('employee_id', employeeId)
        .order('financial_year', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch employee statements: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching employee statements:', error);
      throw error;
    }
  }

  /**
   * Get statements for a financial year
   */
  async getStatementsByFinancialYear(financialYear: string): Promise<AnnualSalaryStatement[]> {
    try {
      const { data, error } = await supabase
        .from('annual_salary_statements')
        .select(`
          *,
          employee:employees!employee_id(first_name, last_name, employee_id)
        `)
        .eq('financial_year', financialYear)
        .order('employee_id', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch statements by financial year: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching statements by financial year:', error);
      throw error;
    }
  }

  /**
   * Generate PDF report for annual salary statement
   */
  async generatePDFReport(statementId: string): Promise<Buffer> {
    try {
      const statement = await this.getStatement(statementId);
      if (!statement) {
        throw new Error(`Statement not found: ${statementId}`);
      }

      // Get employee details
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('first_name, last_name, employee_id, address, tax_file_number')
        .eq('id', statement.employeeId)
        .single();

      if (employeeError || !employee) {
        throw new Error(`Employee not found: ${statement.employeeId}`);
      }

      // Get company details
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name, abn, address, phone, email')
        .limit(1)
        .single();

      if (companyError || !company) {
        throw new Error('Company details not found');
      }

      // For demonstration, return a mock PDF buffer
      // In a real implementation, you would use a PDF generation library like pdf-lib or puppeteer
      const mockPDFContent = this.generateMockPDFContent(statement, employee, company);
      const buffer = Buffer.from(mockPDFContent, 'utf-8');

      return buffer;
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw error;
    }
  }

  /**
   * Generate mock PDF content for demonstration
   */
  private generateMockPDFContent(statement: AnnualSalaryStatement, employee: any, company: any): string {
    return `
ANNUAL SALARY STATEMENT
Financial Year: ${statement.financialYear}

EMPLOYER DETAILS:
Name: ${company.name}
ABN: ${company.abn}
Address: ${company.address}
Phone: ${company.phone}
Email: ${company.email}

EMPLOYEE DETAILS:
Name: ${employee.first_name} ${employee.last_name}
Employee ID: ${employee.employee_id}
Address: ${employee.address}
Tax File Number: ${employee.tax_file_number}

INCOME SUMMARY:
Gross Payments: $${statement.grossPayments.toFixed(2)}
Tax Withheld: $${statement.taxWithheld.toFixed(2)}
Superannuation: $${statement.superannuation.toFixed(2)}
Reportable Fringe Benefits: $${statement.reportableFringeBenefits.toFixed(2)}
Reportable Super Contributions: $${statement.reportableSuperContributions.toFixed(2)}
Workplace Giving: $${statement.workplaceGiving.toFixed(2)}
Allowances: $${statement.allowances.toFixed(2)}
Lump Sum Payments: $${statement.lumpSumPayments.toFixed(2)}
Termination Payments: $${statement.terminationPayments.toFixed(2)}

Statement Status: ${statement.isFinal ? 'FINAL' : 'DRAFT'}
Generated: ${new Date(statement.generatedAt).toLocaleDateString()}
    `;
  }

  /**
   * Get financial year dates
   */
  private getFinancialYearDates(financialYear: string): [string, string] {
    const [startYear, endYear] = financialYear.split('-').map(year => parseInt(year));
    
    // Australian financial year: 1 July to 30 June
    const startDate = new Date(startYear, 6, 1); // July 1
    const endDate = new Date(endYear, 5, 30); // June 30

    return [
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd')
    ];
  }

  /**
   * Validate financial year format
   */
  private validateFinancialYear(financialYear: string): boolean {
    const yearPattern = /^\d{4}-\d{4}$/;
    if (!yearPattern.test(financialYear)) {
      return false;
    }

    const [startYear, endYear] = financialYear.split('-').map(year => parseInt(year));
    return endYear === startYear + 1;
  }
}