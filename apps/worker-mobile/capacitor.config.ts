import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.github.srnux.domar.worker",
  appName: "Domar Worker",
  // Vite build output is bundled into the native app (offline-capable); only
  // the REST API is remote. Never point this at a remote URL — App Store
  // Guideline 4.2 rejects thin webview wrappers.
  webDir: "dist",
  server: {
    // Serve the WebView from http://localhost so http (dev) API calls aren't
    // blocked as mixed content. localhost is still a secure context in
    // Chromium, and http pages may call https APIs, so this holds for prod too.
    androidScheme: "http",
  },
};

export default config;
