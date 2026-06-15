import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The worker UI is copied from apps/web unchanged, so it still imports
// `next/link` and `next/navigation`. We alias those to thin react-router-backed
// shims so the components compile and run in a plain SPA / Capacitor WebView.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "next/link": path.resolve(__dirname, "src/shims/next-link.tsx"),
      "next/navigation": path.resolve(__dirname, "src/shims/next-navigation.ts"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  // @domar/shared is a workspace package compiled to CommonJS. Rollup can't
  // statically resolve named exports through its `__exportStar` re-exports, so
  // run it through the commonjs interop (and pre-bundle it in dev).
  optimizeDeps: {
    include: ["@domar/shared"],
  },
  build: {
    commonjsOptions: {
      include: [/packages\/shared/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
});
