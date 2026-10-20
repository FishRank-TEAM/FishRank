import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService.reviewDayCode', () => {
  const prisma = {
    catch: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new AdminService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('코드 확인은 상태만 바꾸고 랭킹 점수는 건드리지 않는다', async () => {
    prisma.catch.findUnique.mockResolvedValue({ id: 'c1', claimedDayCode: 'LAKE1', rankScore: 40 });
    prisma.catch.update.mockResolvedValue({});

    await expect(service.reviewDayCode('c1', 'rejected')).resolves.toEqual({
      catchId: 'c1',
      dayCodeStatus: 'rejected',
    });
    expect(prisma.catch.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { dayCodeStatus: 'rejected' },
    });
  });

  it('코드가 없는 기록은 확인할 수 없다', async () => {
    prisma.catch.findUnique.mockResolvedValue({ id: 'c1', claimedDayCode: null });
    await expect(service.reviewDayCode('c1', 'accepted')).rejects.toBeInstanceOf(BadRequestException);
  });
});