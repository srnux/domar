# @domar/worker-mobile

The worker-facing mobile app (Android; no iOS project is committed yet) built with **Vite + React + react-router**, wrapped by **Capacitor**. It reuses the web worker UI (`apps/web/src/components` + `apps/web/src/lib`, copied here) and talks to the same NestJS REST API.

## How the reuse works

- `components/` and `lib/` are copied from `apps/web` largely unchanged.
- The only Next.js-specific imports in those files are `next/link` and `next/navigation`; Vite aliases both to react-router-backed shims in `src/shims/`. `next-intl` is kept and fed client-side via `NextIntlClientProvider` in `src/main.tsx`.
- `src/lib/api-client.ts` is the one file that diverges from web: it uses an **absolute API base URL** + **Bearer-token auth** (the WebView has no shared cookie jar) instead of relative paths + cookies. Tokens live in `src/lib/token-store.ts`.
- Routing glue (`App.tsx`, `WorkerLayout.tsx`, `pages/`) is mobile-specific.

> Phase 1 will extract `components/`/`lib/` into a shared `packages/worker-ui` so web and mobile import the same files instead of a copy.

## Develop in a browser

```bash
pnpm --filter @domar/worker-mobile dev   # http://localhost:5173
```

The dev server's origin (`http://localhost:5173`) is **not** in the API's default CORS allow-list. Start the API with it allowed:

```bash
CORS_ORIGINS=http://localhost:5173 pnpm --filter @domar/api start:dev
```

Set the API base in `.env` (see `.env.example`). Default is `http://localhost:3001`.

Seed worker login: `marko@domar.test` / `Domar123!`.

## Run on the Android emulator (verified)

Prerequisites (Linux): Android SDK (`platform-tools`, `emulator`, `platforms;android-35`, `system-images;android-35;google_apis;x86_64`), an AVD, KVM, and a **full JDK 21** with `javac` (a JRE is not enough). Point `JAVA_HOME` at it, as below; the paths are examples.

```bash
# build the web bundle with the emulator's API base (host = 10.0.2.2)
echo "VITE_API_BASE=http://10.0.2.2:3001" > apps/worker-mobile/.env
pnpm --filter @domar/worker-mobile build

cd apps/worker-mobile
npx cap add android        # one-time (already done; android/ is in the tree)
npx cap sync android

export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="$HOME/jdks/jdk-21.0.11+10"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

emulator -avd domar_pixel -gpu host &      # boot the emulator
adb wait-for-device
cd android && ./gradlew assembleDebug      # build the APK
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p io.github.srnux.domar.worker -c android.intent.category.LAUNCHER 1
```

### Native config applied for local dev

- **`capacitor.config.ts`** sets `server.androidScheme: "http"` so the WebView origin is `http://localhost` — same scheme as the dev API, avoiding mixed-content blocking (the default `https://localhost` blocks `http://10.0.2.2` calls). `http://localhost` is still a secure context in Chromium, and http pages may call https APIs, so this is fine for prod too.
- **`android/app/src/main/res/xml/network_security_config.xml`** + the `networkSecurityConfig` attribute in `AndroidManifest.xml` permit cleartext to `10.0.2.2` / `localhost` (dev only; prod is HTTPS).
- `http://localhost` is already in the API CORS allow-list. For browser dev at `:5173`, start the API with `CORS_ORIGINS=http://localhost:5173`.

> **iOS** isn't set up yet: there's no `ios/` project and `@capacitor/ios` isn't a dependency. Adding it needs macOS + Xcode (`pnpm add @capacitor/ios`, `npx cap add ios`).

For a production build, set `VITE_API_BASE` to your instance's public URL (e.g. `https://domar.example.com`); requests go through the web app's `/api` proxy, so no extra port or CORS setting is needed.

## What works today

- **Auth**: Bearer login; refresh token in device secure storage (Keychain / EncryptedSharedPreferences); single-flight rotation.
- **Worker features**: My Day, My Week, Bids, and the full job-detail workflow (accept/decline/start/finish, checklist, comments, time tracking).
- **Photos**: `AuthImage` loads API photos with the Bearer header (object URLs); `PhotoCapture` uses the native `@capacitor/camera` on device (JPEG output handles iPhone HEIC) and file inputs on web.
- **Offline** (`@capacitor/network` + React Query persistence in Preferences + a durable outbox):
  - Reads — My Day / My Week / job detail open from cached data with no connectivity.
  - Writes — accept/decline/start/finish, checklist toggles, comments, and photo uploads are optimistically applied and queued, then replayed FIFO on reconnect (verified: a job accepted offline synced to the server on reconnect).
- **Push**: device registration (`POST /api/devices`), tap-to-deep-link, and a server-side notification when someone else comments on the worker's job (the only event that notifies today). **Gated off by default** (see below).

## Enabling push

Push needs a Firebase project (it crashes the native plugin otherwise), so it's opt-in:

1. **Android**: add `google-services.json` to `android/app/`, apply the `com.google.gms.google-services` Gradle plugin.
2. **iOS** (once an iOS project exists): add `GoogleService-Info.plist` + an APNs auth key in the Firebase console.
3. **API**: set `FIREBASE_SERVICE_ACCOUNT` (the service-account JSON) so `NotificationsService` sends instead of logging.
4. **Client**: set `VITE_PUSH_ENABLED=true` and rebuild.

Until then the app runs normally and `NotificationsService` logs would-be sends.
