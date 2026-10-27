'use client';

import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';

/**
 * Bounded, cached user-identity resolver — GET /admin/users/:id per row,
 * deduped/cached by react-query (staleTime keeps it from refetching on every
 * render/remount). Intended for a page-sized list (e.g. 20 rows), not an
 * unbounded fan-out across every user in the system — see payments/page.tsx
 * for the anti-pattern this avoids repeating.
 */
export function useUserIdentity(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-identity', userId],
    queryFn: () => adminService.getUserIdentity(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}
