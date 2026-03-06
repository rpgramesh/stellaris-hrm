import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import AccessGuard from '@/components/AccessGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <AccessGuard>
            {children}
          </AccessGuard>
        </main>
      </div>
    </div>
  );
}
