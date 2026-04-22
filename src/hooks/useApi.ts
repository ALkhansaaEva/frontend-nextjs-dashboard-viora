import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useFetch<T>(
  key: readonly string[],
  fetcher: () => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey: key,
    queryFn: fetcher,
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 60 * 1000,
  });
}

export function useMutate<TData, TVariables>(
  key: readonly string[],
  mutator: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: () => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: key,
    mutationFn: mutator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      options?.onSuccess?.();
    },
  });
}

export function usePrefetch<T>(
  key: readonly string[],
  fetcher: () => Promise<T>
) {
  const queryClient = useQueryClient();

  return queryClient.prefetchQuery({
    queryKey: key,
    queryFn: fetcher,
  });
}