import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeDayCode, seoulDateKey } from './day-code.util';

export type DayCodeClaim = {
  claimedTournamentId: string | null;
  claimedDayCode: string | null;
  dayCodeStatus: string | null;
};

const EMPTY_DAY_CODE_CLAIM: DayCodeClaim = {
  claimedTournamentId: null,
  claimedDayCode: null,
  dayCodeStatus: null,
};

@Injectable()
export class TournamentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string, category?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (category && category !== 'all') where.category = { in: [category, 'all'] };

    return this.prisma.tournament.findMany({
      where,
      include: {
        _count: { select: { entries: true } },
      },
      orderBy: [{ status: 'asc' }, { startAt: 'asc' }],
    });
  }

  async findById(id: string) {
    const t = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: { select: { entries: true } },
        entries: {
          where: { rank: { not: null } },
          include: { user: { select: { id: true, nickname: true, profileImage: true } } },
          orderBy: { rank: 'asc' },
          take: 10,
        },
      },
    });
    if (!t) throw new NotFoundException('대회를 찾을 수 없습니다.');
    return t;
  }

  async join(tournamentId: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('대회를 찾을 수 없습니다.');
    if (tournament.status !== 'active') throw new BadRequestException('참가 가능한 대회가 아닙니다.');

    const existing = await this.prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (existing) throw new BadRequestException('이미 참가 중인 대회입니다.');

    if (tournament.maxEntries) {
      const count = await this.prisma.tournamentEntry.count({ where: { tournamentId } });
      if (count >= tournament.maxEntries) throw new BadRequestException('참가 인원이 마감되었습니다.');
    }

    return this.prisma.tournamentEntry.create({
      data: {
        tournamentId,
        userId,
        paymentStatus: tournament.isFree ? 'free' : 'pending',
        paymentAmount: tournament.entryFee,
      },
    });
  }

  async getMyEntry(tournamentId: string, userId: string) {
    return this.prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
  }

  async getRanking(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException();

    const entries = await this.prisma.tournamentEntry.findMany({
      where: { tournamentId, paymentStatus: { in: ['free', 'paid'] } },
      include: { user: { select: { id: true, nickname: true, profileImage: true } } },
      orderBy: { bestLengthCm: 'desc' },
    });

    return entries.map((e, i) => ({ ...e, rank: i + 1 }));
  }

  // 어드민: 대회 생성
  async create(adminId: string, dto: any) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (admin?.role !== 'admin') throw new ForbiddenException('관리자만 대회를 생성할 수 있습니다.');

    return this.prisma.tournament.create({ data: dto });
  }

  // 어드민: 대회 상태 변경
  async updateStatus(adminId: string, id: string, status: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (admin?.role !== 'admin') throw new ForbiddenException();

    return this.prisma.tournament.update({ where: { id }, data: { status } });
  }

  // 어드민: 대회 수정
  async update(adminId: string, id: string, dto: any) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (admin?.role !== 'admin') throw new ForbiddenException();

    return this.prisma.tournament.update({ where: { id }, data: dto });
  }

  // 어드민: 대회 삭제
  async delete(adminId: string, id: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (admin?.role !== 'admin') throw new ForbiddenException();

    const existing = await this.prisma.tournament.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('대회를 찾을 수 없습니다.');

    await this.prisma.$transaction([
      this.prisma.tournamentEntry.deleteMany({ where: { tournamentId: id } }),
      this.prisma.tournament.delete({ where: { id } }),
    ]);

    return { deleted: true };
  }

  async getTodayDayCode(tournamentId: string, now = new Date()) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('대회를 찾을 수 없습니다.');
    const codeDate = seoulDateKey(now);
    const row = await this.prisma.tournamentDayCode.findUnique({
      where: { tournamentId_codeDate: { tournamentId, codeDate } },
    });
    return { codeDate, code: row?.code ?? null };
  }

  async setTodayDayCode(adminId: string, tournamentId: string, rawCode: string, now = new Date()) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (admin?.role !== 'admin') throw new ForbiddenException('관리자만 대회 코드를 등록할 수 있습니다.');

    const code = normalizeDayCode(rawCode);
    if (!code) throw new BadRequestException('대회 코드는 4~12자의 영문 또는 숫자여야 합니다.');

    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('대회를 찾을 수 없습니다.');

    const codeDate = seoulDateKey(now);
    return this.prisma.tournamentDayCode.upsert({
      where: { tournamentId_codeDate: { tournamentId, codeDate } },
      create: { tournamentId, codeDate, code },
      update: { code },
    });
  }

  async resolveDayCodeClaim(userId: string, body: { tournamentId?: unknown; dayCode?: unknown }, now = new Date()): Promise<DayCodeClaim> {
    const tournamentId = typeof body.tournamentId === 'string' ? body.tournamentId.trim() : '';
    const rawCode = typeof body.dayCode === 'string' ? body.dayCode : '';
    if (!tournamentId && !rawCode.trim()) return EMPTY_DAY_CODE_CLAIM;
    if (!tournamentId || !rawCode.trim()) {
      throw new BadRequestException('대회와 오늘의 코드를 함께 보내야 합니다.');
    }

    const code = normalizeDayCode(rawCode);
    if (!code) throw new BadRequestException('대회 코드는 4~12자의 영문 또는 숫자여야 합니다.');

    const entry = await this.prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!entry || (entry.paymentStatus !== 'free' && entry.paymentStatus !== 'paid')) {
      throw new BadRequestException('참가 중인 대회만 코드를 제출할 수 있습니다.');
    }

    const codeDate = seoulDateKey(now);
    const stored = await this.prisma.tournamentDayCode.findUnique({
      where: { tournamentId_codeDate: { tournamentId, codeDate } },
    });
    if (!stored) throw new BadRequestException('오늘 대회 코드가 아직 없습니다.');
    if (stored.code !== code) throw new BadRequestException('대회 코드가 맞지 않습니다.');

    return { claimedTournamentId: tournamentId, claimedDayCode: code, dayCodeStatus: 'pending' };
  }
}
