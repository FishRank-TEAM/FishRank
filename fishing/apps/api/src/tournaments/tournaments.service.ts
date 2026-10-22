import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertDayCodePhoto, normalizeDayCode, seoulDateKey } from './day-code.util';
import { buildLiveLeaderboard, leaderboardCsv } from './live-leaderboard.util';

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
        _count: { select: { entries: true, dayCodes: true } },
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
    if (!tournament.isFree || tournament.entryFee > 0) {
      throw new BadRequestException('유료 참가는 아직 열리지 않았습니다.');
    }

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
        paymentStatus: 'free',
        paymentAmount: 0,
      },
    });
  }

  async getMyEntry(tournamentId: string, userId: string) {
    return this.prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
  }

  async listMyActive(userId: string, now = new Date()) {
    const entries = await this.prisma.tournamentEntry.findMany({
      where: {
        userId,
        disqualified: false,
        paymentStatus: { in: ['free', 'paid'] },
        tournament: { status: 'active', startAt: { lte: now }, endAt: { gte: now } },
      },
      include: {
        tournament: { select: { id: true, title: true, region: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
    if (!entries.length) return [];

    const codeDate = seoulDateKey(now);
    const codes = await this.prisma.tournamentDayCode.findMany({
      where: { codeDate, tournamentId: { in: entries.map((entry) => entry.tournamentId) } },
      select: { tournamentId: true },
    });
    const withCode = new Set(codes.map((row) => row.tournamentId));
    return entries.map((entry) => ({
      tournamentId: entry.tournamentId,
      title: entry.tournament.title,
      region: entry.tournament.region,
      codeDate,
      hasCode: withCode.has(entry.tournamentId),
    }));
  }

  async getRanking(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('대회를 찾을 수 없습니다.');

    const entries = await this.prisma.tournamentEntry.findMany({
      where: { tournamentId },
      include: { user: { select: { id: true, nickname: true, profileImage: true } } },
    });
    if (!entries.length) return [];

    const dayCodeCount = await this.prisma.tournamentDayCode.count({ where: { tournamentId } });
    const requireAcceptedDayCode = dayCodeCount > 0;
    const catches = await this.prisma.catch.findMany({
      where: {
        deletedAt: null,
        status: 'approved',
        recordType: 'certified',
        userId: { in: entries.map((entry) => entry.userId) },
        createdAt: { gte: tournament.startAt, lte: tournament.endAt },
        ...(requireAcceptedDayCode
          ? { claimedTournamentId: tournamentId, dayCodeStatus: 'accepted' }
          : {}),
      },
      select: {
        id: true,
        userId: true,
        lengthCm: true,
        createdAt: true,
        fishSpeciesId: true,
        claimedTournamentId: true,
        dayCodeStatus: true,
      },
    });

    return buildLiveLeaderboard(
      {
        id: tournament.id,
        fishSpeciesId: tournament.fishSpeciesId,
        minLengthCm: tournament.minLengthCm == null ? null : Number(tournament.minLengthCm),
        maxLengthCm: tournament.maxLengthCm == null ? null : Number(tournament.maxLengthCm),
        startAt: tournament.startAt,
        endAt: tournament.endAt,
        requireAcceptedDayCode,
      },
      entries,
      catches.map((catch_) => ({
        ...catch_,
        lengthCm: Number(catch_.lengthCm),
      })),
    );
  }

  // 어드민: 대회 생성
  async create(adminId: string, dto: any) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (admin?.role !== 'admin') throw new ForbiddenException('관리자만 대회를 생성할 수 있습니다.');
    this.assertFreeEntry(dto);

    return this.prisma.tournament.create({ data: { ...dto, isFree: true, entryFee: 0 } });
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
    this.assertFreeEntry(dto);

    return this.prisma.tournament.update({ where: { id }, data: { ...dto, isFree: true, entryFee: 0 } });
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
    const row = await this.findTodayDayCode(tournamentId, now);
    return { codeDate: row.codeDate, hasCode: row.code !== null };
  }

  async getManagedDayCode(actorId: string, tournamentId: string, now = new Date()) {
    await this.assertManagesTournament(actorId, tournamentId);
    return this.findTodayDayCode(tournamentId, now);
  }

  private async findTodayDayCode(tournamentId: string, now: Date) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('대회를 찾을 수 없습니다.');
    const codeDate = seoulDateKey(now);
    const row = await this.prisma.tournamentDayCode.findUnique({
      where: { tournamentId_codeDate: { tournamentId, codeDate } },
    });
    return { codeDate, code: row?.code ?? null };
  }

  async setTodayDayCode(actorId: string, tournamentId: string, rawCode: string, now = new Date()) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('대회를 찾을 수 없습니다.');
    const isAdmin = actor?.role === 'admin';
    const isOwner = actor?.role === 'organizer' && tournament.organizerId === actorId;
    if (!isAdmin && !isOwner) throw new ForbiddenException('이 대회의 코드를 등록할 수 없습니다.');

    const code = normalizeDayCode(rawCode);
    if (!code) throw new BadRequestException('대회 코드는 4~12자의 영문 또는 숫자여야 합니다.');

    const codeDate = seoulDateKey(now);
    return this.prisma.tournamentDayCode.upsert({
      where: { tournamentId_codeDate: { tournamentId, codeDate } },
      create: { tournamentId, codeDate, code },
      update: { code },
    });
  }

  async resolveDayCodeClaim(
    userId: string,
    body: { tournamentId?: unknown; dayCode?: unknown },
    now = new Date(),
    takenAt?: Date,
  ): Promise<DayCodeClaim> {
    const tournamentId = typeof body.tournamentId === 'string' ? body.tournamentId.trim() : '';
    const rawCode = typeof body.dayCode === 'string' ? body.dayCode : '';
    if (!tournamentId && !rawCode.trim()) return EMPTY_DAY_CODE_CLAIM;
    if (!tournamentId || !rawCode.trim()) {
      throw new BadRequestException('대회와 오늘의 코드를 함께 보내야 합니다.');
    }

    const code = normalizeDayCode(rawCode);
    if (!code) throw new BadRequestException('대회 코드는 4~12자의 영문 또는 숫자여야 합니다.');

    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('대회를 찾을 수 없습니다.');
    if (tournament.status !== 'active' || now < tournament.startAt || now > tournament.endAt) {
      throw new BadRequestException('진행 중인 대회 기간에만 코드를 제출할 수 있습니다.');
    }

    const entry = await this.prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!entry || (entry.paymentStatus !== 'free' && entry.paymentStatus !== 'paid')) {
      throw new BadRequestException('참가 중인 대회만 코드를 제출할 수 있습니다.');
    }
    if (entry.disqualified) {
      throw new BadRequestException('실격된 대회에는 코드를 제출할 수 없습니다.');
    }

    const codeDate = seoulDateKey(now);
    const stored = await this.prisma.tournamentDayCode.findUnique({
      where: { tournamentId_codeDate: { tournamentId, codeDate } },
    });
    if (!stored) throw new BadRequestException('오늘 대회 코드가 아직 없습니다.');
    if (stored.code !== code) throw new BadRequestException('대회 코드가 맞지 않습니다.');

    if (takenAt) {
      const photo = assertDayCodePhoto({
        takenAt,
        codeDate,
        startAt: tournament.startAt,
        endAt: tournament.endAt,
      });
      if (!photo.ok) throw new BadRequestException(photo.reason);
    }

    return { claimedTournamentId: tournamentId, claimedDayCode: code, dayCodeStatus: 'pending' };
  }

  async listParticipants(actorId: string, tournamentId: string) {
    await this.assertManagesTournament(actorId, tournamentId);
    return this.prisma.tournamentEntry.findMany({
      where: { tournamentId },
      include: { user: { select: { id: true, nickname: true, profileImage: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateOrganizerStatus(actorId: string, tournamentId: string, status: string) {
    await this.assertManagesTournament(actorId, tournamentId);
    if (!['upcoming', 'active', 'closed', 'finished'].includes(status)) {
      throw new BadRequestException('대회 상태가 올바르지 않습니다.');
    }
    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { status },
      select: { id: true, status: true },
    });
  }

  async listDayCodeClaims(actorId: string, tournamentId: string) {
    await this.assertManagesTournament(actorId, tournamentId);
    return this.prisma.catch.findMany({
      where: {
        deletedAt: null,
        claimedTournamentId: tournamentId,
        claimedDayCode: { not: null },
      },
      select: {
        id: true,
        lengthCm: true,
        status: true,
        imageUrl: true,
        claimedDayCode: true,
        dayCodeStatus: true,
        integrityNote: true,
        photoTakenAt: true,
        createdAt: true,
        user: { select: { id: true, nickname: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async reviewDayCodeClaim(
    actorId: string,
    tournamentId: string,
    catchId: string,
    status: 'accepted' | 'rejected',
  ) {
    await this.assertManagesTournament(actorId, tournamentId);
    const catch_ = await this.prisma.catch.findFirst({
      where: {
        id: catchId,
        deletedAt: null,
        claimedTournamentId: tournamentId,
        claimedDayCode: { not: null },
      },
    });
    if (!catch_) throw new NotFoundException('이 대회에 제출된 코드를 찾을 수 없습니다.');
    if (status === 'accepted' && catch_.status === 'rejected') {
      throw new BadRequestException('반려된 인증은 대회에 넣을 수 없습니다.');
    }
    return this.prisma.catch.update({
      where: { id: catchId },
      data: { dayCodeStatus: status },
      select: { id: true, dayCodeStatus: true },
    });
  }

  async setDisqualified(actorId: string, tournamentId: string, userId: string, disqualified: boolean, note?: string) {
    await this.assertManagesTournament(actorId, tournamentId);
    const entry = await this.prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!entry) throw new NotFoundException('참가자를 찾을 수 없습니다.');
    return this.prisma.tournamentEntry.update({
      where: { id: entry.id },
      data: { disqualified, disqualifyNote: note?.trim() || null },
    });
  }

  async exportLeaderboard(actorId: string, tournamentId: string) {
    await this.assertManagesTournament(actorId, tournamentId);
    return leaderboardCsv(await this.getRanking(tournamentId));
  }

  private async assertManagesTournament(actorId: string, tournamentId: string) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('대회를 찾을 수 없습니다.');
    const isAdmin = actor?.role === 'admin';
    const isOwner = actor?.role === 'organizer' && tournament.organizerId === actorId;
    if (!isAdmin && !isOwner) throw new ForbiddenException('이 대회를 운영할 수 없습니다.');
    return tournament;
  }

  async listOrganized(userId: string) {
    await this.assertOrganizer(userId);
    return this.prisma.tournament.findMany({
      where: { organizerId: userId },
      include: { _count: { select: { entries: true } } },
      orderBy: { startAt: 'desc' },
    });
  }

  async createForOrganizer(userId: string, dto: OrganizerTournamentWrite) {
    await this.assertOrganizer(userId);
    this.assertFreeEntry(dto);
    const data = this.organizerTournamentData(dto);
    return this.prisma.tournament.create({
      data: { ...data, organizerId: userId, isFree: true, entryFee: 0 },
    });
  }

  async updateForOrganizer(userId: string, id: string, dto: OrganizerTournamentWrite) {
    const actor = await this.assertOrganizer(userId);
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) throw new NotFoundException('대회를 찾을 수 없습니다.');
    if (actor.role !== 'admin' && tournament.organizerId !== userId) {
      throw new ForbiddenException('본인이 연 대회만 수정할 수 있습니다.');
    }
    this.assertFreeEntry(dto);
    return this.prisma.tournament.update({
      where: { id },
      data: { ...this.organizerTournamentData(dto), isFree: true, entryFee: 0 },
    });
  }

  private async assertOrganizer(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'organizer' && user.role !== 'admin')) {
      throw new ForbiddenException('대회 운영자만 사용할 수 있습니다.');
    }
    return user;
  }

  private assertFreeEntry(dto: { entryFee?: number; isFree?: boolean }) {
    if ((dto.entryFee ?? 0) > 0 || dto.isFree === false) {
      throw new BadRequestException('참가비는 아직 받을 수 없습니다. 상은 후원으로 안내해 주세요.');
    }
  }

  private organizerTournamentData(dto: OrganizerTournamentWrite) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      throw new BadRequestException('대회 기간이 올바르지 않습니다.');
    }
    const minLengthCm = dto.minLengthCm ?? null;
    const maxLengthCm = dto.maxLengthCm ?? null;
    if (minLengthCm != null && maxLengthCm != null && minLengthCm > maxLengthCm) {
      throw new BadRequestException('최소 체장이 최대 체장보다 클 수 없습니다.');
    }
    return {
      title: dto.title.trim(),
      description: dto.description.trim(),
      category: dto.category,
      fishSpeciesId: dto.fishSpeciesId ?? null,
      region: dto.region?.trim() || null,
      minLengthCm,
      maxLengthCm,
      prize: dto.prize?.trim() || null,
      prizeAmount: dto.prizeAmount ?? null,
      sponsorName: dto.sponsorName?.trim() || null,
      maxEntries: dto.maxEntries ?? null,
      startAt,
      endAt,
      rules: dto.rules?.trim() || null,
      status: dto.status || 'upcoming',
    };
  }
}

type OrganizerTournamentWrite = {
  title: string;
  description: string;
  category: string;
  fishSpeciesId?: number | null;
  region?: string | null;
  minLengthCm?: number | null;
  maxLengthCm?: number | null;
  prize?: string | null;
  prizeAmount?: number | null;
  sponsorName?: string | null;
  maxEntries?: number | null;
  startAt: string;
  endAt: string;
  rules?: string | null;
  status?: string;
  entryFee?: number;
  isFree?: boolean;
};
