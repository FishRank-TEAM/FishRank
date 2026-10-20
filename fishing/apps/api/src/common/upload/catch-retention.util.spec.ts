import { isUniqueConstraintError, softDeleteCatchData } from './catch-retention.util';

describe('catch retention', () => {
  it('삭제 시 촬영 시각과 함께 이미지 해시를 비운다', () => {
    const now = new Date('2026-10-19T00:00:00.000Z');
    expect(softDeleteCatchData(now)).toEqual({
      deletedAt: now,
      imageHash: null,
      perceptualHash: null,
    });
  });

  it('Prisma P2002 만 중복 사진으로 본다', () => {
    expect(isUniqueConstraintError({ code: 'P2002' })).toBe(true);
    expect(isUniqueConstraintError({ code: 'P2003' })).toBe(false);
    expect(isUniqueConstraintError(new Error('nope'))).toBe(false);
  });
});
