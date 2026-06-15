import {
  useLocation,
  useNavigate,
  useParams as rrUseParams,
  useSearchParams as rrUseSearchParams,
} from "react-router";

/** Mirrors the subset of `next/navigation`'s useRouter that the UI uses. */
export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => void navigate(href),
    replace: (href: string) => void navigate(href, { replace: true }),
    back: () => void navigate(-1),
    forward: () => void navigate(1),
    refresh: () => {},
    prefetch: () => {},
  };
}

export function usePathname(): string {
  return useLocation().pathname;
}

export function useParams<T = Record<string, string>>(): T {
  return rrUseParams() as T;
}

export function useSearchParams(): URLSearchParams {
  return rrUseSearchParams()[0];
}
