'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import currencyDisplayService, { type CurrencyDisplayUpdateRequest } from '@/services/currency-display.service';

const QUERY_KEY = ['currency-display'] as const;

/** Single shared query for currency display metadata — do not fetch this
 * separately inside every card/table; components should consume this hook
 * (or the <GameCurrencyDisplay> component, which already does). */
export function useCurrencyDisplay() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => currencyDisplayService.get(),
    staleTime: 60_000,
  });
}

export function useUpdateCurrencyDisplay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CurrencyDisplayUpdateRequest) => currencyDisplayService.update(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEY, updated);
    },
  });
}
