import EditEmployeeClient from '@/components/EditEmployeeClient';

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <EditEmployeeClient id={resolvedParams.id} />;
}
