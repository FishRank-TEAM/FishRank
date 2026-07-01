/**
 * 승인된 인증 기록 사진 → ai/data/ruler_catches/{slug}/ 복사
 * YOLO fine-tuning용 줄자+물고기 실사진 데이터셋 구축
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { SPECIES_ID_TO_SLUG } from '../src/ai/species-slug.generated';

const prisma = new PrismaClient();

function slugForSpeciesId(id: number): string | null {
  if (SPECIES_ID_TO_SLUG[id]) return SPECIES_ID_TO_SLUG[id];
  return null;
}

async function main() {
  const aiRoot = path.resolve(__dirname, '..', '..', '..', 'ai');
  const rulerDir = path.join(aiRoot, 'data', 'ruler_catches');
  const uploadsDir = path.resolve(__dirname, '..', 'uploads');

  fs.mkdirSync(rulerDir, { recursive: true });

  const catches = await prisma.catch.findMany({
    where: {
      recordType: 'certified',
      status: 'approved',
      fishSpeciesId: { not: null },
      deletedAt: null,
    },
    select: { id: true, imageUrl: true, fishSpeciesId: true },
  });

  let copied = 0;
  let skipped = 0;

  for (const c of catches) {
    const slug = slugForSpeciesId(c.fishSpeciesId!);
    if (!slug) {
      skipped++;
      continue;
    }

    const filename = path.basename(c.imageUrl);
    const src = path.join(uploadsDir, filename);
    if (!fs.existsSync(src)) {
      skipped++;
      continue;
    }

    const destDir = path.join(rulerDir, slug);
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, `catch-${c.id.slice(0, 8)}.jpg`);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      copied++;
    }
  }

  // 시드 이미지도 ruler_catches에 복사 (bootstrap) — 핵심 38종
  for (const [speciesIdStr, slug] of Object.entries(SPECIES_ID_TO_SLUG)) {
    const speciesId = Number(speciesIdStr);
    if (speciesId > 38) continue;
    const destDir = path.join(rulerDir, slug);
    fs.mkdirSync(destDir, { recursive: true });

    for (const variant of ['', '-v1', '-v2']) {
      const seedName = `seed-${speciesId}${variant}.jpg`;
      const src = path.join(uploadsDir, seedName);
      if (!fs.existsSync(src)) continue;
      const dest = path.join(destDir, `seed${variant || '-0'}.jpg`);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        copied++;
      }
    }
  }

  console.log(`ruler_catches 준비 완료: 복사 ${copied}장, 스킵 ${skipped}건`);
  console.log(`경로: ${rulerDir}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
