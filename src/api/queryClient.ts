import { QueryClient } from '@tanstack/react-query';

/** Shared cache. It is cleared whenever the authenticated identity changes. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, refetchOnWindowFocus: true, staleTime: 60_000 },
  },
});
