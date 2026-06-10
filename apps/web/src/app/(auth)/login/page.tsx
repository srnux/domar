"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ROLE_HOME, useLogin } from "@/lib/auth";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: (user) => router.replace(ROLE_HOME[user.role]) },
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <div className="mb-2 text-center">
          <h1 className="text-3xl font-bold">Domar</h1>
          <p className="text-sm text-neutral-500">{t("subtitle")}</p>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("email")}
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-neutral-800"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("password")}
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-neutral-800"
          />
        </label>

        {login.isError && (
          <p role="alert" className="text-sm text-red-600">
            {login.error.status === 401
              ? t("invalidCredentials")
              : login.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="mt-2 rounded-lg bg-neutral-900 py-3 font-semibold text-white disabled:opacity-50"
        >
          {login.isPending ? t("signingIn") : t("signIn")}
        </button>
      </form>
    </main>
  );
}
