import { assertGpsSanity, assertWithinSpot, haversineKm, isPlausibleGps } from './image-integrity.util';

describe('GPS 무결성', () => {
  it('범위 밖과 0,0은 좌표로 보지 않는다', () => {
    expect(isPlausibleGps(37.5, 127.0)).toBe(true);
    expect(isPlausibleGps(91, 10)).toBe(false);
    expect(isPlausibleGps(0, 0)).toBe(false);
    expect(isPlausibleGps(Number.NaN, 127)).toBe(false);
  });

  it('서울과 부산은 50km보다 멀다', () => {
    expect(haversineKm(37.5665, 126.978, 35.1796, 129.0756)).toBeGreaterThan(50);
  });

  it('EXIF와 입력 장소가 멀면 거절하고, GPS가 없으면 통과한다', () => {
    const far = assertGpsSanity(37.5665, 126.978, { lat: 35.1796, lng: 129.0756 });
    expect(far.ok).toBe(false);

    const near = assertGpsSanity(37.5665, 126.978, { lat: 37.57, lng: 126.98 });
    expect(near.ok).toBe(true);

    expect(assertGpsSanity(undefined, undefined, { lat: 35, lng: 129 }).ok).toBe(true);
    expect(assertGpsSanity(0, 0).ok).toBe(false);
  });

  it('대회 포인트 반경 밖은 거절하고, GPS가 없으면 확인 불가로 남긴다', () => {
    const spot = { lat: 37.5665, lng: 126.978, radiusKm: 5 };
    expect(assertWithinSpot(37.57, 126.98, spot)).toEqual({ ok: true, unverified: false });
    expect(assertWithinSpot(35.1796, 129.0756, spot).ok).toBe(false);
    expect(assertWithinSpot(undefined, undefined, spot)).toEqual({ ok: true, unverified: true });
    expect(assertWithinSpot(35.1796, 129.0756, null)).toEqual({ ok: true, unverified: false });
  });
});
