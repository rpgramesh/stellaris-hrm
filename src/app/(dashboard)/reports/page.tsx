import Link from 'next/link';

export default function ReportsPage() {
  const reports = [
    { 
      title: 'Payroll Summary', 
      desc: 'Monthly payroll breakdown by department', 
      icon: '💰',
      href: '/reports/payroll-analytics'
    },
    { 
      title: 'Attendance Logs', 
      desc: 'Daily clock-in/out records for all employees', 
      icon: '⏱️',
      href: '/attendance/time-clock-report'
    },
    { 
      title: 'Leave Balance', 
      desc: 'Remaining leave entitlements per employee', 
      icon: '📅',
      href: '/leave/entitlement-report'
    },
    { 
      title: 'Expense Reports', 
      desc: 'Approved and pending expense claims', 
      icon: '🧾',
      href: '/expenses/reports'
    },
    { 
      title: 'Employee Turnover', 
      desc: 'Hiring and resignation statistics', 
      icon: '👥',
      href: '/analytics/headcount'
    },
    { 
      title: 'Tax Withholding', 
      desc: 'PAYG withholding summary for ATO', 
      icon: '🏛️',
      href: '/reports/payroll-analytics'
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Link
            key={report.title}
            href={report.href}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-transparent hover:border-blue-500 flex flex-col"
          >
            <div className="text-4xl mb-4">{report.icon}</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{report.title}</h3>
            <p className="text-gray-500 mb-4 flex-1">{report.desc}</p>
            <span className="text-blue-600 font-medium text-sm hover:underline">
              View Report →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
