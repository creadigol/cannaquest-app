import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // Persisted queries need an explicit cache lifetime — this caps how
      // long a persisted entry is kept on disk before being dropped.
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Only query keys whose first segment is in this list get written to disk.
 * Deliberately an allowlist, not a blocklist: anything added later
 * (payments, documents, signatures) is excluded by default unless someone
 * consciously adds its top-level key here.
 */
const PERSISTABLE_QUERY_KEY_PREFIXES = ['dashboard', 'scripts', 'products', 'consults', 'profile'];

export function isPersistableQuery(queryKey: readonly unknown[]) {
  const [firstSegment] = queryKey;
  return typeof firstSegment === 'string' && PERSISTABLE_QUERY_KEY_PREFIXES.includes(firstSegment);
}