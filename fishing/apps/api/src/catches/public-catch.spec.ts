import { toPublicCatch } from './public-catch';

describe('공개 기록', () => {
  it('대회 코드와 사진 해시, 원본 GPS를 빼지만 검수 상태는 남긴다', () => {
    const row = toPublicCatch({
      id: 'c1',
      claimedDayCode: 'LAKE1',
      imageHash: 'abc',
      perceptualHash: 'ffff',
      exifLat: 37.1,
      exifLng: 127.2,
      dayCodeStatus: 'pending',
      lengthCm: 30,
      user: { nickname: 'angler' },
    });

    expect(row).toEqual({
      id: 'c1',
      dayCodeStatus: 'pending',
      lengthCm: 30,
      user: { nickname: 'angler' },
    });
    expect(JSON.stringify(row)).not.toContain('LAKE1');
    expect(JSON.stringify(row)).not.toContain('ffff');
  });
});
