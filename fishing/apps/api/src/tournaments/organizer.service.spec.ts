import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';

describe('TournamentsService 운영자 대회', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    tournament: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    tournamentDayCode: { upsert: jest.fn() },
  };
  const service = new TournamentsService(prisma as never);
  const dto = {
    title: '거제 감성돔',
    description: '낚시점 후원 대회',
    category: 'saltwater',
    region: '경남 거제',
    minLengthCm: 25,
    maxLengthCm: 80,
    prize: '상품권',
    prizeAmount: 100000,
    sponsorName: '거제낚시점',
    startAt: '2026-11-01T00:00:00.000Z',
    endAt: '2026-11-02T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('운영자는 무료 대회만 만들고 후원 상을 저장한다', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'org-1', role: 'organizer' });
    prisma.tournament.create.mockImplementation(async ({ data }) => data);

    const created = await service.createForOrganizer('org-1', dto);

    expect(created).toEqual(expect.objectContaining({
      organizerId: 'org-1',
      isFree: true,
      entryFee: 0,
      sponsorName: '거제낚시점',
      region: '경남 거제',
      minLengthCm: 25,
      prize: '상품권',
    }));
  });

  it('참가비가 있으면 거절한다', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'org-1', role: 'organizer' });
    await expect(
      service.createForOrganizer('org-1', { ...dto, entryFee: 5000 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('일반 회원은 대회를 열 수 없다', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'user' });
    await expect(service.createForOrganizer('user-1', dto)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('운영자는 자기 대회의 오늘 코드를 등록한다', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'org-1', role: 'organizer' });
    prisma.tournament.findUnique.mockResolvedValue({ id: 'tour-1', organizerId: 'org-1' });
    prisma.tournamentDayCode.upsert.mockResolvedValue({ code: 'SHOP1' });

    await service.setTodayDayCode('org-1', 'tour-1', 'shop1', new Date('2026-10-20T03:00:00.000Z'));

    expect(prisma.tournamentDayCode.upsert).toHaveBeenCalled();
  });

  it('다른 운영자의 대회 코드는 등록하지 못한다', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'org-2', role: 'organizer' });
    prisma.tournament.findUnique.mockResolvedValue({ id: 'tour-1', organizerId: 'org-1' });
    await expect(
      service.setTodayDayCode('org-2', 'tour-1', 'SHOP1', new Date('2026-10-20T03:00:00.000Z')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
