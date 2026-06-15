import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { NextIntlClientProvider } from "next-intl";
import { HashRouter } from "react-router";
import { DISPLAY_TIMEZONE } from "@domar/shared";
import { App } from "./App";
import { setupOnlineManager } from "./lib/network";
import { flushOutbox } from "./lib/outbox";
import { queryPersister } from "./lib/persister";
import { tokenStore } from "./lib/token-store";
import messages from "./messages/en.json";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // Keep cached reads for a day so the app opens populated when offline.
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

// Connectivity drives React Query's online state; on reconnect, drain the
// offline write queue.
setupOnlineManager();
onlineManager.subscribe((online) => {
  if (online) void flushOutbox(queryClient);
});

// HashRouter avoids 404s on hard reload inside the Capacitor WebView, where
// there is no server to resolve deep paths.
function render() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone={DISPLAY_TIMEZONE}
      >
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            maxAge: 1000 * 60 * 60 * 24,
          }}
          onSuccess={() => {
            // Cache restored — drain anything queued before the last close.
            void flushOutbox(queryClient);
          }}
        >
          <HashRouter>
            <App />
          </HashRouter>
        </PersistQueryClientProvider>
      </NextIntlClientProvider>
    </StrictMode>,
  );
}

// Hydrate auth tokens from secure storage before the first authenticated
// request so a cold start stays logged in, then render.
void tokenStore.load().then(render);
