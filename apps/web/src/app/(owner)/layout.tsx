"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, LogOut, ReceiptText, type LucideIcon } from "lucide-react";
import { RequireRole } from "@/components/RequireRole";
import { UserMenu } from "@/components/UserMenu";
import { useLogout } from "@/lib/auth";
import { Brand } from "@/components/ui";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("owner");
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();

  const nav: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/properties", label: t("myProperties"), icon: Home },
    { href: "/bills", label: t("bills"), icon: ReceiptText },
  ];
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <RequireRole role="OWNER">
      <div className="min-h-screen bg-bg">
        <header className="dom-frost sticky top-0 z-40 border-b border-border">
          <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
            <Link href="/properties" className="shrink-0">
              <Brand size={22} />
            </Link>
            <nav className="ml-auto flex items-center gap-1">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                    isActive(href)
                      ? "bg-accent-soft text-accent-fg"
                      : "text-muted hover:bg-surface-2 hover:text-fg"
                  }`}
                >
                  <Icon size={15} aria-hidden />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  logout.mutate(undefined, {
                    onSettled: () => router.replace("/login"),
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
              >
                <LogOut size={15} aria-hidden />
                {t("signOut")}
              </button>
              <UserMenu />
            </div>
          </div>
        </header>
        {children}
      </div>
    </RequireRole>
  );
}
