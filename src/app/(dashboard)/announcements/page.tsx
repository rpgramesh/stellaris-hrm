export default function AnnouncementsPage() {
  const announcements = [
    { id: 1, title: 'Annual Company Retreat', date: '2023-10-25', content: 'We are excited to announce our annual retreat will be held in Gold Coast this year...', author: 'HR Team' },
    { id: 2, title: 'New Health Benefits Policy', date: '2023-10-20', content: 'Please review the updated health benefits package effective from Nov 1st...', author: 'Management' },
    { id: 3, title: 'Office Maintenance Scheduled', date: '2023-10-15', content: 'The main server room will undergo maintenance this Saturday...', author: 'IT Dept' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Post Announcement
        </button>
      </div>

      <div className="space-y-4">
        {announcements.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
              <span className="text-sm text-gray-500">{item.date}</span>
            </div>
            <p className="text-gray-600 mb-4">{item.content}</p>
            <div className="flex items-center text-sm text-blue-600 font-medium">
              <span>By {item.author}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
