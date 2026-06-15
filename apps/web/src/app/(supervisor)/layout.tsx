"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BadgeCheck,
  Briefcase,
  CalendarRange,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { RequireRole } from "@/components/RequireRole";
import { UserMenu } from "@/components/UserMenu";
import { useLogout } from "@/lib/auth";
import { useJobs } from "@/lib/jobs";
import { Brand } from "@/components/ui";

interface NavItem {
  href: string;
  key:
    | "dashboard"
    | "jobs"
    | "verifyQueue"
    | "bookings"
    | "bills"
    | "properties"
    | "team";
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/jobs", key: "jobs", icon: Briefcase },
  { href: "/verify", key: "verifyQueue", icon: BadgeCheck },
  { href: "/bookings", key: "bookings", icon: CalendarRange },
  { href: "/manage/bills", key: "bills", icon: ReceiptText },
  { href: "/manage/properties", key: "properties", icon: Home },
  { href: "/users", key: "team", icon: Users },
];

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("supervisor");
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: jobs } = useJobs();
  const toVerifyCount = (jobs ?? []).filter((j) => j.status === "DONE").length;

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  const renderIcon = (key: NavItem["key"], Icon: LucideIcon, size: number) => {
    const showDot = key === "verifyQueue" && toVerifyCount > 0;
    return (
      <span className="relative inline-flex">
        <Icon size={size} aria-hidden />
        {showDot && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-st-declined ring-1 ring-bg"
          />
        )}
      </span>
    );
  };

  const signOut = () =>
    logout.mutate(undefined, { onSettled: () => router.replace("/login") });

  return (
    <RequireRole role="SUPERVISOR">
      <div className="min-h-screen bg-bg">
        <header className="dom-frost sticky top-0 z-40 border-b border-border">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
            <Link href="/dashboard" className="shrink-0">
              <Brand size={22} />
            </Link>

            {/* Desktop nav */}
            <nav className="ml-auto hidden items-center gap-1 md:flex">
              {NAV.map(({ href, key, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  aria-label={
                    key === "verifyQueue" && toVerifyCount > 0
                      ? `${t(key)} (${toVerifyCount})`
                      : undefined
                  }
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                    isActive(href)
                      ? "bg-accent-soft text-accent-fg"
                      : "text-muted hover:bg-surface-2 hover:text-fg"
                  }`}
                >
                  {renderIcon(key, Icon, 15)}
                  {t(key)}
                </Link>
              ))}
              <button
                onClick={signOut}
                className="ml-1 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-subtle hover:bg-surface-2 hover:text-fg"
              >
                <LogOut size={15} aria-hidden />
                {t("signOut")}
              </button>
            </nav>

            {/* Mobile toggle */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label="Menu"
              className="ml-auto grid size-10 place-items-center rounded-md border border-border-strong bg-surface text-fg-soft md:hidden"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>

            <UserMenu />
          </div>

          {/* Mobile drawer */}
          {open && (
            <nav className="border-t border-border bg-surface px-3 py-2 md:hidden">
              {NAV.map(({ href, key, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(href) ? "page" : undefined}
                  aria-label={
                    key === "verifyQueue" && toVerifyCount > 0
                      ? `${t(key)} (${toVerifyCount})`
                      : undefined
                  }
                  className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium ${
                    isActive(href)
                      ? "bg-accent-soft text-accent-fg"
                      : "text-fg-soft hover:bg-surface-2"
                  }`}
                >
                  {renderIcon(key, Icon, 18)}
                  {t(key)}
                </Link>
              ))}
              <button
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-subtle hover:bg-surface-2"
              >
                <LogOut size={18} aria-hidden />
                {t("signOut")}
              </button>
            </nav>
          )}
        </header>
        {children}
      </div>
    </RequireRole>
  );
}
