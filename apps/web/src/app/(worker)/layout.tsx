"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RequireRole } from "@/components/RequireRole";
import { Brand } from "@/components/ui";

function Tab({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
        active ? "text-accent-fg" : "text-muted hover:text-fg"
      }`}
    >
      <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden />
      {label}
    </Link>
  );
}

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("worker");
  return (
    <RequireRole role="WORKER">
      <div className="flex min-h-screen flex-col bg-bg">
        <header className="dom-frost sticky top-0 z-40 border-b border-border">
          <div className="flex items-center px-4 py-3">
            <Brand size={22} />
          </div>
        </header>
        <div className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <nav className="dom-frost fixed inset-x-0 bottom-0 z-40 flex border-t border-border pb-[env(safe-area-inset-bottom)]">
          <Tab href="/my-day" label={t("myDay")} icon={Sun} />
          <Tab href="/my-week" label={t("myWeek")} icon={CalendarDays} />
        </nav>
      </div>
    </RequireRole>
  );
}
