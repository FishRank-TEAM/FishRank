import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';

describe('TournamentsService 무료 참가', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    tournament: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    tournamentEntry: { findUnique: jest.fn(), create: jest.fn() },
  };
  const service = new TournamentsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('진행 중인 무료 대회에 참가하면 결제 금액은 0이다', async () => {
    prisma.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      status: 'active',
      isFree: true,
      entryFee: 0,
      maxEntries: null,
    });
    prisma.tournamentEntry.findUnique.mockResolvedValue(null);
    prisma.tournamentEntry.create.mockImplementation(async ({ data }) => data);

    await expect(service.join('tour-1', 'user-1')).resolves.toEqual({
      tournamentId: 'tour-1',
      userId: 'user-1',
      paymentStatus: 'free',
      paymentAmount: 0,
    });
  });

  it('참가비가 있는 대회는 참가를 받지 않는다', async () => {
    prisma.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      status: 'active',
      isFree: false,
      entryFee: 5000,
    });

    await expect(service.join('tour-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.tournamentEntry.create).not.toHaveBeenCalled();
  });

  it('관리자도 참가비가 있는 대회를 만들지 못한다', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'admin' });

    await expect(
      service.create('admin-1', { title: '유료', isFree: false, entryFee: 5000 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.tournament.create).not.toHaveBeenCalled();
  });

  it('일반 회원은 관리자 대회 생성을 하지 못한다', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'user' });

    await expect(service.create('user-1', { title: '무료', isFree: true, entryFee: 0 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
