/** 소프트 삭제 후에도 같은 사진을 다시 올릴 수 있게 정확 해시와 지각 해시를 비운다. */
export function softDeleteCatchData(now = new Date()): {
  deletedAt: Date;
  imageHash: null;
  perceptualHash: null;
} {
  return { deletedAt: now, imageHash: null, perceptualHash: null };
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}
