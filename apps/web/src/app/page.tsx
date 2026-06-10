"use client";

import type { HealthStatus } from "@domar/shared";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export default function Home() {
  const t = useTranslations();
  const { data, isError, isPending } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">{t("common.appName")}</h1>
      <p className="text-neutral-500">{t("common.tagline")}</p>
      <p className="text-sm">
        {isError
          ? t("home.apiUnreachable")
          : t("home.apiStatus", {
              status: isPending ? "…" : (data?.status ?? "?"),
            })}
      </p>
    </main>
  );
}
