'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';

export function usePermissionResolver() {
  const { isAuthenticated } = useAuthStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || initializedRef.current) {
      return;
    }
    initializedRef.current = true;
  }, [isAuthenticated]);

  return {
    hasStoredPermissions: true,
  };
}

export default usePermissionResolver;