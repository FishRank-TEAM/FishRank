import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';
import { seedRankingBulk } from './seed-ranking-bulk';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Fish1234!';

/** 시드 유저·기록 ID — 재실행 시 upsert */
const DEMO = {
  users: {
    geoje: 'a1000001-0001-4000-8000-000000000001',
    chuncheon: 'a1000001-0001-4000-8000-000000000002',
    yeosu: 'a1000001-0001-4000-8000-000000000003',
    jeju: 'a1000001-0001-4000-8000-000000000004',
    han: 'a1000001-0001-4000-8000-000000000005',
  },
} as const;

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(14, 30, 0, 0);
  return d;
}

function calcRankScore(lengthCm: number, speciesId: number, species: { id: number; rarityWeight: unknown }[]) {
  const sp = species.find((s) => s.id === speciesId);
  const weight = sp ? Number(sp.rarityWeight) : 1;
  return Math.round(lengthCm * weight * 100) / 100;
}

async function seedDemoUsers(passwordHash: string) {
  const allSpecies = await prisma.fishSpecies.findMany();

  const userDefs = [
    {
      id: DEMO.users.geoje,
      email: 'geoje@fishrank.demo',
      nickname: '거제바다킹',
      activityRegion: '경남 거제',
      fishingCategory: 'saltwater',
      featuredCatchIds: ['c1000001-0001-4000-8000-000000000001'],
    },
    {
      id: DEMO.users.chuncheon,
      email: 'chuncheon@fishrank.demo',
      nickname: '춘천배스왕',
      activityRegion: '강원 춘천',
      fishingCategory: 'freshwater',
      featuredCatchIds: ['c1000001-0001-4000-8000-000000000004', 'c1000001-0001-4000-8000-000000000005'],
    },
    {
      id: DEMO.users.yeosu,
      email: 'yeosu@fishrank.demo',
      nickname: '여수낚시고수',
      activityRegion: '전남 여수',
      fishingCategory: 'saltwater',
      featuredCatchIds: ['c1000001-0001-4000-8000-000000000007'],
    },
    {
      id: DEMO.users.jeju,
      email: 'jeju@fishrank.demo',
      nickname: '제주도민',
      activityRegion: '제주 제주',
      fishingCategory: 'both',
      featuredCatchIds: ['c1000001-0001-4000-8000-000000000010'],
    },
    {
      id: DEMO.users.han,
      email: 'han@fishrank.demo',
      nickname: '한강프로',
      activityRegion: '서울 양천',
      fishingCategory: 'freshwater',
      featuredCatchIds: ['c1000001-0001-4000-8000-000000000012'],
    },
  ];

  for (const u of userDefs) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        nickname: u.nickname,
        activityRegion: u.activityRegion,
        fishingCategory: u.fishingCategory,
        featuredCatchIds: u.featuredCatchIds,
        passwordHash,
        deletedAt: null,
      },
      create: {
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        passwordHash,
        activityRegion: u.activityRegion,
        fishingCategory: u.fishingCategory,
        featuredCatchIds: u.featuredCatchIds,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: 'admin@fishrank.demo' },
    update: { role: 'admin', passwordHash, deletedAt: null, nickname: 'FishRank관리자' },
    create: {
      id: 'a1000001-0001-4000-8000-000000009999',
      email: 'admin@fishrank.demo',
      nickname: 'FishRank관리자',
      passwordHash,
      role: 'admin',
    },
  });

  type CatchDef = {
    id: string;
    userId: string;
    fishSpeciesId: number;
    lengthCm: number;
    locationName: string;
    recordType: 'certified' | 'personal';
    status: 'approved' | 'pending';
    grade?: 'S' | 'A' | 'B';
    createdAt: Date;
    memo?: string;
  };

  const catchDefs: CatchDef[] = [
    // 거제바다킹 — 참돔 1위급
    { id: 'c1000001-0001-4000-8000-000000000001', userId: DEMO.users.geoje, fishSpeciesId: 8, lengthCm: 78.5, locationName: '거제 외포', recordType: 'certified', status: 'approved', grade: 'S', createdAt: daysAgo(2) },
    { id: 'c1000001-0001-4000-8000-000000000002', userId: DEMO.users.geoje, fishSpeciesId: 10, lengthCm: 42.0, locationName: '거제 지세포', recordType: 'certified', status: 'approved', grade: 'A', createdAt: daysAgo(5) },
    { id: 'c1000001-0001-4000-8000-000000000003', userId: DEMO.users.geoje, fishSpeciesId: 9, lengthCm: 55.2, locationName: '통영 욕지도', recordType: 'personal', status: 'approved', createdAt: daysAgo(12) },

    // 춘천배스왕
    { id: 'c1000001-0001-4000-8000-000000000004', userId: DEMO.users.chuncheon, fishSpeciesId: 1, lengthCm: 61.8, locationName: '춘천 소양강', recordType: 'certified', status: 'approved', grade: 'S', createdAt: daysAgo(1) },
    { id: 'c1000001-0001-4000-8000-000000000005', userId: DEMO.users.chuncheon, fishSpeciesId: 1, lengthCm: 54.3, locationName: '춘천 의암호', recordType: 'certified', status: 'approved', grade: 'A', createdAt: daysAgo(4) },
    { id: 'c1000001-0001-4000-8000-000000000006', userId: DEMO.users.chuncheon, fishSpeciesId: 2, lengthCm: 38.5, locationName: '홍천강', recordType: 'personal', status: 'approved', createdAt: daysAgo(20) },

    // 여수낚시고수
    { id: 'c1000001-0001-4000-8000-000000000007', userId: DEMO.users.yeosu, fishSpeciesId: 9, lengthCm: 72.3, locationName: '여수 돌산', recordType: 'certified', status: 'approved', grade: 'S', createdAt: daysAgo(3) },
    { id: 'c1000001-0001-4000-8000-000000000008', userId: DEMO.users.yeosu, fishSpeciesId: 11, lengthCm: 48.7, locationName: '여수 화정', recordType: 'certified', status: 'approved', grade: 'A', createdAt: daysAgo(6) },

    // 제주도민
    { id: 'c1000001-0001-4000-8000-000000000009', userId: DEMO.users.jeju, fishSpeciesId: 2, lengthCm: 65.1, locationName: '제주 화순', recordType: 'certified', status: 'approved', grade: 'A', createdAt: daysAgo(1) },
    { id: 'c1000001-0001-4000-8000-000000000010', userId: DEMO.users.jeju, fishSpeciesId: 3, lengthCm: 88.2, locationName: '제주 한림', recordType: 'certified', status: 'approved', grade: 'S', createdAt: daysAgo(0) },
    { id: 'c1000001-0001-4000-8000-000000000011', userId: DEMO.users.jeju, fishSpeciesId: 13, lengthCm: 92.0, locationName: '제주 애월', recordType: 'personal', status: 'approved', createdAt: daysAgo(8) },

    // 한강프로
    { id: 'c1000001-0001-4000-8000-000000000012', userId: DEMO.users.han, fishSpeciesId: 1, lengthCm: 47.5, locationName: '서울 양화', recordType: 'certified', status: 'approved', grade: 'B', createdAt: daysAgo(2) },
    { id: 'c1000001-0001-4000-8000-000000000013', userId: DEMO.users.han, fishSpeciesId: 4, lengthCm: 32.1, locationName: '서울 뚝섬', recordType: 'certified', status: 'approved', grade: 'A', createdAt: daysAgo(5) },
    { id: 'c1000001-0001-4000-8000-000000000014', userId: DEMO.users.han, fishSpeciesId: 6, lengthCm: 58.0, locationName: '파주 임진', recordType: 'personal', status: 'approved', createdAt: daysAgo(15) },
  ];

  for (const c of catchDefs) {
    const rankScore =
      c.recordType === 'certified' && c.status === 'approved'
        ? calcRankScore(c.lengthCm, c.fishSpeciesId, allSpecies)
        : null;

    await prisma.catch.upsert({
      where: { id: c.id },
      update: {
        userId: c.userId,
        fishSpeciesId: c.fishSpeciesId,
        imageUrl: `/uploads/seed-${c.fishSpeciesId}.jpg`,
        lengthCm: c.lengthCm,
        aiLengthCm: c.lengthCm,
        aiConfidence: c.recordType === 'certified' ? 0.94 : null,
        rankScore,
        locationName: c.locationName,
        recordType: c.recordType,
        status: c.status,
        memo: c.memo ?? null,
        createdAt: c.createdAt,
        deletedAt: null,
      },
      create: {
        id: c.id,
        userId: c.userId,
        fishSpeciesId: c.fishSpeciesId,
        imageUrl: `/uploads/seed-${c.fishSpeciesId}.jpg`,
        lengthCm: c.lengthCm,
        aiLengthCm: c.lengthCm,
        aiConfidence: c.recordType === 'certified' ? 0.94 : null,
        rankScore,
        locationName: c.locationName,
        recordType: c.recordType,
        status: c.status,
        memo: c.memo ?? null,
        createdAt: c.createdAt,
      },
    });

    if (c.recordType === 'certified' && c.grade) {
      await prisma.certification.upsert({
        where: { catchId: c.id },
        update: {
          grade: c.grade,
          rulerDetected: true,
          ruleFlat: true,
          ruleVertical: true,
          ruleRuler: true,
          ruleFullBody: true,
          processedAt: c.createdAt,
        },
        create: {
          catchId: c.id,
          grade: c.grade,
          rulerDetected: true,
          ruleFlat: true,
          ruleVertical: true,
          ruleRuler: true,
          ruleFullBody: true,
          processedAt: c.createdAt,
        },
      });
    } else {
      await prisma.certification.deleteMany({ where: { catchId: c.id } });
    }
  }

  const personalCatchIds = catchDefs
    .filter((c) => c.recordType === 'personal')
    .map((c) => c.id);

  await prisma.catchVote.deleteMany({
    where: { catchId: { in: personalCatchIds } },
  });

  const voteDefs: { catchId: string; userId: string }[] = [
    { catchId: 'c1000001-0001-4000-8000-000000000003', userId: DEMO.users.chuncheon },
    { catchId: 'c1000001-0001-4000-8000-000000000003', userId: DEMO.users.yeosu },
    { catchId: 'c1000001-0001-4000-8000-000000000003', userId: DEMO.users.jeju },
    { catchId: 'c1000001-0001-4000-8000-000000000003', userId: DEMO.users.han },
    { catchId: 'c1000001-0001-4000-8000-000000000006', userId: DEMO.users.geoje },
    { catchId: 'c1000001-0001-4000-8000-000000000006', userId: DEMO.users.yeosu },
    { catchId: 'c1000001-0001-4000-8000-000000000011', userId: DEMO.users.geoje },
    { catchId: 'c1000001-0001-4000-8000-000000000011', userId: DEMO.users.chuncheon },
    { catchId: 'c1000001-0001-4000-8000-000000000011', userId: DEMO.users.yeosu },
    { catchId: 'c1000001-0001-4000-8000-000000000011', userId: DEMO.users.han },
    { catchId: 'c1000001-0001-4000-8000-000000000014', userId: DEMO.users.chuncheon },
    { catchId: 'c1000001-0001-4000-8000-000000000014', userId: DEMO.users.jeju },
  ];

  for (const v of voteDefs) {
    await prisma.catchVote.upsert({
      where: { catchId_userId: { catchId: v.catchId, userId: v.userId } },
      update: {},
      create: { catchId: v.catchId, userId: v.userId },
    });
  }

  const postDefs = [
    {
      id: 'p1000001-0001-4000-8000-000000000001',
      userId: DEMO.users.geoje,
      title: '거제 외포 참돔 78cm — 이번 주 최고 기록',
      content: '새벽 4시 출조해서 드디어 70 넘는 참돔 떴습니다. 줄자 인증 S등급 나왔어요.',
      createdAt: daysAgo(2),
    },
    {
      id: 'p1000001-0001-4000-8000-000000000002',
      userId: DEMO.users.chuncheon,
      title: '소양강 배스 61cm 랭킹 올렸습니다',
      content: '스피너베이트로 입질 한 방. AI 측정도 깔끔하게 통과했네요.',
      createdAt: daysAgo(1),
    },
    {
      id: 'p1000001-0001-4000-8000-000000000003',
      userId: DEMO.users.yeosu,
      title: '여수 돌산 광어 포인트 공유',
      content: '돌산대교 근처 수심 12m 지점에서 광어 70cm대. 활미끼 추천합니다.',
      createdAt: daysAgo(3),
    },
    {
      id: 'p1000001-0001-4000-8000-000000000004',
      userId: DEMO.users.jeju,
      title: '제주 한림 가물치 88cm',
      content: '민물 포인트에서 대형 가물치. 줄자 인증 처음 해봤는데 생각보다 간단하네요.',
      createdAt: daysAgo(0),
    },
    {
      id: 'p1000001-0001-4000-8000-000000000005',
      userId: DEMO.users.han,
      title: '한강 뚝섬 붕어 낚시 후기',
      content: '주말 아침 뚝섬에서 붕어 32cm. 인증 기록은 작지만 만족합니다.',
      createdAt: daysAgo(5),
    },
  ];

  for (const p of postDefs) {
    await prisma.post.upsert({
      where: { id: p.id },
      update: {
        userId: p.userId,
        title: p.title,
        content: p.content,
        createdAt: p.createdAt,
        deletedAt: null,
      },
      create: {
        id: p.id,
        userId: p.userId,
        title: p.title,
        content: p.content,
        createdAt: p.createdAt,
      },
    });
  }

  const bassTournament = await prisma.tournament.findFirst({
    where: { title: '6월 전국 배스 대회' },
  });

  if (bassTournament) {
    const entries = [
      { userId: DEMO.users.chuncheon, bestCatchId: 'c1000001-0001-4000-8000-000000000004', bestLengthCm: 61.8 },
      { userId: DEMO.users.han, bestCatchId: 'c1000001-0001-4000-8000-000000000012', bestLengthCm: 47.5 },
    ];
    for (const e of entries) {
      await prisma.tournamentEntry.upsert({
        where: {
          tournamentId_userId: {
            tournamentId: bassTournament.id,
            userId: e.userId,
          },
        },
        update: {
          bestCatchId: e.bestCatchId,
          bestLengthCm: e.bestLengthCm,
          paymentStatus: 'paid',
        },
        create: {
          tournamentId: bassTournament.id,
          userId: e.userId,
          bestCatchId: e.bestCatchId,
          bestLengthCm: e.bestLengthCm,
          paymentStatus: 'paid',
          paymentAmount: bassTournament.entryFee,
        },
      });
    }
  }

  console.log('\n📋 데모 계정 (비밀번호 공통: %s)', DEMO_PASSWORD);
  for (const u of userDefs) {
    console.log('   • %s / %s', u.email, u.nickname);
  }
  console.log('   • 인증 기록 %d건 · 자랑 기록 %d건 · 커뮤니티 글 %d건\n',
    catchDefs.filter((c) => c.recordType === 'certified').length,
    catchDefs.filter((c) => c.recordType === 'personal').length,
    postDefs.length,
  );
}

async function main() {
  // 어종 (민물/바다/기수) — fish-species-catalog.ts 와 ID 동기화
  const species = [
    { id: 1, nameKo: '배스', nameEn: 'Largemouth Bass', category: 'freshwater', rarityWeight: 1.0 },
    { id: 2, nameKo: '쏘가리', nameEn: 'Mandarin Fish', category: 'freshwater', rarityWeight: 1.5 },
    { id: 3, nameKo: '가물치', nameEn: 'Snakehead', category: 'freshwater', rarityWeight: 1.3 },
    { id: 4, nameKo: '붕어', nameEn: 'Crucian Carp', category: 'freshwater', rarityWeight: 1.0 },
    { id: 5, nameKo: '잉어', nameEn: 'Common Carp', category: 'freshwater', rarityWeight: 1.1 },
    { id: 6, nameKo: '메기', nameEn: 'Amur Catfish', category: 'freshwater', rarityWeight: 1.2 },
    { id: 7, nameKo: '뱀장어', nameEn: 'Japanese Eel', category: 'saltwater', rarityWeight: 1.6 },
    { id: 8, nameKo: '참돔', nameEn: 'Red Seabream', category: 'saltwater', rarityWeight: 1.8 },
    { id: 9, nameKo: '광어', nameEn: 'Olive Flounder', category: 'saltwater', rarityWeight: 1.6 },
    { id: 10, nameKo: '우럭', nameEn: 'Korean Rockfish', category: 'saltwater', rarityWeight: 1.2 },
    { id: 11, nameKo: '감성돔', nameEn: 'Black Porgy', category: 'saltwater', rarityWeight: 1.7 },
    { id: 12, nameKo: '농어', nameEn: 'Japanese Seabass', category: 'saltwater', rarityWeight: 1.5 },
    { id: 13, nameKo: '방어', nameEn: 'Japanese Amberjack', category: 'saltwater', rarityWeight: 2.0 },
    { id: 14, nameKo: '고등어', nameEn: 'Chub Mackerel', category: 'saltwater', rarityWeight: 0.8 },
    { id: 15, nameKo: '삼치', nameEn: 'Japanese Spanish Mackerel', category: 'saltwater', rarityWeight: 1.3 },
    { id: 16, nameKo: '미꾸라지', nameEn: 'Korean Loach', category: 'freshwater', rarityWeight: 1.0 },
    { id: 17, nameKo: '향어', nameEn: 'Ayu', category: 'freshwater', rarityWeight: 1.4 },
    { id: 18, nameKo: '송어', nameEn: 'Rainbow Trout', category: 'freshwater', rarityWeight: 1.2 },
    { id: 19, nameKo: '피라미', nameEn: 'Freshwater Minnow', category: 'freshwater', rarityWeight: 0.9 },
    { id: 20, nameKo: '메운', nameEn: 'Korean Sharpbelly', category: 'freshwater', rarityWeight: 0.9 },
    { id: 21, nameKo: '빙어', nameEn: 'Icefish', category: 'freshwater', rarityWeight: 1.0 },
    { id: 22, nameKo: '산천어', nameEn: 'Masu Salmon', category: 'freshwater', rarityWeight: 1.5 },
    { id: 23, nameKo: '전갱이', nameEn: 'Japanese Scad', category: 'saltwater', rarityWeight: 0.9 },
    { id: 24, nameKo: '붕장어', nameEn: 'Pike Eel', category: 'saltwater', rarityWeight: 1.3 },
    { id: 25, nameKo: '숭어', nameEn: 'Flathead Mullet', category: 'saltwater', rarityWeight: 1.0 },
    { id: 26, nameKo: '조기', nameEn: 'Silver Croaker', category: 'saltwater', rarityWeight: 1.1 },
    { id: 27, nameKo: '민어', nameEn: 'Brown Croaker', category: 'saltwater', rarityWeight: 1.4 },
    { id: 28, nameKo: '돌돔', nameEn: 'Striped Beakfish', category: 'saltwater', rarityWeight: 1.5 },
    { id: 29, nameKo: '범돔', nameEn: 'Goldlined Seabream', category: 'saltwater', rarityWeight: 1.3 },
    { id: 30, nameKo: '볼락', nameEn: 'Nugget Rockfish', category: 'saltwater', rarityWeight: 1.0 },
    { id: 31, nameKo: '도다리', nameEn: 'Cortez Halibut', category: 'saltwater', rarityWeight: 1.1 },
    { id: 32, nameKo: '백조기', nameEn: 'Japanese Whiting', category: 'saltwater', rarityWeight: 1.0 },
    { id: 33, nameKo: '갈치', nameEn: 'Largehead Hairtail', category: 'saltwater', rarityWeight: 1.4 },
    { id: 34, nameKo: '대구', nameEn: 'Pacific Cod', category: 'saltwater', rarityWeight: 1.3 },
    { id: 35, nameKo: '명태', nameEn: 'Alaska Pollock', category: 'saltwater', rarityWeight: 1.0 },
    { id: 36, nameKo: '가자미', nameEn: 'Stone Flounder', category: 'saltwater', rarityWeight: 1.1 },
    { id: 37, nameKo: '학공치', nameEn: 'Skipjack', category: 'saltwater', rarityWeight: 1.2 },
    { id: 38, nameKo: '강준치', nameEn: 'Skygazer', category: 'freshwater', rarityWeight: 1.6 },
    { id: 99, nameKo: '기타', nameEn: 'Other', category: 'freshwater', rarityWeight: 1.0 },
  ];

  for (const s of species) {
    await prisma.fishSpecies.upsert({
      where: { id: s.id },
      update: { category: s.category, rarityWeight: s.rarityWeight },
      create: s,
    });
  }

  // 어종 사전
  const encyclopedia = [
    { fishSpeciesId: 1, description: '북미 원산의 민물 농어. 한국에서는 1973년 도입 후 전국 저수지, 강에 분포. 낚시 스포츠로 인기가 높다.', habitat: '저수지, 댐, 강 중하류', season: '4월~11월 (최성수기 5~6월)', bait: '지그헤드, 스피너베이트, 크랭크베이트, 웜', technique: '루어낚시 (배스피싱)', avgLengthCm: 35, maxLengthCm: 65 },
    { fishSpeciesId: 2, description: '한국 고유 어종. 맑고 빠른 강에 서식하며 "강의 여왕"으로 불린다. 식용으로도 인기.', habitat: '맑은 강 중상류, 계곡', season: '4월~10월', bait: '생새우, 지렁이, 소형 루어', technique: '채비낚시, 루어낚시', avgLengthCm: 30, maxLengthCm: 60 },
    { fishSpeciesId: 3, description: '강력한 포식자로 대형 어종. 공격적인 습성으로 낚시 손맛이 뛰어나다.', habitat: '강, 저수지, 연못', season: '5월~10월', bait: '개구리, 대형 루어, 생미끼', technique: '루어낚시, 생미끼낚시', avgLengthCm: 60, maxLengthCm: 100 },
    { fishSpeciesId: 4, description: '한국인에게 가장 친숙한 민물고기. 전국 어디서나 볼 수 있으며 가족 낚시로 인기.', habitat: '저수지, 강 하류, 연못', season: '연중 (봄/가을 최성수기)', bait: '지렁이, 옥수수, 글루텐', technique: '찌낚시, 대낚시', avgLengthCm: 25, maxLengthCm: 45 },
    { fishSpeciesId: 8, description: '바다낚시의 왕. 붉은 빛깔의 아름다운 외모와 강한 저항으로 인기 어종.', habitat: '수심 30~200m 암초 지대', season: '연중 (봄/가을 최성수기)', bait: '갯지렁이, 새우, 어분 떡밥', technique: '선상낚시, 찌낚시', avgLengthCm: 40, maxLengthCm: 80, minSizeLaw: 24 },
    { fishSpeciesId: 9, description: '넙치라고도 불리며 고급 횟감. AI 측정 정확도가 높아 랭킹 인기 어종.', habitat: '모래 바닥, 수심 10~200m', season: '연중 (겨울 최성수기)', bait: '살아있는 미끼 (활미끼)', technique: '선상낚시, 루어낚시', avgLengthCm: 45, maxLengthCm: 90, minSizeLaw: 35 },
    { fishSpeciesId: 11, description: '"바다의 도미"로 불리는 고급 어종. 낚시인들의 최고 목표 어종 중 하나.', habitat: '암초 주변, 방파제', season: '10월~3월 (겨울 최성수기)', bait: '게, 갯지렁이, 크릴', technique: '찌낚시, 바닥낚시', avgLengthCm: 35, maxLengthCm: 65, minSizeLaw: 25 },
    { fishSpeciesId: 13, description: '대형 어종으로 강력한 파워. 방어 시즌은 낚시인들의 최대 이벤트.', habitat: '외해, 수심 50m 이상', season: '10월~1월', bait: '전갱이, 고등어 (활미끼)', technique: '지깅, 캐스팅, 선상낚시', avgLengthCm: 70, maxLengthCm: 150 },
  ];

  for (const enc of encyclopedia) {
    await prisma.fishEncyclopedia.upsert({
      where: { fishSpeciesId: enc.fishSpeciesId },
      update: enc,
      create: enc,
    });
  }

  // 샘플 대회
  const now = new Date();
  const tournamentSamples = [
    {
      title: '6월 전국 배스 대회',
      description: '전국 낚시인들의 배스 실력을 겨루는 월간 대회입니다. AI 측정 S등급 기록만 인정됩니다.',
      category: 'freshwater',
      fishSpeciesId: 1,
      isFree: false,
      entryFee: 5000,
      prize: '1위 30만원 / 2위 15만원 / 3위 5만원',
      prizeAmount: 500000,
      maxEntries: 200,
      startAt: new Date(now.getFullYear(), now.getMonth(), 1),
      endAt: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      status: 'active',
      rules: '1. AI 측정 S등급 기록만 인정\n2. 동일 어종 최고 기록 1개만 집계\n3. 참가비는 에스크로 결제 (환불 불가)',
    },
    {
      title: '무료 입문자 대회 — 민물 어종',
      description: '낚시를 시작한지 1년 미만 초보자를 위한 무료 대회입니다.',
      category: 'freshwater',
      fishSpeciesId: null,
      isFree: true,
      entryFee: 0,
      prize: '참가 기념품 (상위 10명)',
      prizeAmount: 0,
      maxEntries: 100,
      startAt: new Date(now.getFullYear(), now.getMonth(), 15),
      endAt: new Date(now.getFullYear(), now.getMonth() + 1, 14, 23, 59, 59),
      status: 'active',
      rules: '1. 민물 어종 전체 참가 가능\n2. AI 측정 A등급 이상 인정\n3. 무료 참가',
    },
    {
      title: '여름 바다낚시 챔피언십',
      description: '방어, 참돔, 광어 등 바다 대형 어종 대회. 선상낚시 기록만 인정.',
      category: 'saltwater',
      fishSpeciesId: null,
      isFree: false,
      entryFee: 10000,
      prize: '1위 50만원 / 2위 20만원 / 3위 10만원',
      prizeAmount: 800000,
      maxEntries: 150,
      startAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      endAt: new Date(now.getFullYear(), now.getMonth() + 2, 31, 23, 59, 59),
      status: 'upcoming',
      rules: '1. 바다 어종만 참가 가능\n2. AI 측정 S등급 기록만 인정\n3. 에스크로 결제 필수',
    },
  ];

  for (const t of tournamentSamples) {
    const existing = await prisma.tournament.findFirst({ where: { title: t.title } });
    if (!existing) {
      await prisma.tournament.create({ data: t as any });
    }
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await seedDemoUsers(passwordHash);
  await seedRankingBulk(prisma, passwordHash);

  console.log('✅ 시드 데이터 입력 완료');
}

main().catch(console.error).finally(() => prisma.$disconnect());
