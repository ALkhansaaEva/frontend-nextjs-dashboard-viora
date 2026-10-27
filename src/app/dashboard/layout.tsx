import type { ReactNode } from 'react';
import ClientLayout from './ClientLayout';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}