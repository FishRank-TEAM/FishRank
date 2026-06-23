export type FishingCondition = {
  label: string;
  color: string;
  desc: string;
  score: number;
};

export type WeatherCurrent = {
  temp: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windDirectionLabel: string;
  precipitation: number;
  precipitationType: number;
  precipitationLabel: string;
  sky: number;
  skyLabel: string;
  observedAt: string;
};

export type WeatherSlot = {
  time: string;
  date: string;
  hour: number;
  hourLabel: string;
  temp: number | null;
  humidity: number | null;
  windSpeed: number;
  windDirection: number;
  windDirectionLabel: string;
  precipitation: number;
  precipitationProb: number | null;
  precipitationType: number;
  precipitationLabel: string;
  sky: number;
  skyLabel: string;
  wave: number | null;
  hasForecast?: boolean;
  isEstimated?: boolean;
  fishingCondition: FishingCondition;
  isCurrent?: boolean;
};

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

export type WeatherDay = {
  date: string;
  dateLabel: string;
  minTemp: number | null;
  maxTemp: number | null;
  avgWindSpeed: number;
  maxPrecipProb: number | null;
  bestHour: number | null;
  bestScore: number;
  bestHours: number[];
  sunMoon: SunMoonInfo;
  tide: TideInfo;
  slots: WeatherSlot[];
};

export type WeatherLocation = {
  lat: number;
  lng: number;
  label: string;
};

export type PlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  source: 'preset' | 'kakao';
};

export type WeatherData = {
  location: { lat: number; lng: number; nx: number; ny: number; label?: string };
  current: WeatherCurrent;
  days: WeatherDay[];
  fishingCondition: FishingCondition;
  bestTimesToday: { hour: number; hourLabel: string; score: number; label: string }[];
  source: 'kma';
  forecastAvailable: boolean;
  forecastNotice?: string;
};

export function skyEmoji(sky: number, pty: number): string {
  if ([1, 2, 3, 4].includes(pty)) return '🌧️';
  if (sky === 1) return '☀️';
  if (sky === 3) return '⛅';
  return '☁️';
}

export function fishingStars(score: number): string {
  return '★'.repeat(score) + '☆'.repeat(5 - score);
}

export function isToday(date: string): boolean {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return date === today;
}

export function dayTabLabel(day: WeatherDay): string {
  if (isToday(day.date)) return '오늘';
  return day.dateLabel;
}

export function formatDayLength(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}시간 ${m}분`;
}
