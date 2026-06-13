"use client";

import { useState } from "react";
import type { JobRatingDto } from "@domar/shared";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { useRateJob } from "@/lib/ratings";
import { Button, Card, Textarea } from "@/components/ui";

/**
 * Owner-facing card to rate a finished job 1–5 stars with an optional note.
 * Prefills from an existing rating; submitting upserts it.
 */
export function RatingCard({
  jobId,
  rating,
}: {
  jobId: string;
  rating: JobRatingDto | null;
}) {
  const t = useTranslations("rating");
  const rate = useRateJob(jobId);
  const [score, setScore] = useState(rating?.score ?? 0);
  const [comment, setComment] = useState(rating?.comment ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (score < 1) return;
    rate.mutate({ score, comment: comment.trim() || undefined });
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="flex items-center gap-2 font-semibold text-fg">
        <Star size={16} className="text-subtle" aria-hidden />
        {t("title")}
      </h2>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <StarRating value={score} onChange={setScore} disabled={rate.isPending} />
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder={t("placeholder")}
          className="text-sm"
        />
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={score < 1 || rate.isPending}
            loading={rate.isPending}
          >
            {rating ? t("update") : t("submit")}
          </Button>
          {rate.isSuccess && (
            <span className="text-sm font-medium text-accent-fg">
              {t("saved")}
            </span>
          )}
        </div>
        {rate.isError && (
          <p role="alert" className="text-sm text-st-declined">
            {rate.error.message}
          </p>
        )}
      </form>
    </Card>
  );
}
