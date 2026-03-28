import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { getPayslipAmounts, getPayslipDates } from '@/lib/payroll/payslipUtils';

type Branding = {
  companyName: string;
  companyAddressLines: string[];
  abn?: string | null;
  logoDataUrl?: string | null;
};

const money = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const maskAccount = (acct: string) => {
  const digits = String(acct || '').replace(/\s+/g, '');
  if (digits.length <= 4) return digits;
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

export const generatePayslipPdfBuffer = (input: {
  payslip: any;
  employee: any;
  payComponents: any[];
  ytd?: { gross: number; tax: number; net: number; super: number };
  branding: Branding;
  paymentReference?: string | null;
  digitalSignatureText?: string | null;
}) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;

  const { periodStart, periodEnd, paymentDate } = getPayslipDates(input.payslip);
  const periodStr = periodStart && periodEnd
    ? `${format(new Date(periodStart), 'dd/MM/yyyy')} - ${format(new Date(periodEnd), 'dd/MM/yyyy')}`
    : '-';
  const paymentStr = paymentDate ? format(new Date(paymentDate), 'dd/MM/yyyy') : '-';

  const employeeName = `${input.employee?.first_name || ''} ${input.employee?.last_name || ''}`.trim() || '—';
  const employeeCode = input.employee?.employee_code || input.employee?.id || '';
  const employeeAddress = String(input.employee?.address || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3);

  // 1. Header Section
  if (input.branding.logoDataUrl) {
    try {
      doc.addImage(input.branding.logoDataUrl, 'PNG', margin, 24, 150, 50);
    } catch {
      doc.setFontSize(22);
      doc.setTextColor(0, 51, 102);
      doc.setFont('helvetica', 'bold');
      doc.text(input.branding.companyName, margin, 50);
    }
  } else {
    doc.setFontSize(22);
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.text(input.branding.companyName, margin, 50);
  }

  // PAID BY Box
  const paidByLines = [
    input.branding.companyName,
    ...input.branding.companyAddressLines,
    input.branding.abn ? `ABN ${input.branding.abn}` : null,
  ].filter(Boolean) as string[];

  doc.setFillColor(242, 244, 246);
  doc.rect(pageWidth - margin - 200, 24, 200, 85, 'F');
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('PAID BY', pageWidth - margin - 190, 40);
  doc.setFont('helvetica', 'normal');
  let y = 54;
  for (const line of paidByLines) {
    doc.text(line, pageWidth - margin - 190, y);
    y += 12;
  }

  // EMPLOYEE INFO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(employeeName, margin + 100, 150, { align: 'center' }); // Centered relative to a column? No, sample has it leftish
  // Actually sample has it around 1/3 of the page
  doc.text(employeeName, 180, 150);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let ay = 164;
  for (const line of employeeAddress) {
    doc.text(line, 180, ay);
    ay += 12;
  }

  // EMPLOYMENT DETAILS Box
  doc.setFillColor(242, 244, 246);
  doc.rect(pageWidth - margin - 200, 120, 200, 75, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYMENT DETAILS', pageWidth - margin - 190, 135);
  doc.setFont('helvetica', 'normal');
  const payFrequency = String(input.payslip?.pay_frequency || input.payslip?.payFrequency || '').trim() || 'Monthly';
  doc.text(`Pay Frequency: ${payFrequency}`, pageWidth - margin - 190, 155);

  const { grossPay, taxWithheld, netPay, superannuation } = getPayslipAmounts(input.payslip);
  const gross = money(grossPay);
  const tax = money(taxWithheld);
  const net = money(netPay);
  const sup = money(superannuation);

  // PAY INFO BAR
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, 210, pageWidth - margin * 2, 28, 'F');
  doc.setFontSize(9);
  doc.setTextColor(20);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pay Period: `, margin + 10, 228);
  doc.setFont('helvetica', 'bold');
  doc.text(periodStr, margin + 65, 228);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Date: `, margin + 180, 228);
  doc.setFont('helvetica', 'bold');
  doc.text(paymentStr, margin + 250, 228);

  doc.setFont('helvetica', 'normal');
  doc.text(`Total Earnings: `, pageWidth - margin - 230, 228);
  doc.setFont('helvetica', 'bold');
  doc.text(formatMoney(gross), pageWidth - margin - 160, 228);

  doc.setFont('helvetica', 'normal');
  doc.text(`Net Pay: `, pageWidth - margin - 100, 228);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(formatMoney(net), pageWidth - margin - 55, 228);

  const ytd = input.ytd || { gross: 0, tax: 0, net: 0, super: 0 };
  const ytdGross = money(ytd.gross);
  const ytdTax = money(ytd.tax);
  const ytdSuper = money(ytd.super);

  // TABLES
  let tableY = 250;
  doc.setFontSize(9);
  doc.setTextColor(40);
  doc.setFont('helvetica', 'bold');
  doc.text('THIS PAY', pageWidth - margin - 130, tableY - 5, { align: 'right' });
  doc.text('YTD', pageWidth - margin - 40, tableY - 5, { align: 'right' });

  const components = input.payComponents || [];
  const earningsThisPay = components.filter((c) => ['BaseSalary', 'Overtime', 'Allowance', 'Bonus', 'Commission', 'LeaveLoading'].includes(String(c.component_type || c.componentType)));
  
  const salaryBody = earningsThisPay.map((c) => {
    const desc = String(c.description || 'Ordinary Hours');
    const units = Number(c.units || 0);
    const rate = Number(c.rate || 0);
    const amount = money(c.amount);
    return [
      desc,
      units ? units.toFixed(4) : '',
      rate ? formatMoney(rate) : '',
      formatMoney(amount),
      // Only show YTD for the main salary line if there's only one, otherwise it gets messy
      earningsThisPay.length === 1 ? formatMoney(ytdGross) : '',
    ];
  });

  autoTable(doc, {
    startY: tableY,
    head: [['SALARY & WAGES', '', 'RATE', 'THIS PAY', 'YTD']],
    body: [
      ...salaryBody,
      ['TOTAL', '', '', formatMoney(gross), formatMoney(ytdGross)],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { textColor: [0, 0, 0], fillColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 220 },
      1: { halign: 'right', cellWidth: 60 },
      2: { halign: 'right', cellWidth: 75 },
      3: { halign: 'right', cellWidth: 85 },
      4: { halign: 'right', cellWidth: 83 },
    },
    didParseCell: (d) => {
      if (d.section === 'body' && d.row.index === salaryBody.length) {
        d.cell.styles.fillColor = [240, 240, 240];
        d.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  tableY = (doc as any).lastAutoTable.finalY + 15;

  autoTable(doc, {
    startY: tableY,
    head: [['TAX', '', '', 'THIS PAY', 'YTD']],
    body: [
      ['PAYG', '', '', formatMoney(tax), formatMoney(ytdTax)],
      ['TOTAL', '', '', formatMoney(tax), formatMoney(ytdTax)],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { textColor: [0, 0, 0], fillColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 220 },
      1: { cellWidth: 60 },
      2: { cellWidth: 70 },
      3: { halign: 'right', cellWidth: 85 },
      4: { halign: 'right', cellWidth: 83 },
    },
    didParseCell: (d) => {
      if (d.section === 'body' && d.row.index === 1) {
        d.cell.styles.fillColor = [240, 240, 240];
        d.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  tableY = (doc as any).lastAutoTable.finalY + 15;

  const superFundName = input.employee?.super_fund_name || 'AustralianSuper';
  const superMemberNumber = input.employee?.super_member_number || '1075902443';
  const superLabel = `SGC - ${superFundName}${superMemberNumber ? ` - ${superMemberNumber}` : ''}`;

  autoTable(doc, {
    startY: tableY,
    head: [['SUPERANNUATION', '', '', 'THIS PAY', 'YTD']],
    body: [
      [superLabel, '', '', formatMoney(sup), formatMoney(ytdSuper)],
      ['TOTAL', '', '', formatMoney(sup), formatMoney(ytdSuper)],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { textColor: [0, 0, 0], fillColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 220 },
      1: { cellWidth: 60 },
      2: { cellWidth: 70 },
      3: { halign: 'right', cellWidth: 85 },
      4: { halign: 'right', cellWidth: 83 },
    },
    didParseCell: (d) => {
      if (d.section === 'body' && d.row.index === 1) {
        d.cell.styles.fillColor = [240, 240, 240];
        d.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  tableY = (doc as any).lastAutoTable.finalY + 25;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DETAILS', margin, tableY);

  const bsb = String(input.employee?.bank_bsb || '(083-214)');
  const account = String(input.employee?.bank_account_number || '*****5141');
  const reference = String(input.paymentReference || 'Salary');

  const paymentBody = [[
    `${bsb} ${maskAccount(account)}`,
    employeeName,
    reference,
    formatMoney(net),
  ]];

  autoTable(doc, {
    startY: tableY + 5,
    head: [['ACCOUNT', 'NAME', 'REFERENCE', 'AMOUNT']],
    body: paymentBody,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 190 },
      2: { cellWidth: 110 },
      3: { cellWidth: 93, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  const bytes = doc.output('arraybuffer');
  return Buffer.from(bytes);
};

