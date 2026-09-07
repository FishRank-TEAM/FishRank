/** @deprecated 출조 지도는 API `/weather/fishing-bans` 사용. 폴백용 로컬 목록. */
export type FishingBanZone = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** 표시용 반경(m) */
  radiusM: number;
  reason: string;
};

export const FISHING_BAN_ZONES: FishingBanZone[] = [
  {
    id: 'paldang-water',
    name: '팔당호 상수원보호구역',
    lat: 37.5086,
    lng: 127.2908,
    radiusM: 6000,
    reason: '상수원보호구역 · 물환경보전법',
  },
];

export function banZonesNear(
  center: { lat: number; lng: number },
  maxKm = 80,
): FishingBanZone[] {
  return FISHING_BAN_ZONES.filter((z) => {
    const d = haversineKm(center.lat, center.lng, z.lat, z.lng);
    return d <= maxKm + z.radiusM / 1000;
  });
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
