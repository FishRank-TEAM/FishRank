import * as fs from 'fs';
import * as path from 'path';

/** seed.ts 어종 ID (fish-species-catalog 와 동기화) */
export const SEED_SPECIES_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 99,
] as const;

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/** 업로드 경로 (variant 0 = 기본, 1+ = 추가 사진) */
export function seedImagePath(speciesId: number, variant = 0): string {
  if (variant <= 0) return `/uploads/seed-${speciesId}.jpg`;
  return `/uploads/seed-${speciesId}-v${variant}.jpg`;
}

function seedFileName(speciesId: number, variant: number): string {
  if (variant <= 0) return `seed-${speciesId}.jpg`;
  return `seed-${speciesId}-v${variant}.jpg`;
}

/** 디스크에 저장된 variant 수 (다운로드 후 랭킹 다양성용) */
export function variantCount(speciesId: number): number {
  let count = 0;
  for (let v = 0; v <= 5; v++) {
    const file = path.join(UPLOADS_DIR, seedFileName(speciesId, v));
    if (fs.existsSync(file) && fs.statSync(file).size > 4_000) count++;
    else if (v > 0) break;
  }
  return Math.max(count, 1);
}

export function uploadsDir(): string {
  return UPLOADS_DIR;
}
