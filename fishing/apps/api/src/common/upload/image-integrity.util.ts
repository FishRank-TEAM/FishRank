import { createHash } from 'crypto';
import { readFile, unlink } from 'fs/promises';
import exifr from 'exifr';

/** 인증 업로드 허용 최대 촬영 경과 시간 (시간) */
export const CERTIFIED_MAX_PHOTO_AGE_HOURS = 72;

export async function computeImageHash(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

export async function removeUploadedFile(filePath?: string): Promise<void> {
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch {
    // ignore missing file
  }
}

export type PhotoFreshnessResult =
  | { ok: true; takenAt?: Date; exifMissing?: boolean }
  | { ok: false; reason: string };

/**
 * EXIF 촬영 시각 검증 — 메타데이터가 있으면 maxAgeHours 이내 촬영만 허용.
 * EXIF 없음(카톡·편집 등)은 차단하지 않고 AI·신고로 보완.
 */
export async function validatePhotoFreshness(
  filePath: string,
  maxAgeHours = CERTIFIED_MAX_PHOTO_AGE_HOURS,
): Promise<PhotoFreshnessResult> {
  try {
    const exif = await exifr.parse(filePath, {
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate'],
    });

    const takenRaw =
      exif?.DateTimeOriginal ?? exif?.CreateDate ?? exif?.ModifyDate;

    if (!takenRaw) {
      return { ok: true, exifMissing: true };
    }

    const takenAt = takenRaw instanceof Date ? takenRaw : new Date(takenRaw);
    if (Number.isNaN(takenAt.getTime())) {
      return { ok: true, exifMissing: true };
    }

    const ageMs = Date.now() - takenAt.getTime();
    const maxMs = maxAgeHours * 60 * 60 * 1000;

    if (ageMs > maxMs) {
      return {
        ok: false,
        reason: `촬영 시각이 ${maxAgeHours}시간을 초과한 사진입니다. 최근 촬영한 원본 사진을 올려주세요.`,
      };
    }

    if (ageMs < -5 * 60 * 1000) {
      return {
        ok: false,
        reason: '촬영 시각이 미래로 설정된 사진은 업로드할 수 없습니다.',
      };
    }

    return { ok: true, takenAt };
  } catch {
    return { ok: true, exifMissing: true };
  }
}
