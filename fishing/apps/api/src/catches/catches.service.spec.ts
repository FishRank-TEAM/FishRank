import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { CatchesService } from './catches.service';
import { removeUploadedFile } from '../common/upload/image-integrity.util';

jest.mock('../common/upload/image-integrity.util', () => ({
  computeImageHash: jest.fn().mockResolvedValue('hash-1'),
  removeUploadedFile: jest.fn().mockResolvedValue(undefined),
  validatePhotoFreshness: jest.fn().mockResolvedValue({ ok: true }),
}));

describe('CatchesService 이미지 해시', () => {
  const prisma = {
    catch: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    certification: {
      deleteMany: jest.fn(),
    },
  };
  const aiService = { analyze: jest.fn() };
  const service = new CatchesService(prisma as never, aiService as never);
  const file = { path: '/tmp/fish.jpg', filename: 'catch-1.jpg' } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('AI 분석이 실패하면 대기 기록과 파일을 되돌려 재업로드를 막지 않는다', async () => {
    prisma.catch.findFirst.mockResolvedValue({ id: 'old', deletedAt: new Date('2026-01-01') });
    prisma.catch.update.mockResolvedValue({});
    prisma.catch.create.mockResolvedValue({ id: 'new-catch' });
    prisma.certification.deleteMany.mockResolvedValue({ count: 0 });
    prisma.catch.delete.mockResolvedValue({});
    aiService.analyze.mockRejectedValue(new ServiceUnavailableException('AI down'));

    await expect(service.createCertified('user-1', file, {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    expect(prisma.catch.update).toHaveBeenCalledWith({
      where: { id: 'old' },
      data: { imageHash: null },
    });
    expect(prisma.certification.deleteMany).toHaveBeenCalledWith({ where: { catchId: 'new-catch' } });
    expect(prisma.catch.delete).toHaveBeenCalledWith({ where: { id: 'new-catch' } });
    expect(removeUploadedFile).toHaveBeenCalledWith(file.path);
    expect(prisma.catch.findUnique).not.toHaveBeenCalled();
  });

  it('살아있는 동일 해시는 충돌로 거절하고 파일을 지운다', async () => {
    prisma.catch.findFirst.mockResolvedValue({ id: 'live', deletedAt: null });

    await expect(service.createCertified('user-1', file, {})).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.catch.create).not.toHaveBeenCalled();
    expect(removeUploadedFile).toHaveBeenCalledWith(file.path);
  });

  it('자랑 기록을 지우면 이미지 해시를 비운다', async () => {
    prisma.catch.findUnique.mockResolvedValue({
      id: 'catch-1',
      userId: 'user-1',
      recordType: 'personal',
      deletedAt: null,
    });
    prisma.catch.update.mockResolvedValue({ id: 'catch-1' });

    await service.deletePersonal('user-1', 'catch-1');

    expect(prisma.catch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'catch-1' },
        data: expect.objectContaining({ imageHash: null, deletedAt: expect.any(Date) }),
      }),
    );
  });
});
