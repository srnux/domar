"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLogin, useLogout } from "@/lib/auth";
import { Button, Card, Field, Input } from "@/components/ui";
import { BrandMark } from "@/components/ui";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const login = useLogin();
  const logout = useLogout();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleError, setRoleError] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRoleError(false);
    login.mutate(
      { email, password },
      {
        onSuccess: (user) => {
          // Worker-only app: sign non-workers back out instead of stranding
          // them on routes that don't exist here (which renders a blank screen).
          if (user.role !== "WORKER") {
            setRoleError(true);
            logout.mutate();
            return;
          }
          router.replace("/my-day");
        },
      },
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

            {roleError && (
              <p role="alert" className="text-sm text-st-declined">
                {t("workerOnly")}
              </p>
            )}

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
