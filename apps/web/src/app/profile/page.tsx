"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { ROLE_HOME, useMe } from "@/lib/auth";
import { useUpdateAvatar } from "@/lib/users";
import {
  Brand,
  Button,
  Callout,
  Card,
  PageSpinner,
  UserAvatar,
} from "@/components/ui";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const router = useRouter();
  const { data: me, isPending, isError } = useMe();
  const updateAvatar = useUpdateAvatar();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isError) router.replace("/login");
  }, [isError, router]);

  if (isPending || isError || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <PageSpinner />
      </div>
    );
  }

  const home = ROLE_HOME[me.role];

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) updateAvatar.mutate(file);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="dom-frost sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href={home}>
            <Brand size={22} />
          </Link>
          <Link
            href={home}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
          >
            <ArrowLeft size={15} aria-hidden />
            {t("back")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        <h1 className="mb-4 text-xl font-semibold text-fg">{t("title")}</h1>

        <Card className="flex flex-col items-center gap-4 p-6">
          <UserAvatar user={me} size={96} />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={updateAvatar.isPending}
            loading={updateAvatar.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <ImageIcon size={16} aria-hidden />
            {me.avatarFilename ? t("changePhoto") : t("addPhoto")}
          </Button>
          <p className="text-xs text-muted">{t("photoHint")}</p>

          {updateAvatar.isError && (
            <Callout variant="declined">{updateAvatar.error.message}</Callout>
          )}
        </Card>

        <Card className="mt-4 divide-y divide-border">
          <Row label={t("name")} value={me.name} />
          <Row label={t("email")} value={me.email} />
          <Row label={t("role")} value={t(me.role)} />
        </Card>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="truncate text-sm font-medium text-fg">{value}</span>
    </div>
  );
}
