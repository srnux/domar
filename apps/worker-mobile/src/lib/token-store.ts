import { Capacitor } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_KEY = "domar.accessToken";
const REFRESH_KEY = "domar.refreshToken";

const native = Capacitor.isNativePlatform();

// Tokens are cached in memory so the API client can read them synchronously.
// They are mirrored to the device Keychain / EncryptedSharedPreferences (native)
// or localStorage (browser dev) so a cold start stays logged in. `load()` must
// run once at boot before the first authenticated request.
let accessToken: string | null = null;
let refreshToken: string | null = null;

async function persist(key: string, value: string): Promise<void> {
  if (native) await SecureStoragePlugin.set({ key, value });
  else localStorage.setItem(key, value);
}

async function remove(key: string): Promise<void> {
  if (native) await SecureStoragePlugin.remove({ key }).catch(() => {});
  else localStorage.removeItem(key);
}

async function read(key: string): Promise<string | null> {
  if (native) {
    return SecureStoragePlugin.get({ key })
      .then((r) => r.value)
      .catch(() => null);
  }
  return localStorage.getItem(key);
}

export const tokenStore = {
  /** Hydrate the in-memory cache from secure storage. Call once at startup. */
  async load(): Promise<void> {
    [accessToken, refreshToken] = await Promise.all([
      read(ACCESS_KEY),
      read(REFRESH_KEY),
    ]);
  },
  getAccess(): string | null {
    return accessToken;
  },
  getRefresh(): string | null {
    return refreshToken;
  },
  async set(tokens: AuthTokens): Promise<void> {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    await Promise.all([
      persist(ACCESS_KEY, tokens.accessToken),
      persist(REFRESH_KEY, tokens.refreshToken),
    ]);
  },
  async clear(): Promise<void> {
    accessToken = null;
    refreshToken = null;
    await Promise.all([remove(ACCESS_KEY), remove(REFRESH_KEY)]);
  },
};
