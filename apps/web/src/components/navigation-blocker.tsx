"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { UnsavedChangesDialog } from "@/components/ui";

interface NavigationBlockerValue {
  isBlocked: boolean;
  setBlocked: (blocked: boolean) => void;
  /**
   * Run `proceed` when navigation is allowed. If the form is dirty, the
   * navigation is deferred and a confirmation dialog is shown instead; it
   * runs on "Leave" and is discarded on "Stay".
   */
  guard: (proceed: () => void) => void;
}

const NavigationBlockerContext = createContext<NavigationBlockerValue>({
  isBlocked: false,
  setBlocked: () => {},
  guard: (proceed) => proceed(),
});

export function NavigationBlockerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isBlocked, setBlocked] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);

  const guard = useCallback(
    (proceed: () => void) => {
      if (!isBlocked) {
        proceed();
        return;
      }
      // Defer the navigation until the user confirms in the dialog.
      setPending(() => proceed);
    },
    [isBlocked],
  );

  // Native guard for hard navigations (refresh, tab close, external links),
  // which `onNavigate` cannot intercept.
  useEffect(() => {
    if (!isBlocked) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isBlocked]);

  return (
    <NavigationBlockerContext.Provider value={{ isBlocked, setBlocked, guard }}>
      {children}
      <UnsavedChangesDialog
        open={pending !== null}
        onStay={() => setPending(null)}
        onLeave={() => {
          setBlocked(false);
          pending?.();
          setPending(null);
        }}
      />
    </NavigationBlockerContext.Provider>
  );
}

export function useNavigationBlocker() {
  return useContext(NavigationBlockerContext);
}

/**
 * Block navigation away from the current page while `dirty` is true. Resets on
 * unmount so a dirty form never leaks its guard onto the next page.
 */
export function useBlockNavigation(dirty: boolean) {
  const { setBlocked } = useNavigationBlocker();
  useEffect(() => {
    setBlocked(dirty);
    return () => setBlocked(false);
  }, [dirty, setBlocked]);
}
