import { Network } from "@capacitor/network";
import { onlineManager } from "@tanstack/react-query";

/**
 * Drive React Query's online state from the device's real connectivity so it
 * pauses refetches offline and the outbox flushes on reconnect.
 */
export function setupOnlineManager(): void {
  onlineManager.setEventListener((setOnline) => {
    void Network.getStatus().then((status) => setOnline(status.connected));
    const handlePromise = Network.addListener("networkStatusChange", (status) =>
      setOnline(status.connected),
    );
    return () => {
      void handlePromise.then((handle) => handle.remove());
    };
  });
}
