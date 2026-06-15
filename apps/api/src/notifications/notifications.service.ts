import { Injectable, Logger } from '@nestjs/common';
import type { App } from 'firebase-admin/app';
import { PrismaService } from '../prisma/prisma.service';

interface PushPayload {
  title: string;
  body: string;
  /** Deep-link target etc. — values must be strings for FCM. */
  data?: Record<string, string>;
}

/**
 * Sends push notifications to a user's registered devices via FCM. Disabled
 * gracefully when FIREBASE_SERVICE_ACCOUNT is unset (logs instead of sending),
 * so the app runs in dev without Firebase credentials. All sends are
 * fire-and-forget — callers must never block a request on delivery.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  // undefined = not initialized yet, null = disabled (no credentials)
  private app: App | null | undefined;

  constructor(private readonly prisma: PrismaService) {}

  private async getApp(): Promise<App | null> {
    if (this.app !== undefined) return this.app;
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      this.app = null;
      return null;
    }
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const existing = getApps().find((a) => a.name === 'domar');
    this.app =
      existing ??
      initializeApp(
        { credential: cert(JSON.parse(raw)) as never },
        'domar',
      );
    return this.app;
  }

  async notifyUser(userId: string, payload: PushPayload): Promise<void> {
    try {
      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });
      if (tokens.length === 0) return;

      const app = await this.getApp();
      if (!app) {
        this.logger.log(
          `[push disabled] would notify ${userId} (${tokens.length} device(s)): ${payload.title}`,
        );
        return;
      }

      const { getMessaging } = await import('firebase-admin/messaging');
      const res = await getMessaging(app).sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
      });

      // Prune tokens FCM reports as permanently invalid.
      const stale = res.responses
        .map((r, i) => ({ r, token: tokens[i].token }))
        .filter(
          ({ r }) =>
            r.error?.code === 'messaging/registration-token-not-registered' ||
            r.error?.code === 'messaging/invalid-registration-token',
        )
        .map(({ token }) => token);
      if (stale.length) {
        await this.prisma.deviceToken.deleteMany({
          where: { token: { in: stale } },
        });
      }
    } catch (err) {
      this.logger.warn(`notifyUser failed for ${userId}: ${String(err)}`);
    }
  }
}
