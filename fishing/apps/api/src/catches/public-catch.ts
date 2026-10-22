const HIDDEN_CATCH_KEYS = [
  'claimedDayCode',
  'imageHash',
  'perceptualHash',
  'exifLat',
  'exifLng',
] as const;

type HiddenCatchKey = (typeof HIDDEN_CATCH_KEYS)[number];

/** 공개·본인 기록 응답에서 대회 코드, 사진 해시, 원본 GPS를 뺀다. */
export function toPublicCatch<T extends object>(row: T): Omit<T, HiddenCatchKey> {
  const copy = { ...row } as Record<string, unknown>;
  for (const key of HIDDEN_CATCH_KEYS) delete copy[key];
  return copy as Omit<T, HiddenCatchKey>;
}

export function toPublicCatches<T extends object>(rows: T[]): Array<Omit<T, HiddenCatchKey>> {
  return rows.map((row) => toPublicCatch(row));
}
