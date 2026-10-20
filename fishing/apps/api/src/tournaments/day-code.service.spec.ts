import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';

describe('TournamentsService 일일 코드', () => {
  const now = new Date('2026-10-20T03:00:00.000Z');
  const prisma = {
    user: { findUnique: jest.fn() },
    tournament: { findUnique: jest.fn() },
    tournamentEntry: { findUnique: jest.fn() },
    tournamentDayCode: { findUnique: jest.fn(), upsert: jest.fn() },
  };
  const service = new TournamentsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.tournament.findUnique.mockResolvedValue({ id: 'tour-1' });
  });

  it('관리자가 서울 날짜 코드를 저장한다', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'admin' });
    prisma.tournamentDayCode.upsert.mockResolvedValue({ code: 'LAKE1' });

    await service.setTodayDayCode('admin-1', 'tour-1', 'lake1', now);

    expect(prisma.tournamentDayCode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentId_codeDate: { tournamentId: 'tour-1', codeDate: '2026-10-20' } },
        create: { tournamentId: 'tour-1', codeDate: '2026-10-20', code: 'LAKE1' },
      }),
    );
  });

  it('관리자가 아니면 코드를 저장하지 않는다', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'user' });
    await expect(service.setTodayDayCode('user-1', 'tour-1', 'LAKE1', now)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('참가자의 맞는 코드는 검수 대기로 남긴다', async () => {
    prisma.tournamentEntry.findUnique.mockResolvedValue({ paymentStatus: 'free' });
    prisma.tournamentDayCode.findUnique.mockResolvedValue({ code: 'LAKE1' });

    await expect(
      service.resolveDayCodeClaim('user-1', { tournamentId: 'tour-1', dayCode: 'lake1' }, now),
    ).resolves.toEqual({
      claimedTournamentId: 'tour-1',
      claimedDayCode: 'LAKE1',
      dayCodeStatus: 'pending',
    });
  });

  it('코드가 없으면 제출을 요구하지 않는다', async () => {
    await expect(service.resolveDayCodeClaim('user-1', {}, now)).resolves.toEqual({
      claimedTournamentId: null,
      claimedDayCode: null,
      dayCodeStatus: null,
    });
    expect(prisma.tournamentEntry.findUnique).not.toHaveBeenCalled();
  });

  it('다른 코드는 거절한다', async () => {
    prisma.tournamentEntry.findUnique.mockResolvedValue({ paymentStatus: 'paid' });
    prisma.tournamentDayCode.findUnique.mockResolvedValue({ code: 'LAKE1' });

    await expect(
      service.resolveDayCodeClaim('user-1', { tournamentId: 'tour-1', dayCode: 'RIVER' }, now),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
