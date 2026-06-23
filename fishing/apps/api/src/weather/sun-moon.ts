/** 일출·일몰·월령 계산 (KST 기준) */

const DEG = Math.PI / 180;
const KST_OFFSET = 9 * 60; // minutes

function toKstDate(utcHours: number, baseDate: Date): string {
  const totalMin = utcHours * 60 + KST_OFFSET;
  const h = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
  const m = Math.floor(((totalMin % 60) + 60) % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function julianDay(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate() + date.getHours() / 24;
  const A = Math.floor((14 - m) / 12);
  const yy = y + 4800 - A;
  const mm = m + 12 * A - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function solarNoonUTC(jd: number, lng: number): number {
  const n = jd - 2451545.0 + 0.0008;
  const J = n - lng / 360;
  const M = (357.5291 + 0.98560028 * J) % 360;
  const C = 1.9148 * Math.sin(M * DEG) + 0.02 * Math.sin(2 * M * DEG) + 0.0003 * Math.sin(3 * M * DEG);
  const L = (M + C + 180 + 102.9372) % 360;
  const Jtransit = 2451545.0 + J + 0.0053 * Math.sin(M * DEG) - 0.0069 * Math.sin(2 * L * DEG);
  return (Jtransit - 2451545.0) * 24;
}

function hourAngleUTC(lat: number, elevation: number): number {
  const phi = lat * DEG;
  const delta = -0.833 * DEG;
  const cosH = (Math.sin(elevation * DEG) - Math.sin(phi) * Math.sin(delta)) / (Math.cos(phi) * Math.cos(delta));
  if (cosH > 1 || cosH < -1) return NaN;
  return Math.acos(cosH) / DEG / 15;
}

export type SunMoonInfo = {
  date: string;
  sunrise: string;
  sunset: string;
  dayLengthMin: number;
  moonPhase: string;
  moonPhaseEmoji: string;
  lunarDay: number;
  lunarLabel: string;
};

export function getSunMoonInfo(lat: number, lng: number, dateStr: string): SunMoonInfo {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(4, 6));
  const d = Number(dateStr.slice(6, 8));
  const date = new Date(y, m - 1, d, 12, 0, 0);

  const jd = julianDay(date);
  const noon = solarNoonUTC(jd, lng);
  const ha = hourAngleUTC(lat, -0.833);

  const sunrise = Number.isNaN(ha) ? '--:--' : toKstDate(noon - ha, date);
  const sunset = Number.isNaN(ha) ? '--:--' : toKstDate(noon + ha, date);

  const [sh, sm] = sunrise.split(':').map(Number);
  const [eh, em] = sunset.split(':').map(Number);
  const dayLengthMin = Number.isNaN(ha) ? 0 : (eh * 60 + em) - (sh * 60 + sm);

  const lunar = getLunarInfo(date);

  return {
    date: dateStr,
    sunrise,
    sunset,
    dayLengthMin,
    moonPhase: lunar.phaseLabel,
    moonPhaseEmoji: lunar.phaseEmoji,
    lunarDay: lunar.lunarDay,
    lunarLabel: lunar.lunarLabel,
  };
}

function getLunarInfo(date: Date) {
  // 2000-01-06 신월 기준 근사 음력일
  const ref = new Date(2000, 0, 6).getTime();
  const synodic = 29.530588853;
  const days = (date.getTime() - ref) / (1000 * 60 * 60 * 24);
  const age = ((days % synodic) + synodic) % synodic;
  const lunarDay = Math.min(30, Math.max(1, Math.floor(age) + 1));
  const mul = lunarDay <= 15 ? lunarDay : 30 - lunarDay + 1;

  let phaseLabel = '초승달';
  let phaseEmoji = '🌒';
  if (age < 1.5) { phaseLabel = '삭'; phaseEmoji = '🌑'; }
  else if (age < 7) { phaseLabel = '상현달'; phaseEmoji = '🌓'; }
  else if (age < 14) { phaseLabel = '보름달'; phaseEmoji = '🌕'; }
  else if (age < 22) { phaseLabel = '하현달'; phaseEmoji = '🌗'; }
  else { phaseLabel = '그믐달'; phaseEmoji = '🌘'; }

  return {
    lunarDay,
    lunarLabel: `${mul}물`,
    phaseLabel,
    phaseEmoji,
    age,
  };
}
