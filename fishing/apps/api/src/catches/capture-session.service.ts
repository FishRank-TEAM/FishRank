import { createHash, randomBytes } from 'crypto';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const CAPTURE_TOKEN_TTL_MS = 10 * 60 * 1000;

export function hashCaptureToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class CaptureSessionService {
  constructor(private prisma: PrismaService) {}

  async issue(userId: string, now = new Date()) {
    const captureToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now.getTime() + CAPTURE_TOKEN_TTL_MS);
    await this.prisma.captureSession.create({
      data: {
        userId,
        tokenHash: hashCaptureToken(captureToken),
        expiresAt,
      },
    });
    return { captureToken, expiresAt };
  }

  async consume(userId: string, token: string | undefined, now = new Date()) {
    const trimmed = token?.trim();
    if (!trimmed) {
      throw new ForbiddenException(
        '공식 인증은 앱에서 발급된 촬영 토큰이 있어야 합니다. 앱에서 다시 촬영해 주세요.',
      );
    }

    const updated = await this.prisma.captureSession.updateMany({
      where: {
        userId,
        tokenHash: hashCaptureToken(trimmed),
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (updated.count !== 1) {
      throw new ForbiddenException(
        '촬영 토큰이 만료되었거나 이미 사용되었습니다. 앱에서 다시 촬영해 주세요.',
      );
    }
  }
}
