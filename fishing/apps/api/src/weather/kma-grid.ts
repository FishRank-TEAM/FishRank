/** 위·경도 → 기상청 격자(nx, ny) 변환 (LCC DFS) */
export function latLngToGrid(lat: number, lng: number): { nx: number; ny: number } {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;
  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn =
    Math.log(Math.cos(slat1) / Math.cos(slat2)) /
    Math.log(Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5));
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}

export function getKstNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

export function formatKmaDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** 초단기실황 — 매시 정각 발표, 10분 이후 조회 가능 */
export function getNcstBaseTime(now = getKstNow()): { baseDate: string; baseTime: string } {
  const date = new Date(now);
  let hour = now.getHours();

  if (now.getMinutes() < 10) {
    hour -= 1;
    if (hour < 0) {
      hour = 23;
      date.setDate(date.getDate() - 1);
    }
  }

  return {
    baseDate: formatKmaDate(date),
    baseTime: `${String(hour).padStart(2, '0')}00`,
  };
}

/** 초단기예보 — 매시 30분 발표, 45분 이후 조회 권장 */
export function getFcstBaseTime(now = getKstNow()): { baseDate: string; baseTime: string } {
  const date = new Date(now);
  const minute = now.getMinutes();
  let hour = now.getHours();

  if (minute < 45) {
    hour -= 1;
    if (hour < 0) {
      hour = 23;
      date.setDate(date.getDate() - 1);
    }
  }

  return {
    baseDate: formatKmaDate(date),
    baseTime: `${String(hour).padStart(2, '0')}30`,
  };
}

/** 단기예보 — 02, 05, 08, 11, 14, 17, 20, 23시 발표 */
export function getVilageBaseTime(now = getKstNow()): { baseDate: string; baseTime: string } {
  const announceHours = [23, 20, 17, 14, 11, 8, 5, 2];
  const date = new Date(now);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  for (const h of announceHours) {
    if (currentHour > h || (currentHour === h && currentMinute >= 10)) {
      return {
        baseDate: formatKmaDate(date),
        baseTime: `${String(h).padStart(2, '0')}00`,
      };
    }
  }

  date.setDate(date.getDate() - 1);
  return { baseDate: formatKmaDate(date), baseTime: '2300' };
}
