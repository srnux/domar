import { UnauthorizedException } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

/**
 * In-memory stand-in for the two Prisma models the service touches.
 * Behaves like the real delegates for the calls used by AuthService.
 */
function createFakePrisma() {
  const users: any[] = [];
  const refreshTokens: any[] = [];

  return {
    users,
    refreshTokens,
    user: {
      findUnique: async ({ where }: any) =>
        users.find((u) => u.email === where.email || u.id === where.id) ??
        null,
    },
    refreshToken: {
      create: async ({ data }: any) => {
        const row = { id: `rt-${refreshTokens.length}`, ...data };
        refreshTokens.push(row);
        return row;
      },
      findUnique: async ({ where }: any) =>
        refreshTokens.find((t) => t.tokenHash === where.tokenHash) ?? null,
      delete: async ({ where }: any) => {
        const i = refreshTokens.findIndex(
          (t) => t.tokenHash === where.tokenHash || t.id === where.id,
        );
        if (i === -1) throw new Error('not found');
        return refreshTokens.splice(i, 1)[0];
      },
      deleteMany: async ({ where }: any) => {
        const before = refreshTokens.length;
        for (let i = refreshTokens.length - 1; i >= 0; i--) {
          if (
            (where.tokenHash && refreshTokens[i].tokenHash === where.tokenHash) ||
            (where.userId && refreshTokens[i].userId === where.userId)
          ) {
            refreshTokens.splice(i, 1);
          }
        }
        return { count: before - refreshTokens.length };
      },
    },
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let jwt: JwtService;
  let prisma: ReturnType<typeof createFakePrisma>;

  beforeEach(async () => {
    prisma = createFakePrisma();
    prisma.users.push({
      id: 'user-1',
      email: 'ana@domar.test',
      passwordHash: await argon2.hash('Domar123!'),
      role: 'SUPERVISOR',
      isActive: true,
    });

    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    jwt = moduleRef.get(JwtService);
  });

  describe('login', () => {
    it('returns an access token carrying user id and role', async () => {
      const tokens = await service.login('ana@domar.test', 'Domar123!');

      const payload = jwt.verify(tokens.accessToken);
      expect(payload.sub).toBe('user-1');
      expect(payload.role).toBe('SUPERVISOR');
    });

    it('stores only a hash of the refresh token', async () => {
      const tokens = await service.login('ana@domar.test', 'Domar123!');

      expect(tokens.refreshToken).toBeTruthy();
      expect(prisma.refreshTokens).toHaveLength(1);
      expect(prisma.refreshTokens[0].tokenHash).not.toBe(tokens.refreshToken);
      expect(prisma.refreshTokens[0].userId).toBe('user-1');
    });

    it('rejects a wrong password', async () => {
      await expect(
        service.login('ana@domar.test', 'wrong'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown email', async () => {
      await expect(
        service.login('nobody@domar.test', 'Domar123!'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a deactivated user', async () => {
      prisma.users[0].isActive = false;

      await expect(
        service.login('ana@domar.test', 'Domar123!'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rotates the token: returns a new pair and invalidates the old one', async () => {
      const first = await service.login('ana@domar.test', 'Domar123!');

      const second = await service.refresh(first.refreshToken);

      expect(second.refreshToken).not.toBe(first.refreshToken);
      expect(jwt.verify(second.accessToken).sub).toBe('user-1');
      // old token must be gone
      await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an unknown refresh token', async () => {
      await expect(service.refresh('garbage')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an expired refresh token', async () => {
      const tokens = await service.login('ana@domar.test', 'Domar123!');
      prisma.refreshTokens[0].expiresAt = new Date(Date.now() - 1000);

      await expect(service.refresh(tokens.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects refresh for a user deactivated after login', async () => {
      const tokens = await service.login('ana@domar.test', 'Domar123!');
      prisma.users[0].isActive = false;

      await expect(service.refresh(tokens.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes the refresh token', async () => {
      const tokens = await service.login('ana@domar.test', 'Domar123!');

      await service.logout(tokens.refreshToken);

      await expect(service.refresh(tokens.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('is a no-op for an unknown token', async () => {
      await expect(service.logout('garbage')).resolves.toBeUndefined();
    });
  });
});
