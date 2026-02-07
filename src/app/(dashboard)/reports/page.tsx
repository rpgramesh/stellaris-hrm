export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Payroll Summary', desc: 'Monthly payroll breakdown by department', icon: '💰' },
          { title: 'Attendance Logs', desc: 'Daily clock-in/out records for all employees', icon: '⏱️' },
          { title: 'Leave Balance', desc: 'Remaining leave entitlements per employee', icon: '📅' },
          { title: 'Expense Reports', desc: 'Approved and pending expense claims', icon: '🧾' },
          { title: 'Employee Turnover', desc: 'Hiring and resignation statistics', icon: '👥' },
          { title: 'Tax Withholding', desc: 'PAYG withholding summary for ATO', icon: '🏛️' },
        ].map((report, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer border border-transparent hover:border-blue-500">
            <div className="text-4xl mb-4">{report.icon}</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{report.title}</h3>
            <p className="text-gray-500 mb-4">{report.desc}</p>
            <span className="text-blue-600 font-medium text-sm hover:underline">Generate Report →</span>
          </div>
        ))}
      </div>
    </div>
  );
}
