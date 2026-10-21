import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { PropsWithChildren } from 'react';
import { AuthProvider, useAuth } from '@/features/auth/auth.context';
import { queryClient } from '@/lib/query-client';
import { cacheBusterFor, queryPersister } from '@/lib/query-persister';

import { CartProvider } from '@/features/cart/context/CartContext';

function PersistedQueryProvider({ children }: PropsWithChildren) {
  const { state } = useAuth();
  const userKey = state.user?.id ?? state.user?.email ?? null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        buster: cacheBusterFor(userKey),
        maxAge: 24 * 60 * 60 * 1000, // 24 hours — matches queryClient's gcTime
      }}
    >
      <CartProvider>{children}</CartProvider>
    </PersistQueryClientProvider>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <PersistedQueryProvider>{children}</PersistedQueryProvider>
    </AuthProvider>
  );
}