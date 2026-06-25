import { PrismaClient } from '@prisma/client';
import { seedImagePath, variantCount } from './seed-fish-images';

/** 랭킹 UI에서 사용하는 6개 어종 (fish_species.id) */
export const RANKING_SPECIES_IDS = [1, 2, 3, 8, 9, 10] as const;

const CERTIFIED_PER_SPECIES = 120;
const PERSONAL_PER_SPECIES = 30;
export const BULK_USER_COUNT = 150;

const SPECIES_NAMES: Record<number, string> = {
  1: '배스',
  2: '쏘가리',
  3: '가물치',
  8: '참돔',
  9: '광어',
  10: '우럭',
};
const NICK_SUFFIX = ['왕', '고수', '마스터', '헌터', '킹', '조사', '러', '맨', '프로', '캡틴'];

const SPOTS = [
  { name: '춘천 소양강', region: '강원 춘천', lat: 37.881, lng: 127.729 },
  { name: '춘천 의암호', region: '강원 춘천', lat: 37.865, lng: 127.752 },
  { name: '홍천강', region: '강원 홍천', lat: 37.697, lng: 127.875 },
  { name: '여수 돌산', region: '전남 여수', lat: 34.736, lng: 127.744 },
  { name: '여수 화정', region: '전남 여수', lat: 34.712, lng: 127.801 },
  { name: '거제 외포', region: '경남 거제', lat: 34.843, lng: 128.652 },
  { name: '거제 지세포', region: '경남 거제', lat: 34.889, lng: 128.701 },
  { name: '통영 욕지도', region: '경남 통영', lat: 34.833, lng: 128.417 },
  { name: '제주 한림', region: '제주 제주', lat: 33.414, lng: 126.261 },
  { name: '제주 애월', region: '제주 제주', lat: 33.462, lng: 126.308 },
  { name: '제주 화순', region: '제주 제주', lat: 33.323, lng: 126.671 },
  { name: '서울 양화', region: '서울 양천', lat: 37.556, lng: 126.896 },
  { name: '서울 뚝섬', region: '서울 강서', lat: 37.517, lng: 126.941 },
  { name: '파주 임진', region: '경기 파주', lat: 37.912, lng: 126.783 },
  { name: '부산 기장', region: '부산 기장', lat: 35.244, lng: 129.222 },
  { name: '인천 영종', region: '인천 옹진', lat: 37.491, lng: 126.493 },
  { name: '포항 구룡포', region: '경북 포항', lat: 36.05, lng: 129.55 },
  { name: '속초 청초', region: '강원 속초', lat: 38.207, lng: 128.591 },
  { name: '안동 임하', region: '경북 안동', lat: 36.568, lng: 128.729 },
  { name: '목포 해변', region: '전남 목포', lat: 34.779, lng: 126.381 },
] as const;

type SpeciesMeta = {
  id: number;
  minCm: number;
  maxCm: number;
  category: 'freshwater' | 'saltwater';
};

const SPECIES_META: Record<number, SpeciesMeta> = {
  1: { id: 1, minCm: 28, maxCm: 64, category: 'freshwater' },
  2: { id: 2, minCm: 22, maxCm: 58, category: 'freshwater' },
  3: { id: 3, minCm: 48, maxCm: 92, category: 'freshwater' },
  8: { id: 8, minCm: 38, maxCm: 76, category: 'saltwater' },
  9: { id: 9, minCm: 42, maxCm: 82, category: 'saltwater' },
  10: { id: 10, minCm: 32, maxCm: 52, category: 'saltwater' },
};

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bulkUserId(n: number): string {
  return `a2000000-0001-4000-8000-${String(n).padStart(12, '0')}`;
}

function bulkCatchId(speciesId: number, seq: number, personal: boolean): string {
  const kind = personal ? 'd' : 'c';
  const head = `${kind}2${String(speciesId).padStart(6, '0')}`;
  return `${head}-0001-4000-8000-${String(seq).padStart(12, '0')}`;
}

function nickname(i: number): string {
  const speciesId = RANKING_SPECIES_IDS[i % RANKING_SPECIES_IDS.length];
  const name = SPECIES_NAMES[speciesId];
  const tier = Math.floor(i / RANKING_SPECIES_IDS.length);
  const suffix = NICK_SUFFIX[tier % NICK_SUFFIX.length];
  return `${name}${suffix}${tier + 1}`;
}

function daysAgo(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, (n * 7) % 60, 0, 0);
  return d;
}

function gradeForLength(lengthCm: number, min: number, max: number): 'S' | 'A' | 'B' {
  const p = (lengthCm - min) / (max - min);
  if (p >= 0.82) return 'S';
  if (p >= 0.52) return 'A';
  return 'B';
}

function calcRankScore(
  lengthCm: number,
  speciesId: number,
  species: { id: number; rarityWeight: unknown }[],
): number {
  const sp = species.find((s) => s.id === speciesId);
  const weight = sp ? Number(sp.rarityWeight) : 1;
  return Math.round(lengthCm * weight * 100) / 100;
}

function lengthForSpecies(speciesId: number, seq: number, rand: () => number): number {
  const meta = SPECIES_META[speciesId];
  const spread = meta.maxCm - meta.minCm;
  const bias = 1 - (seq - 1) / CERTIFIED_PER_SPECIES;
  const base = meta.minCm + spread * (0.25 + rand() * 0.55) * (0.55 + bias * 0.45);
  return Math.round(base * 10) / 10;
}

async function clearBulkData(prisma: PrismaClient) {
  const bulkCatchIds = RANKING_SPECIES_IDS.flatMap((speciesId) => [
    ...Array.from({ length: CERTIFIED_PER_SPECIES }, (_, i) => bulkCatchId(speciesId, i + 1, false)),
    ...Array.from({ length: PERSONAL_PER_SPECIES }, (_, i) => bulkCatchId(speciesId, i + 1, true)),
  ]);

  await prisma.catchVote.deleteMany({ where: { catchId: { in: bulkCatchIds } } });
  await prisma.certification.deleteMany({ where: { catchId: { in: bulkCatchIds } } });
  await prisma.catch.deleteMany({ where: { id: { in: bulkCatchIds } } });

  const bulkUserIds = Array.from({ length: BULK_USER_COUNT }, (_, i) => bulkUserId(i + 1));
  await prisma.catchVote.deleteMany({ where: { userId: { in: bulkUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: bulkUserIds } } });
}

async function createManyBatched<T>(
  items: T[],
  batchSize: number,
  insert: (batch: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < items.length; i += batchSize) {
    await insert(items.slice(i, i + batchSize));
  }
}

export async function seedRankingBulk(prisma: PrismaClient, passwordHash: string) {
  const allSpecies = await prisma.fishSpecies.findMany();
  const rand = mulberry32(20260619);
  const userIds = Array.from({ length: BULK_USER_COUNT }, (_, i) => bulkUserId(i + 1));

  console.log('\n🎣 랭킹 벌크 시드 (%d명 · 어종당 인증 %d + 자랑 %d)...',
    BULK_USER_COUNT,
    CERTIFIED_PER_SPECIES,
    PERSONAL_PER_SPECIES,
  );

  await clearBulkData(prisma);

  const userRows = userIds.map((id, i) => {
    const n = i + 1;
    const spot = SPOTS[i % SPOTS.length];
    const meta = SPECIES_META[RANKING_SPECIES_IDS[i % RANKING_SPECIES_IDS.length]];
    return {
      id,
      email: `angler${n}@fishrank.demo`,
      nickname: nickname(i),
      passwordHash,
      activityRegion: spot.region,
      fishingCategory: meta.category,
    };
  });

  await createManyBatched(userRows, 100, (batch) => prisma.user.createMany({ data: batch }));

  type CatchDef = {
    id: string;
    userId: string;
    fishSpeciesId: number;
    lengthCm: number;
    locationName: string;
    locationLat: number;
    locationLng: number;
    recordType: 'certified' | 'personal';
    grade?: 'S' | 'A' | 'B';
    imageVariant: number;
    createdAt: Date;
  };

  const catchDefs: CatchDef[] = [];

  for (const speciesId of RANKING_SPECIES_IDS) {
    const meta = SPECIES_META[speciesId];

    for (let seq = 1; seq <= CERTIFIED_PER_SPECIES; seq++) {
      const spot = SPOTS[(speciesId * 7 + seq) % SPOTS.length];
      const userId = userIds[(speciesId * 13 + seq * 3) % BULK_USER_COUNT];
      const lengthCm = lengthForSpecies(speciesId, seq, rand);
      const days = seq <= 72 ? Math.floor(rand() * 6) : Math.floor(rand() * 180) + 7;

      catchDefs.push({
        id: bulkCatchId(speciesId, seq, false),
        userId,
        fishSpeciesId: speciesId,
        lengthCm,
        locationName: spot.name,
        locationLat: spot.lat + (rand() - 0.5) * 0.02,
        locationLng: spot.lng + (rand() - 0.5) * 0.02,
        recordType: 'certified',
        grade: gradeForLength(lengthCm, meta.minCm, meta.maxCm),
        imageVariant: (seq - 1) % variantCount(speciesId),
        createdAt: daysAgo(days, 8 + (seq % 10)),
      });
    }

    for (let seq = 1; seq <= PERSONAL_PER_SPECIES; seq++) {
      const spot = SPOTS[(speciesId * 11 + seq * 5) % SPOTS.length];
      const userId = userIds[(speciesId * 17 + seq * 5) % BULK_USER_COUNT];
      const lengthCm =
        Math.round((meta.minCm + (meta.maxCm - meta.minCm) * (0.2 + rand() * 0.65)) * 10) / 10;
      const days = seq <= 12 ? Math.floor(rand() * 5) : Math.floor(rand() * 90) + 10;

      catchDefs.push({
        id: bulkCatchId(speciesId, seq, true),
        userId,
        fishSpeciesId: speciesId,
        lengthCm,
        locationName: spot.name,
        locationLat: spot.lat + (rand() - 0.5) * 0.015,
        locationLng: spot.lng + (rand() - 0.5) * 0.015,
        recordType: 'personal',
        imageVariant: (seq - 1) % variantCount(speciesId),
        createdAt: daysAgo(days, 14 + (seq % 8)),
      });
    }
  }

  const catchRows = catchDefs.map((c) => {
    const rankScore =
      c.recordType === 'certified'
        ? calcRankScore(c.lengthCm, c.fishSpeciesId, allSpecies)
        : null;

    return {
      id: c.id,
      userId: c.userId,
      fishSpeciesId: c.fishSpeciesId,
      imageUrl: seedImagePath(c.fishSpeciesId, c.imageVariant),
      lengthCm: c.lengthCm,
      aiLengthCm: c.lengthCm,
      aiConfidence: c.recordType === 'certified' ? 0.9 + rand() * 0.08 : null,
      rankScore,
      locationName: c.locationName,
      locationLat: c.locationLat,
      locationLng: c.locationLng,
      recordType: c.recordType,
      status: 'approved' as const,
      createdAt: c.createdAt,
    };
  });

  await createManyBatched(catchRows, 200, (batch) => prisma.catch.createMany({ data: batch }));

  const certRows = catchDefs
    .filter((c) => c.recordType === 'certified' && c.grade)
    .map((c) => ({
      catchId: c.id,
      grade: c.grade!,
      rulerDetected: true,
      ruleFlat: true,
      ruleVertical: true,
      ruleRuler: true,
      ruleFullBody: true,
      processedAt: c.createdAt,
    }));

  await createManyBatched(certRows, 200, (batch) =>
    prisma.certification.createMany({ data: batch }),
  );

  const voteCreates: { catchId: string; userId: string }[] = [];
  for (const c of catchDefs.filter((x) => x.recordType === 'personal')) {
    const voterCount = 3 + Math.floor(rand() * 15);
    const used = new Set<string>();
    for (let v = 0; v < voterCount; v++) {
      let voterId = userIds[Math.floor(rand() * BULK_USER_COUNT)];
      while (voterId === c.userId || used.has(voterId)) {
        voterId = userIds[Math.floor(rand() * BULK_USER_COUNT)];
      }
      used.add(voterId);
      voteCreates.push({ catchId: c.id, userId: voterId });
    }
  }

  await createManyBatched(voteCreates, 500, (batch) =>
    prisma.catchVote.createMany({ data: batch }),
  );

  const certified = catchDefs.filter((c) => c.recordType === 'certified').length;
  const personal = catchDefs.filter((c) => c.recordType === 'personal').length;

  console.log('   ✅ 유저 %d명 · 인증 %d건 · 자랑 %d건 · 추천 %d건',
    BULK_USER_COUNT,
    certified,
    personal,
    voteCreates.length,
  );
  for (const sid of RANKING_SPECIES_IDS) {
    const c = catchDefs.filter((x) => x.fishSpeciesId === sid && x.recordType === 'certified').length;
    const p = catchDefs.filter((x) => x.fishSpeciesId === sid && x.recordType === 'personal').length;
    console.log('      · 어종 %d — 인증 %d / 자랑 %d', sid, c, p);
  }
  console.log('   📧 벌크 계정: angler1@fishrank.demo ~ angler%d@fishrank.demo (비밀번호 동일)\n', BULK_USER_COUNT);
}
