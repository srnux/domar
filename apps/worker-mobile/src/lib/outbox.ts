import { Preferences } from "@capacitor/preferences";
import { type QueryClient, onlineManager } from "@tanstack/react-query";
import type {
  CreateCommentPayload,
  PhotoKind,
  TransitionJobPayload,
} from "@domar/shared";
import { ApiError, api } from "./api-client";

const KEY = "domar.outbox";

/**
 * A durable, FIFO queue of writes made while offline. Payloads are fully
 * serializable (photos are stored as a base64 data URL), so the queue survives
 * an app kill in Preferences and replays on reconnect.
 */
export type OutboxEntry =
  | { id: string; kind: "transition"; jobId: string; payload: TransitionJobPayload }
  | { id: string; kind: "checklist"; jobId: string; itemId: string; done: boolean }
  | { id: string; kind: "comment"; jobId: string; payload: CreateCommentPayload }
  | {
      id: string;
      kind: "photo";
      jobId: string;
      dataUrl: string;
      photoKind: PhotoKind;
      caption?: string;
      checklistItemId?: string;
    };

// Distributes over the union so each variant keeps its own fields (a plain
// Omit<union, "id"> would collapse to only the shared keys).
type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never;

let seq = 0;
function newId(): string {
  seq += 1;
  return `${Date.now()}-${seq}-${Math.round(Math.random() * 1e6)}`;
}

async function read(): Promise<OutboxEntry[]> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return [];
  try {
    return JSON.parse(value) as OutboxEntry[];
  } catch {
    return [];
  }
}

async function write(entries: OutboxEntry[]): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(entries) });
}

export async function enqueue(
  entry: DistributiveOmit<OutboxEntry, "id">,
): Promise<void> {
  const entries = await read();
  entries.push({ ...entry, id: newId() } as OutboxEntry);
  await write(entries);
}

export async function outboxCount(): Promise<number> {
  return (await read()).length;
}

export function isNetworkError(err: unknown): boolean {
  // ApiError means the server was reached and responded; anything else
  // (TypeError "Failed to fetch", etc.) is a transport failure → keep queued.
  return !(err instanceof ApiError);
}

async function send(entry: OutboxEntry): Promise<void> {
  switch (entry.kind) {
    case "transition":
      await api(`/api/jobs/${entry.jobId}/transition`, {
        method: "PATCH",
        body: JSON.stringify(entry.payload),
      });
      return;
    case "checklist":
      await api(`/api/checklist-items/${entry.itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ done: entry.done }),
      });
      return;
    case "comment":
      await api(`/api/jobs/${entry.jobId}/comments`, {
        method: "POST",
        body: JSON.stringify(entry.payload),
      });
      return;
    case "photo": {
      const blob = await (await fetch(entry.dataUrl)).blob();
      const form = new FormData();
      form.append("file", blob, "photo.jpg");
      form.append("kind", entry.photoKind);
      if (entry.caption) form.append("caption", entry.caption);
      if (entry.checklistItemId)
        form.append("checklistItemId", entry.checklistItemId);
      await api(`/api/jobs/${entry.jobId}/photos`, {
        method: "POST",
        body: form,
      });
      return;
    }
  }
}

let flushing = false;

/**
 * Replay queued writes in order. Stops on the first transport failure (stays
 * queued for the next reconnect); drops entries the server rejects with an
 * ApiError (e.g. a transition that's no longer valid because the job moved on).
 */
export async function flushOutbox(queryClient: QueryClient): Promise<void> {
  if (flushing || !onlineManager.isOnline()) return;
  flushing = true;
  let changed = false;
  try {
    for (;;) {
      if (!onlineManager.isOnline()) break;
      const entries = await read();
      if (entries.length === 0) break;
      const entry = entries[0];
      try {
        await send(entry);
      } catch (err) {
        if (isNetworkError(err)) break; // retry on next online event
        // server rejected it — drop and keep going (conflict/stale)
        console.warn("Dropping rejected outbox entry", entry.kind, err);
      }
      // Re-read before removing so a concurrent enqueue isn't lost.
      await write((await read()).filter((e) => e.id !== entry.id));
      changed = true;
    }
  } finally {
    flushing = false;
  }
  if (changed) await queryClient.invalidateQueries();
}
