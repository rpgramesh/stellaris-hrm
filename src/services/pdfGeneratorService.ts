
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

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
      headStyles: { fillColor: [39, 174, 96] }, // Green
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

  generatePayslipPDF(data: {
    payslip: any;
    employee: any;
    ytdPayslips: any[];
  }): jsPDF {
    const { payslip, employee, ytdPayslips } = data;
    const doc = new jsPDF();
    
    // Define colors and styles
    const primaryColor: [number, number, number] = [28, 55, 103]; // Dark blue from logo
    const lightGrey: [number, number, number] = [245, 245, 245];
    const mediumGrey: [number, number, number] = [230, 230, 230];
    const darkGrey: [number, number, number] = [100, 100, 100];
    
    // 1. Header - Logo and Company Details
    try {
      doc.addImage('/logo.png', 'PNG', 15, 15, 50, 15);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('STELLARIS', 15, 25);
      doc.setFontSize(8);
      doc.text('IT CONSULTING & RESOURCING', 15, 30);
    }
    
    // Company Details Box (Top Right)
    doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.rect(140, 15, 55, 35, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('PAID BY', 145, 22);
    doc.setFont('helvetica', 'normal');
    doc.text('STELLARIS CONSULTING', 145, 27);
    doc.text('AUSTRALIA PTY LTD', 145, 31);
    doc.text('Level 1 182 La Trobe Terrace', 145, 35);
    doc.text('WEST GEELONG VIC 3218', 145, 39);
    doc.text('ABN 81 624 546 649', 145, 43);

    // 2. Employee and Employment Details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${employee.first_name} ${employee.last_name}`, 40, 65);
    if (employee.address) {
      const addressLines = employee.address.split(',').map((s: string) => s.trim());
      addressLines.forEach((line: string, i: number) => {
        doc.text(line, 40, 70 + (i * 5));
      });
    }

    doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.rect(140, 55, 55, 35, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('EMPLOYMENT DETAILS', 145, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pay Frequency: ${employee.pay_frequency || employee.pay_cycle || 'Monthly'}`, 145, 68);

    // 3. Summary Bar
    doc.setFillColor(mediumGrey[0], mediumGrey[1], mediumGrey[2]);
    doc.rect(15, 95, 180, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const periodStart = payslip.period_start || payslip.pay_period_start || payslip.periodStart || payslip.payPeriodStart;
    const periodEnd = payslip.period_end || payslip.pay_period_end || payslip.periodEnd || payslip.payPeriodEnd;
    doc.text(`Pay Period: ${format(new Date(periodStart), 'dd/MM/yyyy')} - ${format(new Date(periodEnd), 'dd/MM/yyyy')}`, 20, 101.5);
    doc.text(`Payment Date: ${format(new Date(payslip.payment_date || payslip.paymentDate), 'dd/MM/yyyy')}`, 65, 101.5);
    doc.setFont('helvetica', 'bold');
    const grossPay = Number(payslip.gross_pay || payslip.grossPay || payslip.gross_salary || payslip.grossSalary || 0);
    const netPay = Number(payslip.net_pay || payslip.netPay || payslip.net_salary || payslip.netSalary || 0);
    doc.text(`Total Earnings: $${grossPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 120, 101.5);
    doc.text(`Net Pay: $${netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 165, 101.5);

    // 4. Tables
    let currentY = 115;

    // Salary & Wages
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SALARY & WAGES', 15, currentY);
    
    const earningsData = (payslip.pay_components || payslip.payComponents || [])
      .filter((c: any) => ['BaseSalary', 'Overtime', 'Earnings', 'Allowance'].includes(c.component_type || c.componentType))
      .map((c: any) => {
        const ytdValue = (ytdPayslips || [])
          .flatMap(p => p.pay_components || p.payComponents || [])
          .filter((pc: any) => (pc.description || pc.componentType) === (c.description || c.componentType))
          .reduce((sum: number, pc: any) => sum + Number(pc.amount || 0), 0);

        return [
          c.description || c.componentType,
          c.units?.toFixed(4) || '—',
          `$${Number(c.rate || 0).toFixed(4)}`,
          `$${Number(c.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          `$${ytdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        ];
      });

    if (earningsData.length === 0) {
      const ytdGross = (ytdPayslips || []).reduce((sum, p) => sum + Number(p.gross_pay || p.grossPay || p.gross_salary || p.grossSalary || 0), 0);
      earningsData.push(['Ordinary Hours', '—', '—', `$${grossPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, `$${ytdGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]);
    }

    autoTable(doc, {
      startY: currentY + 2,
      head: [['', 'UNITS', 'RATE', 'THIS PAY', 'YTD']],
      body: [
        ...earningsData,
        [{ content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } }, '', '', { content: `$${grossPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }, { content: `$${(ytdPayslips || []).reduce((sum, p) => sum + Number(p.gross_pay || p.grossPay || p.gross_salary || p.grossSalary || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }]
      ],
      theme: 'plain',
      headStyles: { fontSize: 7, textColor: darkGrey, halign: 'right' },
      columnStyles: {
        0: { halign: 'left', cellWidth: 80 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      styles: { fontSize: 8, cellPadding: 2 },
      didParseCell: function(data: any) {
        if (data.row.index === earningsData.length) {
          data.cell.styles.fillColor = lightGrey;
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Tax
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TAX', 15, currentY);

    const taxWithheld = Number(payslip.tax_withheld || payslip.taxWithheld || payslip.income_tax || payslip.incomeTax || 0);
    const ytdTax = (ytdPayslips || []).reduce((sum, p) => sum + Number(p.tax_withheld || p.taxWithheld || p.income_tax || p.incomeTax || 0), 0);

    autoTable(doc, {
      startY: currentY + 2,
      head: [['', '', '', 'THIS PAY', 'YTD']],
      body: [
        ['PAYG', '', '', `$${taxWithheld.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, `$${ytdTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        [{ content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } }, '', '', { content: `$${taxWithheld.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }, { content: `$${ytdTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }]
      ],
      theme: 'plain',
      headStyles: { fontSize: 7, textColor: darkGrey, halign: 'right' },
      columnStyles: {
        0: { halign: 'left', cellWidth: 80 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      styles: { fontSize: 8, cellPadding: 2 },
      didParseCell: function(data: any) {
        if (data.row.index === 1) {
          data.cell.styles.fillColor = lightGrey;
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Superannuation
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SUPERANNUATION', 15, currentY);

    const superAmt = Number(payslip.superannuation || payslip.super || 0);
    const ytdSuper = (ytdPayslips || []).reduce((sum, p) => sum + Number(p.superannuation || p.super || 0), 0);

    autoTable(doc, {
      startY: currentY + 2,
      head: [['', '', '', 'THIS PAY', 'YTD']],
      body: [
        [`SGC - ${employee.superannuation_fund_name || 'Super Fund'} - ${employee.superannuation_member_number || ''}`, '', '', `$${superAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, `$${ytdSuper.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        [{ content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } }, '', '', { content: `$${superAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }, { content: `$${ytdSuper.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }]
      ],
      theme: 'plain',
      headStyles: { fontSize: 7, textColor: darkGrey, halign: 'right' },
      columnStyles: {
        0: { halign: 'left', cellWidth: 80 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      styles: { fontSize: 8, cellPadding: 2 },
      didParseCell: function(data: any) {
        if (data.row.index === 1) {
          data.cell.styles.fillColor = lightGrey;
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // 5. Payment Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PAYMENT DETAILS', 15, currentY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
    doc.text('ACCOUNT', 15, currentY + 5);
    doc.text('REFERENCE', 120, currentY + 5);
    doc.text('AMOUNT', 180, currentY + 5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const bankAccount = employee.bank_account_number ? `(${employee.bank_name || ''}) *****${employee.bank_account_number.slice(-4)}` : '—';
    doc.text(bankAccount, 15, currentY + 10);
    doc.text(`${employee.first_name} ${employee.last_name}`, 45, currentY + 10);
    doc.text('Salary', 120, currentY + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 195, currentY + 10, { align: 'right' });

    return doc;
  }
};
