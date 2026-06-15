import { Preferences } from "@capacitor/preferences";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

// React Query's cache is persisted to Capacitor Preferences so assigned jobs,
// job detail, and comments are readable on a cold start with no connectivity.
const storage = {
  getItem: (key: string) => Preferences.get({ key }).then((r) => r.value),
  setItem: (key: string, value: string) =>
    Preferences.set({ key, value }).then(() => undefined),
  removeItem: (key: string) => Preferences.remove({ key }).then(() => undefined),
};

export const queryPersister = createAsyncStoragePersister({
  storage,
  key: "domar.rq-cache",
  throttleTime: 1000,
});
