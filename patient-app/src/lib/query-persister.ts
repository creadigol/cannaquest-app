import { NativeModules, TurboModuleRegistry } from 'react-native';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { isPersistableQuery } from './query-client';

const STORAGE_KEY = 'patient_portal.query_cache';

// Check if AsyncStorage native module is linked before importing/using it.
// This prevents crashes in dev-client APKs that were built without the native module.
function isAsyncStorageAvailable(): boolean {
  try {
    const hasTurbo = TurboModuleRegistry
      ? Boolean(
          TurboModuleRegistry.get('PlatformLocalStorage') ||
            TurboModuleRegistry.get('RNC_AsyncSQLiteDBStorage') ||
            TurboModuleRegistry.get('RNCAsyncStorage')
        )
      : false;
    const hasNative = Boolean(
      NativeModules?.['PlatformLocalStorage'] ||
        NativeModules?.['RNC_AsyncSQLiteDBStorage'] ||
        NativeModules?.['RNCAsyncStorage']
    );
    return hasTurbo || hasNative;
  } catch {
    return false;
  }
}

function getBasePersister(): Persister | null {
  if (!isAsyncStorageAvailable()) {
    if (__DEV__) {
      console.warn(
        '[query-persister] AsyncStorage native module is not linked in this build. Query persistence is disabled (in-memory only).'
      );
    }
    return null;
  }

  try {
    // Dynamic require so the module is not evaluated if the native bridge is absent
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return createAsyncStoragePersister({
      storage: AsyncStorage,
      key: STORAGE_KEY,
    });
  } catch (err) {
    if (__DEV__) {
      console.warn('[query-persister] Failed to initialize AsyncStorage persister:', err);
    }
    return null;
  }
}

const basePersister = getBasePersister();

/**
 * Wraps the base persister so only allowlisted queries (see
 * isPersistableQuery) are ever written to disk — anything sensitive added
 * to the app later stays in-memory-only unless explicitly opted in.
 *
 * If AsyncStorage is not compiled into the current binary, this gracefully
 * acts as a no-op persister without crashing the app.
 */
export const queryPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    if (!basePersister) return;
    const filteredClient: PersistedClient = {
      ...client,
      clientState: {
        ...client.clientState,
        queries: client.clientState.queries.filter((query) => isPersistableQuery(query.queryKey)),
      },
    };
    await basePersister.persistClient(filteredClient);
  },
  restoreClient: async () => {
    if (!basePersister) return undefined;
    return basePersister.restoreClient();
  },
  removeClient: async () => {
    if (!basePersister) return;
    await basePersister.removeClient();
  },
};

/**
 * A cache buster scoped to the signed-in patient, so switching accounts on
 * the same device never shows the previous patient's cached data. Pass the
 * current user's id/email; pass null when signed out to use a neutral key.
 */
export function cacheBusterFor(userKey: string | null) {
  return userKey ? `patient:${userKey}` : 'patient:anonymous';
}