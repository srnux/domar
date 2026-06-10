"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { RequireRole } from "@/components/RequireRole";

function Tab({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`flex-1 py-3 text-center text-sm font-medium ${
        active ? "text-neutral-900" : "text-neutral-400"
      }`}
    >
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
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <div className="flex-1 pb-16">{children}</div>
        <nav className="fixed inset-x-0 bottom-0 flex border-t border-neutral-200 bg-white">
          <Tab href="/my-day" label={t("myDay")} />
          <Tab href="/my-week" label={t("myWeek")} />
        </nav>
      </div>
    </RequireRole>
  );
}
