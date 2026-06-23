import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  formatKmaDate,
  getFcstBaseTime,
  getKstNow,
  getNcstBaseTime,
  getVilageBaseTime,
  latLngToGrid,
} from './kma-grid';
import { getFishingCondition, type FishingCondition } from './fishing-condition';
import { getSunMoonInfo, type SunMoonInfo } from './sun-moon';
import { getTideInfo, type TideInfo } from './tide';
import { buildExtendedDays, fill24HourSlots } from './slot-fill';
import {
  formatDateLabel,
  formatHourLabel,
  extractDailyMinMax,
  groupFcstItems,
  itemsToMap,
  parsePrecipitation,
  ptyToLabel,
  skyToLabel,
  windDirectionLabel,
} from './kma-parser';

const KMA_BASE = 'https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0';

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
  hasForecast: boolean;
  isEstimated?: boolean;
  fishingCondition: FishingCondition;
  isCurrent?: boolean;
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

export type WeatherSummary = {
  location: { lat: number; lng: number; nx: number; ny: number; label?: string };
  current: WeatherCurrent;
  days: WeatherDay[];
  fishingCondition: FishingCondition;
  bestTimesToday: { hour: number; hourLabel: string; score: number; label: string }[];
  source: 'kma';
  forecastAvailable: boolean;
  forecastNotice?: string;
};

type SlotDraft = Partial<WeatherSlot> & { time: string; date: string; hour: number };

@Injectable()
export class WeatherService {
  private readonly cache = new Map<string, { data: WeatherSummary; expiresAt: number }>();
  private readonly cacheTtlMs = 3 * 60 * 1000;

  constructor(private config: ConfigService) {}

  private getCachedWeather(nx: number, ny: number): WeatherSummary | null {
    const entry = this.cache.get(`${nx},${ny}`);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.cache.delete(`${nx},${ny}`);
      return null;
    }
    return entry.data;
  }

  private setCachedWeather(nx: number, ny: number, data: WeatherSummary) {
    this.cache.set(`${nx},${ny}`, { data, expiresAt: Date.now() + this.cacheTtlMs });
  }

  async getWeather(lat: number, lng: number, label?: string): Promise<WeatherSummary> {
    const serviceKey = this.config.get<string>('KMA_SERVICE_KEY');
    if (!serviceKey) {
      throw new ServiceUnavailableException(
        'KMA_SERVICE_KEY가 설정되지 않았습니다. 기상청 API허브에서 인증키를 발급받아 apps/api/.env에 추가하세요.',
      );
    }

    const { nx, ny } = latLngToGrid(lat, lng);
    const cached = this.getCachedWeather(nx, ny);
    if (cached) {
      return { ...cached, location: { ...cached.location, lat, lng, label } };
    }

    const ncstBase = getNcstBaseTime();
    const ultraFcstBase = getFcstBaseTime();
    const vilageBase = getVilageBaseTime();

    const [ncstItems, ultraFcstItems, vilageItems] = await Promise.all([
      this.fetchKma('getUltraSrtNcst', serviceKey, { ...ncstBase, nx, ny }),
      this.fetchKmaOptional('getUltraSrtFcst', serviceKey, { ...ultraFcstBase, nx, ny }),
      this.fetchKmaOptional('getVilageFcst', serviceKey, { ...vilageBase, nx, ny }),
    ]);

    const ncst = itemsToMap(ncstItems);
    const ultraFcstGrouped = groupFcstItems(ultraFcstItems);
    const vilageGrouped = groupFcstItems(vilageItems);
    const dailyMinMax = extractDailyMinMax(vilageGrouped);
    const nearestFcst = Object.values(ultraFcstGrouped)[0] ?? {};

    const skyCode = Number(nearestFcst.SKY ?? (Number(ncst.PTY ?? 0) > 0 ? 4 : 1));
    const current: WeatherCurrent = {
      temp: Number(ncst.T1H ?? nearestFcst.T1H ?? 0),
      humidity: Number(ncst.REH ?? nearestFcst.REH ?? 0),
      windSpeed: Number(ncst.WSD ?? 0),
      windDirection: Number(ncst.VEC ?? 0),
      windDirectionLabel: windDirectionLabel(Number(ncst.VEC ?? 0)),
      precipitation: parsePrecipitation(ncst.RN1),
      precipitationType: Number(ncst.PTY ?? 0),
      precipitationLabel: ptyToLabel(Number(ncst.PTY ?? 0)),
      sky: skyCode,
      skyLabel: skyToLabel(skyCode),
      observedAt: `${ncstBase.baseDate} ${ncstBase.baseTime}`,
    };

    const slotMap = new Map<string, SlotDraft>();

    const upsertSlot = (time: string, patch: Partial<SlotDraft>) => {
      const date = time.slice(0, 8);
      const hour = Number(time.slice(8, 10));
      const existing = slotMap.get(time) ?? { time, date, hour };
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      slotMap.set(time, { ...existing, ...clean });
    };

    const observedTime = `${ncstBase.baseDate}${ncstBase.baseTime}`;
    upsertSlot(observedTime, {
      temp: current.temp,
      humidity: current.humidity,
      windSpeed: current.windSpeed,
      windDirection: current.windDirection,
      windDirectionLabel: current.windDirectionLabel,
      precipitation: current.precipitation,
      precipitationProb: null,
      precipitationType: current.precipitationType,
      precipitationLabel: current.precipitationLabel,
      sky: current.sky,
      skyLabel: current.skyLabel,
      wave: null,
      hasForecast: true,
      isCurrent: true,
    });

    for (const [time, values] of Object.entries(ultraFcstGrouped)) {
      const pty = Number(values.PTY ?? 0);
      const sky = Number(values.SKY ?? 1);
      upsertSlot(time, {
        temp: values.T1H != null ? Number(values.T1H) : undefined,
        humidity: values.REH != null ? Number(values.REH) : undefined,
        windSpeed: Number(values.WSD ?? 0),
        windDirection: Number(values.VEC ?? 0),
        windDirectionLabel: windDirectionLabel(Number(values.VEC ?? 0)),
        precipitation: parsePrecipitation(values.RN1),
        precipitationProb: null,
        precipitationType: pty,
        precipitationLabel: ptyToLabel(pty),
        sky,
        skyLabel: skyToLabel(sky),
        wave: null,
        hasForecast: true,
      });
    }

    for (const [time, values] of Object.entries(vilageGrouped)) {
      const pty = Number(values.PTY ?? 0);
      const sky = Number(values.SKY ?? 1);
      upsertSlot(time, {
        temp: values.TMP != null ? Number(values.TMP) : undefined,
        humidity: values.REH != null ? Number(values.REH) : undefined,
        windSpeed: Number(values.WSD ?? 0),
        windDirection: Number(values.VEC ?? 0),
        windDirectionLabel: windDirectionLabel(Number(values.VEC ?? 0)),
        precipitation: values.PCP ? parsePrecipitation(values.PCP) : undefined,
        precipitationProb: values.POP != null ? Number(values.POP) : undefined,
        precipitationType: pty,
        precipitationLabel: ptyToLabel(pty),
        sky,
        skyLabel: skyToLabel(sky),
        wave: values.WAV != null ? Number(values.WAV) : undefined,
        hasForecast: true,
      });
    }

    const slots: WeatherSlot[] = [...slotMap.values()]
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((draft) => this.toSlot(draft));

    const todayDate = ncstBase.baseDate;
    const days = buildExtendedDays(
      this.groupByDay(slots, lat, lng, dailyMinMax, todayDate, current.temp),
      lat,
      lng,
      7,
    );
    const forecastAvailable = ultraFcstItems.length > 0 || vilageItems.length > 0;

    const today = days[0];
    const bestTimesToday = today
      ? [...today.slots]
          .filter((s) => s.hasForecast)
          .sort((a, b) => b.fishingCondition.score - a.fishingCondition.score)
          .slice(0, 3)
          .map((s) => ({
            hour: s.hour,
            hourLabel: s.hourLabel,
            score: s.fishingCondition.score,
            label: s.fishingCondition.label,
          }))
      : [];

    const summary: WeatherSummary = {
      location: { lat, lng, nx, ny, label },
      current,
      days,
      fishingCondition: getFishingCondition(current),
      bestTimesToday,
      source: 'kma',
      forecastAvailable,
      forecastNotice: forecastAvailable
        ? undefined
        : '초단기예보·단기예보 API 활용신청이 필요합니다. API허브에서 동네예보 서비스의 예보 API를 추가 신청해 주세요.',
    };

    this.setCachedWeather(nx, ny, summary);
    return summary;
  }

  private toSlot(draft: SlotDraft): WeatherSlot {
    const temp = draft.temp ?? null;
    const windSpeed = draft.windSpeed ?? 0;
    const precipitation = draft.precipitation ?? 0;
    const precipitationType = draft.precipitationType ?? 0;

    return {
      time: draft.time,
      date: draft.date,
      hour: draft.hour,
      hourLabel: formatHourLabel(draft.hour),
      temp,
      humidity: draft.humidity ?? null,
      windSpeed,
      windDirection: draft.windDirection ?? 0,
      windDirectionLabel: draft.windDirectionLabel ?? windDirectionLabel(draft.windDirection ?? 0),
      precipitation,
      precipitationProb: draft.precipitationProb ?? null,
      precipitationType,
      precipitationLabel: draft.precipitationLabel ?? ptyToLabel(precipitationType),
      sky: draft.sky ?? 1,
      skyLabel: draft.skyLabel ?? skyToLabel(draft.sky ?? 1),
      wave: draft.wave ?? null,
      hasForecast: draft.hasForecast ?? true,
      isEstimated: draft.isEstimated,
      fishingCondition: getFishingCondition({
        temp: temp ?? 15,
        windSpeed,
        precipitation,
        precipitationType,
        precipitationProb: draft.precipitationProb,
      }),
      isCurrent: draft.isCurrent,
    };
  }

  private groupByDay(
    slots: WeatherSlot[],
    lat: number,
    lng: number,
    dailyMinMax: Map<string, { min?: number; max?: number }>,
    todayDate: string,
    currentTemp: number,
  ): WeatherDay[] {
    const dayMap = new Map<string, WeatherSlot[]>();
    for (const slot of slots) {
      if (!dayMap.has(slot.date)) dayMap.set(slot.date, []);
      dayMap.get(slot.date)!.push(slot);
    }

    return [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, daySlots]) => {
        const forecastTemps = daySlots
          .filter((s) => s.hasForecast && s.temp != null)
          .map((s) => s.temp as number);
        const allTemps = daySlots.map((s) => s.temp).filter((t): t is number => t != null);
        const temps = forecastTemps.length > 0 ? forecastTemps : allTemps;
        const daily = dailyMinMax.get(date);
        let minTemp = daily?.min ?? (temps.length ? Math.min(...temps) : null);
        let maxTemp = daily?.max ?? (temps.length ? Math.max(...temps) : null);

        if (date === todayDate) {
          if (temps.length) {
            minTemp = minTemp != null ? Math.min(minTemp, ...temps) : Math.min(...temps);
            maxTemp = maxTemp != null ? Math.max(maxTemp, ...temps) : Math.max(...temps);
          }
          minTemp = minTemp != null ? Math.min(minTemp, currentTemp) : currentTemp;
          maxTemp = maxTemp != null ? Math.max(maxTemp, currentTemp) : currentTemp;
        } else if (daily) {
          minTemp = daily.min ?? minTemp;
          maxTemp = daily.max ?? maxTemp;
        }

        const winds = daySlots.map((s) => s.windSpeed);
        const pops = daySlots.map((s) => s.precipitationProb).filter((p): p is number => p != null);
        const forecastSlots = daySlots.filter((s) => s.hasForecast);
        const scoreSlots = forecastSlots.length > 0 ? forecastSlots : daySlots;
        const best = scoreSlots.reduce(
          (acc, slot) => (slot.fishingCondition.score > acc.score ? { hour: slot.hour, score: slot.fishingCondition.score } : acc),
          { hour: scoreSlots[0]?.hour ?? null, score: scoreSlots[0]?.fishingCondition.score ?? 0 },
        );

        const bestHours = [...scoreSlots]
          .sort((a, b) => b.fishingCondition.score - a.fishingCondition.score)
          .slice(0, 3)
          .map((s) => s.hour);

        return {
          date,
          dateLabel: formatDateLabel(date),
          minTemp,
          maxTemp,
          avgWindSpeed: winds.length ? winds.reduce((a, b) => a + b, 0) / winds.length : 0,
          maxPrecipProb: pops.length ? Math.max(...pops) : null,
          bestHour: best.hour,
          bestScore: best.score,
          bestHours,
          sunMoon: getSunMoonInfo(lat, lng, date),
          tide: getTideInfo(lat, lng, date),
          slots: fill24HourSlots(date, daySlots.sort((a, b) => a.hour - b.hour)),
        };
      });
  }

  private async fetchKmaOptional(
    endpoint: string,
    serviceKey: string,
    params: { baseDate: string; baseTime: string; nx: number; ny: number },
  ): Promise<Array<{ category: string; obsrValue?: string; fcstValue?: string; fcstDate?: string; fcstTime?: string }>> {
    try {
      return await this.fetchKma(endpoint, serviceKey, params);
    } catch {
      return [];
    }
  }

  private async fetchKma(
    endpoint: string,
    serviceKey: string,
    params: { baseDate: string; baseTime: string; nx: number; ny: number },
  ): Promise<Array<{ category: string; obsrValue?: string; fcstValue?: string; fcstDate?: string; fcstTime?: string }>> {
    const query = new URLSearchParams({
      pageNo: '1',
      numOfRows: '1000',
      dataType: 'JSON',
      base_date: params.baseDate,
      base_time: params.baseTime,
      nx: String(params.nx),
      ny: String(params.ny),
    });

    const url = `${KMA_BASE}/${endpoint}?authKey=${serviceKey}&${query.toString()}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data?.result?.message ?? data?.response?.header?.resultMsg ?? `HTTP ${res.status}`;
      throw new ServiceUnavailableException(`기상청 API 호출 실패 (${endpoint}): ${msg}`);
    }

    const resultCode = data?.response?.header?.resultCode;

    if (resultCode !== '00') {
      const msg = data?.response?.header?.resultMsg ?? '알 수 없는 오류';
      throw new ServiceUnavailableException(`기상청 API 오류: ${msg}`);
    }

    return data?.response?.body?.items?.item ?? [];
  }
}
