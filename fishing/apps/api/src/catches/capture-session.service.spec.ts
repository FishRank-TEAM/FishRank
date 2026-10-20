import { ForbiddenException } from '@nestjs/common';
import { CaptureSessionService, hashCaptureToken } from './capture-session.service';

describe('CaptureSessionService', () => {
  const prisma = {
    captureSession: {
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn(),
    },
  };
  const service = new CaptureSessionService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('발급한 토큰은 해시만 저장하고 원문은 반환한다', async () => {
    const issued = await service.issue('user-1', new Date('2026-10-20T00:00:00Z'));

    expect(issued.captureToken.length).toBeGreaterThan(20);
    expect(issued.expiresAt.toISOString()).toBe('2026-10-20T00:10:00.000Z');
    expect(prisma.captureSession.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: hashCaptureToken(issued.captureToken),
        expiresAt: issued.expiresAt,
      },
    });
    expect(JSON.stringify(prisma.captureSession.create.mock.calls[0][0])).not.toContain(issued.captureToken);
  });

  it('유효한 토큰은 한 번만 사용된다', async () => {
    prisma.captureSession.updateMany.mockResolvedValue({ count: 1 });

    await service.consume('user-1', 'token-a');

    expect(prisma.captureSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          tokenHash: hashCaptureToken('token-a'),
          usedAt: null,
        }),
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      }),
    );
  });

  it('없거나 만료되었거나 이미 쓴 토큰은 거절한다', async () => {
    prisma.captureSession.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.consume('user-1', 'used')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.consume('user-1', '  ')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
