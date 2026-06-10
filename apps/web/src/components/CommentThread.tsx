"use client";

import { useState } from "react";
import type { CommentVisibility } from "@domar/shared";
import { useTranslations } from "next-intl";
import { useComments, usePostComment } from "@/lib/comments";

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
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3">
      <h2 className="font-semibold">{t("title")}</h2>

      {isPending && <p className="text-sm text-neutral-400">…</p>}
      {comments?.length === 0 && (
        <p className="text-sm text-neutral-400">{t("empty")}</p>
      )}
      <ul className="flex flex-col gap-2">
        {comments?.map((c) => (
          <li
            key={c.id}
            className={`rounded-lg p-2 text-sm ${
              c.visibility === "INTERNAL"
                ? "bg-neutral-50 border border-dashed border-neutral-200"
                : "bg-blue-50"
            }`}
          >
            <div className="mb-0.5 flex items-center justify-between gap-2 text-xs text-neutral-400">
              <span className="font-medium text-neutral-600">
                {c.author?.name ?? "—"}
              </span>
              <span>
                {c.visibility === "INTERNAL" && (
                  <span className="mr-2 rounded bg-neutral-200 px-1 text-[10px] uppercase">
                    {t("internal")}
                  </span>
                )}
                {timeFormat.format(new Date(c.createdAt))}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder={t("placeholder")}
          className="rounded-lg border border-neutral-300 p-2 text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          {canChooseVisibility ? (
            <label className="flex items-center gap-1.5 text-xs text-neutral-500">
              <input
                type="checkbox"
                checked={visibility === "SHARED"}
                onChange={(e) =>
                  setVisibility(e.target.checked ? "SHARED" : "INTERNAL")
                }
              />
              {t("visibleToOwner")}
            </label>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={!body.trim() || post.isPending}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("send")}
          </button>
        </div>
        {post.isError && (
          <p role="alert" className="text-sm text-red-600">
            {post.error.message}
          </p>
        )}
      </form>
    </section>
  );
}
