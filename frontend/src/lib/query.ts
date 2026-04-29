import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
    },
  },
});

export const queryKeys = {
  me: ['me'] as const,
  users: ['users'] as const,
  printers: (params?: Record<string, unknown>) =>
    ['printers', params ?? {}] as const,
  printer: (id: number) => ['printer', id] as const,
  logs: (params?: Record<string, unknown>) => ['logs', params ?? {}] as const,
  dailyStats: (params?: Record<string, unknown>) =>
    ['daily-stats', params ?? {}] as const,
  consumables: (params?: Record<string, unknown>) =>
    ['consumables', params ?? {}] as const,
  sre: ['sre-signals'] as const,
};
