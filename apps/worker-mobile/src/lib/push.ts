import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { api } from "./api-client";

let started = false;

// Push requires a configured Firebase project (google-services.json on Android,
// APNs key on iOS). Without it, the native register() throws and crashes the
// app, so push is opt-in: enable by setting VITE_PUSH_ENABLED=true once the
// Firebase config is in place. See README "Enabling push".
const pushEnabled = import.meta.env.VITE_PUSH_ENABLED === "true";

/**
 * Registers for push (FCM/APNs), reports the device token to the API, and
 * deep-links to the relevant job when a notification is tapped. No-op on web,
 * when push isn't configured, and idempotent across re-mounts. Call once the
 * user is authenticated.
 */
export async function startPush(navigate: (path: string) => void): Promise<void> {
  if (started || !pushEnabled || !Capacitor.isNativePlatform()) return;
  started = true;

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") {
    started = false;
    return;
  }

  await PushNotifications.addListener("registration", (token) => {
    void api("/api/devices", {
      method: "POST",
      body: JSON.stringify({
        token: token.value,
        platform: Capacitor.getPlatform(),
      }),
    }).catch(() => {
      /* will re-register on next launch */
    });
  });

  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      const jobId = action.notification.data?.jobId;
      if (typeof jobId === "string") navigate(`/my-jobs/${jobId}`);
    },
  );

  await PushNotifications.register();
}
