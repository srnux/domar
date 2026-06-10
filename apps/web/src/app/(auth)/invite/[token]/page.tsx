"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api-client";
import { Button, Card, Field, Input, PageSpinner } from "@/components/ui";
import { BrandMark } from "@/components/ui";

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
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <PageSpinner />
      </main>
    );
  }
  if (invite.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6">
        <p className="text-muted">{t("invalid")}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandMark size={44} />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Domar</h1>
            <p className="mt-1 text-sm text-muted">
              {t("welcome", { email: invite.data.email })}
            </p>
          </div>
        </div>

        <Card className="p-6 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              accept.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <Field label={t("name")}>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </Field>

            <Field label={t("password")}>
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>

            {accept.isError && (
              <p role="alert" className="text-sm text-st-declined">
                {accept.error.message}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              className="mt-1"
              disabled={accept.isPending}
              loading={accept.isPending}
            >
              {t("createAccount")}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
