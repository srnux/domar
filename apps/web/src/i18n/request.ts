import { getRequestConfig } from "next-intl/server";

// No locale routing in v1 — English only, but every string goes through
// translation keys so HR/DE can be added without touching components.
export default getRequestConfig(async () => ({
  locale: "en",
  messages: (await import("../../messages/en.json")).default,
}));
