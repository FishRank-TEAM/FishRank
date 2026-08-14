import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  extractKhoaItems,
  fetchPublicDataJson,
  pickRecordField,
  PublicDataAuthError,
} from '../common/public-data-request.util';
import { formatKmaDate, getKstNow } from './kma-grid';

export type SeaFishingIndexRow = {
  placeName: string | null;
  fishName: string | null;
  fishingIndex: number | null;
  fishingIndexLabel: string | null;
  fishingScore: number | null;
  waterTemp: number | null;
  waveHeight: number | null;
  tideLabel: string | null;
  forecastTime: string | null;
  raw: Record<string, unknown>;
};

export type TideForecastPoint = {
  obsCode: string;
  name: string;
  lat: number;
  lng: number;
};

export type TideForecastRow = {
  forecastAt: string | null;
  tideLevelCm: number | null;
  lat: number | null;
  lng: number | null;
  raw: Record<string, unknown>;
};

/** KHOA 조석 예보지점 (대표 해안 — obsCode는 API 명세 샘플·KHOA 지점 기준) */
export const TIDE_FORECAST_POINTS: TideForecastPoint[] = [
  { obsCode: 'DT_0001', name: '인천', lat: 37.451, lng: 126.592 },
  { obsCode: 'DT_0018', name: '부산', lat: 35.096, lng: 129.035 },
  { obsCode: 'DT_0029', name: '여수', lat: 34.747, lng: 127.765 },
  { obsCode: 'DT_0035', name: '목포', lat: 34.779, lng: 126.375 },
  { obsCode: 'DT_0066', name: '속초', lat: 38.207, lng: 128.594 },
  { obsCode: 'DT_0094', name: '제주', lat: 33.527, lng: 126.543 },
];

@Injectable()
export class KhoaPublicClient {
  private readonly logger = new Logger(KhoaPublicClient.name);

  constructor(private config: ConfigService) {}

  private get serviceKey(): string | null {
    return this.config.get<string>('DATA_GO_KR_SERVICE_KEY') ?? null;
  }

  resolveNearestTidePoint(lat: number, lng: number): TideForecastPoint {
    let best = TIDE_FORECAST_POINTS[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const point of TIDE_FORECAST_POINTS) {
      const d = (point.lat - lat) ** 2 + (point.lng - lng) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = point;
      }
    }
    return best;
  }

  async getSeaFishingIndex(options: {
    gubun: '갯바위' | '선상';
    placeName?: string;
    reqDate?: string;
  }): Promise<SeaFishingIndexRow[]> {
    const baseUrl = this.config.get<string>('KHOA_FISHING_INDEX_URL');
    const serviceKey = this.serviceKey;
    if (!baseUrl || !serviceKey) return [];

    const reqDate = options.reqDate ?? formatKmaDate(getKstNow());
    try {
      const payload = await fetchPublicDataJson(baseUrl, serviceKey, {
        type: 'json',
        gubun: options.gubun,
        reqDate,
        numOfRows: 200,
        pageNo: 1,
        ...(options.placeName ? { placeName: options.placeName } : {}),
      });
      return extractKhoaItems(payload).map((item) => this.mapFishingRow(item));
    } catch (err) {
      if (err instanceof PublicDataAuthError) throw err;
      this.logger.warn(`바다낚시지수 조회 실패: ${err}`);
      return [];
    }
  }

  async getTideForecast(options: {
    obsCode: string;
    reqDate?: string;
    intervalMin?: number;
  }): Promise<TideForecastRow[]> {
    const baseUrl = this.config.get<string>('KHOA_TIDE_FCST_URL');
    const serviceKey = this.serviceKey;
    if (!baseUrl || !serviceKey) return [];

    const reqDate = options.reqDate ?? formatKmaDate(getKstNow());
    try {
      const payload = await fetchPublicDataJson(baseUrl, serviceKey, {
        type: 'json',
        obsCode: options.obsCode,
        reqDate,
        min: options.intervalMin ?? 60,
        numOfRows: 300,
        pageNo: 1,
      });
      return extractKhoaItems(payload).map((item) => this.mapTideRow(item));
    } catch (err) {
      if (err instanceof PublicDataAuthError) throw err;
      this.logger.warn(`조석예보 조회 실패 (${options.obsCode}): ${err}`);
      return [];
    }
  }

  private mapFishingRow(item: Record<string, unknown>): SeaFishingIndexRow {
    const indexRaw = pickRecordField(item, [
      'totalIndex',
      'fishingIndex',
      'fishIndex',
      'index',
      '낚시지수',
    ]);
    const scoreRaw = pickRecordField(item, ['fishingScore', 'fishScore', 'score', '낚시점수']);
    const minTemp = pickRecordField(item, ['minWtem', 'waterTemp', 'wt', '수온']);
    const maxTemp = pickRecordField(item, ['maxWtem']);
    const waveMin = pickRecordField(item, ['minWvhgt', 'waveHeight', 'wh', 'wave', '파고']);
    const waveMax = pickRecordField(item, ['maxWvhgt']);

    const waterTemp =
      minTemp != null && maxTemp != null
        ? (Number(minTemp) + Number(maxTemp)) / 2
        : minTemp != null
          ? Number(minTemp)
          : null;
    const waveHeight =
      waveMin != null && waveMax != null
        ? (Number(waveMin) + Number(waveMax)) / 2
        : waveMin != null
          ? Number(waveMin)
          : null;

    return {
      placeName: pickRecordField(item, ['seafsPstnNm', 'placeName', 'spotName', 'place', '포인트명']),
      fishName: pickRecordField(item, ['seafsTgfshNm', 'fishName', 'fish', 'species', '어종']),
      fishingIndex: indexRaw != null && !Number.isNaN(Number(indexRaw)) ? Number(indexRaw) : null,
      fishingIndexLabel:
        indexRaw != null && Number.isNaN(Number(indexRaw)) ? indexRaw : null,
      fishingScore: scoreRaw != null ? Number(scoreRaw) : null,
      waterTemp,
      waveHeight,
      tideLabel: pickRecordField(item, ['tdlvHrCn', 'tide', 'mul', '물때']),
      forecastTime: pickRecordField(item, ['predcYmd', 'fcstTime', 'time', '예보시각']),
      raw: item,
    };
  }

  private mapTideRow(item: Record<string, unknown>): TideForecastRow {
    const levelRaw = pickRecordField(item, ['tdlvHgt', 'tideLevel', 'level', 'tideHeight', '조위']);
    const latRaw = pickRecordField(item, ['lat', 'latitude']);
    const lngRaw = pickRecordField(item, ['lot', 'lng', 'longitude']);

    return {
      forecastAt: pickRecordField(item, ['predcDt', 'fcstTime', 'preTime', 'predictTime', '예측일시']),
      tideLevelCm: levelRaw != null ? Number(levelRaw) : null,
      lat: latRaw != null ? Number(latRaw) : null,
      lng: lngRaw != null ? Number(lngRaw) : null,
      raw: item,
    };
  }
}
