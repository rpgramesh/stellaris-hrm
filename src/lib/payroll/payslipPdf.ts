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

  const paidByLines = [
    input.branding.companyName,
    ...input.branding.companyAddressLines,
    input.branding.abn ? `ABN ${input.branding.abn}` : null,
  ].filter(Boolean) as string[];

  if (input.branding.logoDataUrl) {
    try {
      doc.addImage(input.branding.logoDataUrl, 'PNG', margin, 28, 140, 44);
    } catch {
      doc.setFontSize(22);
      doc.text(input.branding.companyName, margin, 60);
    }
  } else {
    doc.setFontSize(22);
    doc.text(input.branding.companyName, margin, 60);
  }

  doc.setDrawColor(230);
  doc.setFillColor(245, 245, 245);
  doc.rect(pageWidth - margin - 210, 28, 210, 96, 'F');
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text('PAID BY', pageWidth - margin - 198, 46);
  doc.setFontSize(9);
  let y = 62;
  for (const line of paidByLines) {
    doc.text(line, pageWidth - margin - 198, y);
    y += 12;
  }

  doc.setFillColor(245, 245, 245);
  doc.rect(pageWidth - margin - 210, 134, 210, 56, 'F');
  doc.setFontSize(10);
  doc.text('EMPLOYMENT DETAILS', pageWidth - margin - 198, 152);
  doc.setFontSize(9);
  const payFrequency = String(input.payslip?.pay_frequency || input.payslip?.payFrequency || '').trim() || '—';
  doc.text(`Pay Frequency: ${payFrequency}`, pageWidth - margin - 198, 168);

  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(employeeName, margin, 134);
  doc.setFontSize(10);
  if (employeeAddress.length > 0) {
    let ay = 150;
    for (const line of employeeAddress) {
      doc.text(line, margin, ay);
      ay += 12;
    }
  }

  const { grossPay, taxWithheld, netPay, superannuation } = getPayslipAmounts(input.payslip);
  const gross = money(grossPay);
  const tax = money(taxWithheld);
  const net = money(netPay);
  const sup = money(superannuation);

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, 204, pageWidth - margin * 2, 26, 'F');
  doc.setFontSize(9);
  doc.setTextColor(40);
  doc.text(`Pay Period: ${periodStr}`, margin + 8, 222);
  doc.text(`Payment Date: ${paymentStr}`, margin + 210, 222);
  doc.text(`Total Earnings: ${formatMoney(gross)}`, pageWidth - margin - 230, 222);
  doc.setFontSize(10);
  doc.setTextColor(10);
  doc.text(`Net Pay: ${formatMoney(net)}`, pageWidth - margin - 110, 222);

  const ytd = input.ytd || { gross: 0, tax: 0, net: 0, super: 0 };
  const ytdGross = money(ytd.gross);
  const ytdTax = money(ytd.tax);
  const ytdNet = money(ytd.net);
  const ytdSuper = money(ytd.super);

  const components = input.payComponents || [];
  const earningsThisPay = components.filter((c) => ['BaseSalary', 'Overtime', 'Allowance', 'Bonus', 'Commission', 'LeaveLoading'].includes(String(c.component_type || c.componentType)));
  const taxRows = [
    { label: 'PAYG', thisPay: tax, ytd: ytdTax },
  ];
  const superFundName = input.employee?.super_fund_name || input.employee?.superannuation_fund_name;
  const superMemberNumber = input.employee?.super_member_number || input.employee?.superannuation_member_number;
  const superRows = [
    { label: superFundName ? `SGC - ${superFundName} - ${superMemberNumber || ''}`.trim() : 'SGC', thisPay: sup, ytd: ytdSuper },
  ];

  let tableY = 256;
  doc.setFontSize(9);
  doc.setTextColor(40);
  doc.text('THIS PAY', pageWidth - margin - 170, tableY - 8);
  doc.text('YTD', pageWidth - margin - 60, tableY - 8);

  const shouldShowSingleLineYtd = earningsThisPay.length === 1;
  const salaryBody = earningsThisPay.map((c) => {
    const desc = String(c.description || 'Earning');
    const units = Number(c.units || 0);
    const rate = Number(c.rate || 0);
    const amount = money(c.amount);
    return [
      desc,
      units ? units.toFixed(4) : '',
      rate ? formatMoney(rate) : '',
      formatMoney(amount),
      shouldShowSingleLineYtd ? formatMoney(ytdGross) : '',
    ];
  });

  autoTable(doc, {
    startY: tableY,
    head: [['SALARY & WAGES', 'UNITS', 'RATE', 'THIS PAY', 'YTD']],
    body: [
      ...salaryBody,
      ['TOTAL', '', '', formatMoney(gross), formatMoney(ytdGross)],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { textColor: [0, 0, 0], fillColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 220 },
      1: { halign: 'right', cellWidth: 60 },
      2: { halign: 'right', cellWidth: 70 },
      3: { halign: 'right', cellWidth: 90 },
      4: { halign: 'right', cellWidth: 83 },
    },
    didParseCell: (d) => {
      if (d.section === 'body' && d.row.index === salaryBody.length) {
        d.cell.styles.fillColor = [240, 240, 240];
        d.cell.styles.fontStyle = 'bold';
      }
      if (d.section === 'head') {
        d.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  tableY = (doc as any).lastAutoTable.finalY + 14;

  autoTable(doc, {
    startY: tableY,
    head: [['TAX', '', '', 'THIS PAY', 'YTD']],
    body: [
      ...taxRows.map((r) => [r.label, '', '', formatMoney(r.thisPay), formatMoney(r.ytd)]),
      ['TOTAL', '', '', formatMoney(tax), formatMoney(ytdTax)],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { textColor: [0, 0, 0], fillColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 220 },
      1: { cellWidth: 60 },
      2: { cellWidth: 70 },
      3: { halign: 'right', cellWidth: 90 },
      4: { halign: 'right', cellWidth: 83 },
    },
    didParseCell: (d) => {
      if (d.section === 'body' && d.row.index === taxRows.length) {
        d.cell.styles.fillColor = [240, 240, 240];
        d.cell.styles.fontStyle = 'bold';
      }
      if (d.section === 'head') {
        d.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  tableY = (doc as any).lastAutoTable.finalY + 14;

  autoTable(doc, {
    startY: tableY,
    head: [['SUPERANNUATION', '', '', 'THIS PAY', 'YTD']],
    body: [
      ...superRows.map((r) => [r.label, '', '', formatMoney(r.thisPay), formatMoney(r.ytd)]),
      ['TOTAL', '', '', formatMoney(sup), formatMoney(ytdSuper)],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { textColor: [0, 0, 0], fillColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 220 },
      1: { cellWidth: 60 },
      2: { cellWidth: 70 },
      3: { halign: 'right', cellWidth: 90 },
      4: { halign: 'right', cellWidth: 83 },
    },
    didParseCell: (d) => {
      if (d.section === 'body' && d.row.index === superRows.length) {
        d.cell.styles.fillColor = [240, 240, 240];
        d.cell.styles.fontStyle = 'bold';
      }
      if (d.section === 'head') {
        d.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  tableY = (doc as any).lastAutoTable.finalY + 18;

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text('PAYMENT DETAILS', margin, tableY);

  const bank = String(input.employee?.bank_bsb || input.employee?.bank_bsb_number || input.employee?.bank_bsb_code || input.employee?.bank_bsb || '');
  const account = String(input.employee?.bank_account_number || input.employee?.bank_account || '');
  const reference = String(input.paymentReference || input.payslip?.payment_reference || input.payslip?.payslip_number || '').trim();

  const paymentBody = [[
    bank ? `${bank} ${maskAccount(account)}` : maskAccount(account),
    employeeName,
    reference || 'Salary',
    formatMoney(net),
  ]];

  autoTable(doc, {
    startY: tableY + 8,
    head: [['ACCOUNT', 'NAME', 'REFERENCE', 'AMOUNT']],
    body: paymentBody,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 190 },
      2: { cellWidth: 110 },
      3: { cellWidth: 93, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  const bottomY = doc.internal.pageSize.getHeight() - 28;
  doc.setFontSize(8);
  doc.setTextColor(110);
  const signatureText = input.digitalSignatureText || `Digitally signed • ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
  doc.text(signatureText, margin, bottomY);
  if (employeeCode) doc.text(`Employee ID: ${employeeCode}`, pageWidth - margin - 140, bottomY);

  const bytes = doc.output('arraybuffer');
  return Buffer.from(bytes);
};
