
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { computeBasicPay, getPayslipAmounts, getPayslipDates } from '@/lib/payroll/payslipUtils';

// Extend jsPDF type to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

export const pdfGeneratorService = {
  createDocument(title: string): jsPDF {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    
    // Set document properties
    doc.setProperties({
      title: title,
      subject: 'Payroll Report',
      author: 'Stellaris HRM',
      creator: 'Stellaris HRM System'
    });

    return doc;
  },

  addHeader(doc: jsPDF, title: string, subtitle?: string) {
    const pageWidth = doc.internal.pageSize.width;
    
    // Company Name/Logo placeholder
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Stellaris HRM', 14, 20);
    
    // Report Title
    doc.setFontSize(16);
    doc.setTextColor(60, 60, 60);
    doc.text(title, 14, 30);
    
    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(subtitle, 14, 36);
    }
    
    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 40, pageWidth - 14, 40);
    
    return 45; // Return Y position for next content
  },

  addFooter(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      
      const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');
      doc.text(`Generated on ${dateStr}`, 14, pageHeight - 10);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 25, pageHeight - 10);
    }
  },

  generatePayrollSummaryReport(data: any): void {
    const doc = this.createDocument('Payroll Summary Report');
    const periodStart = data.periodStart || data.period?.start;
    const periodEnd = data.periodEnd || data.period?.end;
    
    const periodStr = `Period: ${format(new Date(periodStart), 'dd/MM/yyyy')} - ${format(new Date(periodEnd), 'dd/MM/yyyy')}`;
    let finalY = this.addHeader(doc, 'Payroll Summary Report', periodStr);

    // Totals Section
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Financial Summary', 14, finalY + 10);
    
    // Handle different data structures (PayrollReport vs PayrollSummaryReport)
    const grossPay = data.totalGrossPay ?? data.totals?.grossPay ?? 0;
    const tax = data.totalTax ?? data.totals?.tax ?? 0;
    const netPay = data.totalNetPay ?? data.totals?.netPay ?? 0;
    const superAmt = data.totalSuper ?? data.totals?.superannuation ?? 0;
    const empCount = data.totalEmployees ?? data.employeeCount ?? 0;

    const totalsData = [
      ['Total Gross Pay', `$${grossPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
      ['Total Tax Withheld', `$${tax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
      ['Total Net Pay', `$${netPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
      ['Total Superannuation', `$${superAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
      ['Employee Count', empCount.toString()]
    ];

    autoTable(doc, {
      startY: finalY + 15,
      head: [['Category', 'Amount']],
      body: totalsData,
      theme: 'striped',
      headStyles: { fillColor: [66, 133, 244] },
      columnStyles: { 
        0: { fontStyle: 'bold' },
        1: { halign: 'right' } 
      },
      margin: { left: 14, right: 14 }
    });

    // Employee Breakdown Table (if available)
    if (data.employeeBreakdown && data.employeeBreakdown.length > 0) {
      const breakdownY = (doc as any).lastAutoTable.finalY + 15;
      doc.text('Employee Breakdown', 14, breakdownY);
      
      const breakdownData = data.employeeBreakdown.map((emp: any) => [
        emp.employeeName,
        `$${emp.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        `$${emp.tax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        `$${emp.netPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        `$${emp.super.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        emp.status
      ]);

      autoTable(doc, {
        startY: breakdownY + 5,
        head: [['Employee', 'Gross', 'Tax', 'Net', 'Super', 'Status']],
        body: breakdownData,
        theme: 'striped',
        headStyles: { fillColor: [66, 133, 244] },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' }
        }
      });
    }

    // Add footer and save
    this.addFooter(doc);
    doc.save(`payroll_summary_${format(new Date(), 'yyyyMMdd')}.pdf`);
  },

  generateTaxReport(data: any): void {
    const doc = this.createDocument('PAYG Tax Report');
    const periodStart = data.periodStart || data.period?.start;
    const periodEnd = data.periodEnd || data.period?.end;
    const periodStr = `Period: ${format(new Date(periodStart), 'dd/MM/yyyy')} - ${format(new Date(periodEnd), 'dd/MM/yyyy')}`;
    let finalY = this.addHeader(doc, 'PAYG Tax Report', periodStr);

    // Summary
    const totalTax = data.totalTaxWithheld ?? 0;
    doc.setFontSize(12);
    doc.text(`Total Tax Withheld: $${totalTax.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 14, finalY + 10);

    // Breakdown Table
    const breakdown = data.taxBreakdown || [];
    const tableData = breakdown.map((item: any) => [
      item.employeeName || 'Unknown',
      item.taxFileNumber || '',
      `$${(item.grossPay || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`,
      `$${(item.taxWithheld || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Employee', 'TFN', 'Gross Pay', 'Tax Withheld']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [142, 68, 173] }, // Purple
      columnStyles: { 
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    this.addFooter(doc);
    doc.save(`tax_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  },

  generateSuperReport(data: any): void {
    const doc = this.createDocument('Superannuation Report');
    const periodStart = data.periodStart || data.period?.start;
    const periodEnd = data.periodEnd || data.period?.end;
    const periodStr = `Period: ${format(new Date(periodStart), 'dd/MM/yyyy')} - ${format(new Date(periodEnd), 'dd/MM/yyyy')}`;
    let finalY = this.addHeader(doc, 'Superannuation Report', periodStr);

    // Summary
    const totalSuper = data.totalContributions ?? 0;
    doc.setFontSize(12);
    doc.text(`Total Contributions: $${totalSuper.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 14, finalY + 10);

    // Employee Table
    const contributions = data.employeeContributions || [];
    const tableData = contributions.map((item: any) => [
      item.employeeName || 'Unknown',
      item.superMemberNumber || '',
      item.fundName || 'Unknown Fund',
      `$${(item.contributions || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`,
      item.paymentStatus || 'Pending'
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Employee', 'Member #', 'Fund', 'Amount', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [230, 126, 34] }, // Orange
      columnStyles: { 
        3: { halign: 'right' }
      }
    });

    this.addFooter(doc);
    doc.save(`super_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  },

  generateComplianceReport(data: any): void {
    const doc = this.createDocument('Payroll Compliance Report');
    let finalY = this.addHeader(doc, 'Compliance Report');

    // Status Overview
    const overallRate = data.overallComplianceRate || 100;
    doc.setFontSize(12);
    doc.setTextColor(overallRate === 100 ? 0 : 200, overallRate === 100 ? 100 : 0, 0);
    doc.text(`Overall Compliance Score: ${overallRate}%`, 14, finalY + 10);
    doc.setTextColor(0, 0, 0);

    // Compliance Checks Table
    const minWageOk = (data.minimumWageCompliance?.nonCompliantEmployees ?? 0) === 0;
    const superOk = (data.superannuationCompliance?.overdueContributions ?? 0) === 0;
    const taxOk = (data.taxCompliance?.issues || []).length === 0;
    const awardOk = (data.awardCompliance?.nonCompliantEmployees ?? 0) === 0;
    const checks = [
      ['Minimum Wage', minWageOk ? 'Pass' : 'Fail'],
      ['Superannuation', superOk ? 'Pass' : 'Fail'],
      ['Tax Withholding', taxOk ? 'Pass' : 'Fail'],
      ['Award Interpretation', awardOk ? 'Pass' : 'Fail']
    ];

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Compliance Check', 'Status']],
      body: checks,
      theme: 'grid',
      headStyles: { fillColor: [192, 57, 43] }, // Red
      columnStyles: {
        1: { fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'Pass') {
            data.cell.styles.textColor = [0, 128, 0];
          } else {
            data.cell.styles.textColor = [200, 0, 0];
          }
        }
      }
    });

    // Recommendations if any
    const issues = data.recommendations || [];
    if (issues.length > 0) {
      const currentY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text('Recommendations & Issues', 14, currentY);
      
      issues.forEach((issue: string, index: number) => {
        doc.setFontSize(10);
        doc.text(`• ${issue}`, 14, currentY + 10 + (index * 6));
      });
    }

    this.addFooter(doc);
    doc.save(`compliance_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  },

  generatePayslipPdf(input: {
    payslip: any;
    employee?: {
      first_name?: string;
      last_name?: string;
      employee_code?: string;
      email?: string;
    } | null;
    ytd?: { gross: number; tax: number; net: number; super: number };
  }): void {
    const doc = this.createDocument('Payslip');
    const payslip = input.payslip || {};
    const employee = input.employee || null;

    const { periodStart, periodEnd, paymentDate } = getPayslipDates(payslip);
    const periodStr =
      periodStart && periodEnd
        ? `Pay period: ${format(new Date(periodStart), 'dd/MM/yyyy')} - ${format(new Date(periodEnd), 'dd/MM/yyyy')}`
        : 'Pay period: -';
    const paymentStr = paymentDate ? `Payment date: ${format(new Date(paymentDate), 'dd/MM/yyyy')}` : 'Payment date: -';

    let finalY = this.addHeader(doc, 'Payslip', `${periodStr} • ${paymentStr}`);

    const { grossPay, allowances, overtime, taxWithheld, netPay, superannuation } = getPayslipAmounts(payslip);
    const basicPay = computeBasicPay(payslip);

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    const empName = employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : '';
    const empCode = employee?.employee_code ? ` (${employee.employee_code})` : '';
    doc.text(`Employee: ${empName || '—'}${empCode}`, 14, finalY + 6);
    if (employee?.email) doc.text(`Email: ${employee.email}`, 14, finalY + 12);

    finalY = finalY + 18;

    autoTable(doc, {
      startY: finalY,
      head: [['Earnings', 'Amount']],
      body: [
        ['Basic Pay', `$${basicPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Allowances', `$${allowances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Overtime', `$${overtime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Gross Pay', `$${grossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [66, 133, 244] },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;

    autoTable(doc, {
      startY: finalY,
      head: [['Deductions', 'Amount']],
      body: [
        ['Tax Withheld', `$${taxWithheld.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Deductions', `$${(grossPay - netPay).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [220, 53, 69] },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;

    autoTable(doc, {
      startY: finalY,
      head: [['Summary', 'Amount']],
      body: [
        ['Net Pay', `$${netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Superannuation', `$${superannuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    if (input.ytd) {
      finalY = (doc as any).lastAutoTable.finalY + 10;
      autoTable(doc, {
        startY: finalY,
        head: [['Year-to-date', 'Amount']],
        body: [
          ['YTD Gross', `$${input.ytd.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          ['YTD Tax', `$${input.ytd.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          ['YTD Net', `$${input.ytd.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          ['YTD Super', `$${input.ytd.super.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 14, right: 14 },
      });
    }

    this.addFooter(doc);

    const fileEmployee = employee?.employee_code || employee?.email || 'employee';
    const filePeriod = periodEnd ? format(new Date(periodEnd), 'yyyyMMdd') : format(new Date(), 'yyyyMMdd');
    doc.save(`payslip_${fileEmployee}_${filePeriod}.pdf`);
  }
};
