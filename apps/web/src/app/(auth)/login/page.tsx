"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ROLE_HOME, useLogin } from "@/lib/auth";
import { Button, Card, Field, Input } from "@/components/ui";
import { BrandMark } from "@/components/ui";

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
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandMark size={44} />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Domar</h1>
            <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
          </div>
        </div>

        <Card className="p-6 shadow-sm">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field label={t("email")}>
              <Input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label={t("password")}>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            {login.isError && (
              <p role="alert" className="text-sm text-st-declined">
                {login.error.status === 401
                  ? t("invalidCredentials")
                  : login.error.message}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              className="mt-1"
              disabled={login.isPending}
              loading={login.isPending}
            >
              {login.isPending ? t("signingIn") : t("signIn")}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
