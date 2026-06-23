import { getSunMoonInfo } from './sun-moon';

export type TideEvent = {
  time: string;
  type: 'high' | 'low';
  label: string;
};

export type TideInfo = {
  date: string;
  lunarLabel: string;
  lunarDay: number;
  tideStrength: string;
  tideDesc: string;
  events: TideEvent[];
  fishingTip: string;
};

/** 음력 물때 기반 조석 정보 (근사치 — 해안 관측소 API 없을 때) */
export function getTideInfo(lat: number, lng: number, dateStr: string): TideInfo {
  const sunMoon = getSunMoonInfo(lat, lng, dateStr);
  const mul = sunMoon.lunarDay <= 15 ? sunMoon.lunarDay : 30 - sunMoon.lunarDay + 1;

  let tideStrength = '중간물';
  let tideDesc = '밀물·썰물 변화가 보통입니다.';
  let fishingTip = '물때 변화 전후 2시간이 조황에 유리한 경우가 많습니다.';

  if (mul <= 3 || mul >= 13) {
    tideStrength = '조금';
    tideDesc = '조석 변화가 작습니다. 갯바위·선상 모두 접근이 비교적 수월합니다.';
    fishingTip = '조금 때는 수심이 얕아 연안 포인트 위주로 공략하세요.';
  } else if (mul >= 7 && mul <= 9) {
    tideStrength = '사리/만조';
    tideDesc = '밀물·썰물 차이가 큽니다. 갯바위 안전에 특히 주의하세요.';
    fishingTip = '7~9물은 만조 전후 조황이 좋다는 경험이 많습니다. 안전거리 확보 필수.';
  } else if (mul >= 10 && mul <= 12) {
    tideStrength = '강한 썰물';
    tideDesc = '썰물 시 수심이 빠르게 얕아집니다.';
    fishingTip = '썰물 때는 서서히 물이 빠지는 구간에서 먹이 활동이 활발해질 수 있습니다.';
  }

  const events = estimateTideEvents(dateStr, lng, mul);

  return {
    date: dateStr,
    lunarLabel: sunMoon.lunarLabel,
    lunarDay: mul,
    tideStrength,
    tideDesc,
    events,
    fishingTip,
  };
}

function estimateTideEvents(dateStr: string, lng: number, mul: number): TideEvent[] {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(4, 6));
  const d = Number(dateStr.slice(6, 8));
  const base = new Date(y, m - 1, d, 0, 0, 0);

  // 경도 기반 조석 지연 (분) + 물때에 따른 간격 조정
  const lngDelayMin = Math.round((lng - 126) * 4);
  const intervalHours = mul >= 7 && mul <= 9 ? 6.1 : 6.2;

  const firstHighHour = (2.5 + lngDelayMin / 60 + (mul % 3) * 0.4) % 24;

  const events: TideEvent[] = [];
  for (let i = 0; i < 4; i++) {
    const hour = (firstHighHour + i * intervalHours) % 24;
    const isHigh = i % 2 === 0;
    const h = Math.floor(hour);
    const min = Math.round((hour - h) * 60);
    events.push({
      time: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
      type: isHigh ? 'high' : 'low',
      label: isHigh ? '만조' : '간조',
    });
  }

  events.sort((a, b) => a.time.localeCompare(b.time));
  return events;
}
