'use client';

import { useParams } from 'next/navigation';
import { RoleDetails } from '@/shared/components/roles/RoleDetails';

export default function RoleDetailPage() {
  const params = useParams();
  const roleCode = String(params.code);

  return <RoleDetails roleCode={roleCode} />;
}