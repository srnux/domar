"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api-client";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const t = useTranslations("invite");
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const invite = useQuery<{ email: string; role: string }, ApiError>({
    queryKey: ["invite", token],
    queryFn: () => api(`/api/invites/${token}`),
    retry: false,
  });

  const accept = useMutation<{ ok: true }, ApiError>({
    mutationFn: () =>
      api(`/api/invites/${token}/accept`, {
        method: "POST",
        body: JSON.stringify({ name, password }),
      }),
    onSuccess: () => router.replace("/login"),
  });

  if (invite.isPending) {
    return <main className="p-6 text-neutral-400">…</main>;
  }
  if (invite.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-neutral-500">{t("invalid")}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          accept.mutate();
        }}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <div className="mb-2 text-center">
          <h1 className="text-3xl font-bold">Domar</h1>
          <p className="text-sm text-neutral-500">
            {t("welcome", { email: invite.data.email })}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("name")}
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-neutral-800"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("password")}
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-neutral-800"
          />
        </label>

        {accept.isError && (
          <p role="alert" className="text-sm text-red-600">
            {accept.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={accept.isPending}
          className="mt-2 rounded-lg bg-neutral-900 py-3 font-semibold text-white disabled:opacity-50"
        >
          {t("createAccount")}
        </button>
      </form>
    </main>
  );
}
