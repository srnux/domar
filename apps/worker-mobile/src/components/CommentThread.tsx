"use client";

import { useState } from "react";
import type { CommentVisibility } from "@domar/shared";
import { useTranslations } from "next-intl";
import { Eye, Lock, MessageSquare } from "lucide-react";
import { useComments, usePostComment } from "@/lib/comments";
import { Button, Card, Textarea } from "@/components/ui";

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Zagreb",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Comment thread for a job. `canChooseVisibility` is for supervisor/worker;
 * owners always post SHARED (the server forces it regardless).
 *
 * Internal vs shared MUST stay visually unmistakable — confusing them is a
 * privacy incident, not a style bug. Internal: dashed border, muted surface,
 * a Lock "Internal" tag. Shared (owner-visible): blue tint + Eye tag.
 */
export function CommentThread({
  jobId,
  canChooseVisibility,
}: {
  jobId: string;
  canChooseVisibility: boolean;
}) {
  const t = useTranslations("comments");
  const { data: comments, isPending } = useComments(jobId);
  const post = usePostComment(jobId);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<CommentVisibility>("INTERNAL");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post.mutate(
      { body, visibility: canChooseVisibility ? visibility : "SHARED" },
      { onSuccess: () => setBody("") },
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="flex items-center gap-2 font-semibold text-fg">
        <MessageSquare size={16} className="text-subtle" aria-hidden />
        {t("title")}
      </h2>

      {isPending && <p className="text-sm text-subtle">…</p>}
      {comments?.length === 0 && (
        <p className="text-sm text-subtle">{t("empty")}</p>
      )}
      <ul className="flex flex-col gap-2">
        {comments?.map((c) => {
          const internal = c.visibility === "INTERNAL";
          return (
            <li
              key={c.id}
              className={`rounded-md p-2.5 text-sm ${
                internal
                  ? "border border-dashed border-border-strong bg-surface-2"
                  : "border border-info-line bg-info-soft"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-fg-soft">
                  {c.author?.name ?? "—"}
                </span>
                <span className="flex items-center gap-2 text-subtle">
                  {internal ? (
                    <span className="inline-flex items-center gap-1 rounded bg-fg/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
                      <Lock size={10} aria-hidden />
                      {t("internal")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-info-fg/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-info-fg">
                      <Eye size={10} aria-hidden />
                      {t("visibleToOwner")}
                    </span>
                  )}
                  <span className="tabular-nums">
                    {timeFormat.format(new Date(c.createdAt))}
                  </span>
                </span>
              </div>
              <p className="whitespace-pre-wrap text-fg">{c.body}</p>
            </li>
          );
        })}
      </ul>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder={t("placeholder")}
          className="text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          {canChooseVisibility ? (
            <label className="flex items-center gap-2 text-xs font-medium text-muted">
              <input
                type="checkbox"
                checked={visibility === "SHARED"}
                onChange={(e) =>
                  setVisibility(e.target.checked ? "SHARED" : "INTERNAL")
                }
                className="size-4 accent-accent"
              />
              {t("visibleToOwner")}
            </label>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={!body.trim() || post.isPending}
            loading={post.isPending}
          >
            {t("send")}
          </Button>
        </div>
        {post.isError && (
          <p role="alert" className="text-sm text-st-declined">
            {post.error.message}
          </p>
        )}
      </form>
    </Card>
  );
}
