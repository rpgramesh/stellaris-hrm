export default function IncidentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Incidents</h1>
        <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
          Report Incident
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-yellow-500">
          <h3 className="text-gray-900 font-bold text-lg mb-2">Open Cases</h3>
          <p className="text-3xl font-bold text-yellow-600">2</p>
          <p className="text-sm text-gray-500 mt-1">Requires attention</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-green-500">
          <h3 className="text-gray-900 font-bold text-lg mb-2">Resolved (This Month)</h3>
          <p className="text-3xl font-bold text-green-600">5</p>
          <p className="text-sm text-gray-500 mt-1">Safety protocols followed</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-blue-500">
          <h3 className="text-gray-900 font-bold text-lg mb-2">Total Reports (YTD)</h3>
          <p className="text-3xl font-bold text-blue-600">14</p>
          <p className="text-sm text-gray-500 mt-1">-12% from last year</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Reports</h3>
        </div>
        <div className="p-6 text-center text-gray-500">
          <p>No open critical incidents at this time.</p>
        </div>
      </div>
    </div>
  );
}
