import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PublicDataAuthError } from '../common/public-data-request.util';
import { GeocodeService } from './geocode.service';
import { KhoaPublicClient, TIDE_FORECAST_POINTS } from './khoa-public.client';
import { ReservoirPublicClient, type ReservoirCode } from './reservoir-public.client';

export type ReservoirAreaRow = {
  facCode: string;
  facName: string;
  county: string | null;
  ratePercent: number | null;
  waterLevelM: number | null;
  checkDate: string | null;
  lat: number;
  lng: number;
  geocoded: boolean;
};

const RESERVOIR_LIST_LIMIT = 50;
const RESERVOIR_MAP_ENRICH_LIMIT = 8;
const RESERVOIR_AREA_DEADLINE_MS = 2000;

@Injectable()
export class MarineConditionsService {
  constructor(
    private khoa: KhoaPublicClient,
    private reservoir: ReservoirPublicClient,
    private geocode: GeocodeService,
  ) {}

  async getFishingIndex(options: {
    gubun?: '갯바위' | '선상';
    placeName?: string;
    lat?: number;
    lng?: number;
    reqDate?: string;
  }) {
    const gubun = options.gubun ?? '갯바위';
    const reqDate = options.reqDate;

    try {
      let rows = options.placeName
        ? await this.khoa.getSeaFishingIndex({ gubun, placeName: options.placeName, reqDate })
        : [];

      if (!rows.length) {
        rows = await this.khoa.getSeaFishingIndex({ gubun, reqDate });
      }

      if (options.lat != null && options.lng != null && rows.length > 1) {
        rows = this.sortFishingByDistance(rows, options.lat, options.lng).slice(0, 30);
      }

      rows = this.dedupeFishingRows(rows);

      return {
        source: 'KHOA 바다낚시지수 (data.go.kr 15142486)',
        gubun,
        placeName: rows[0]?.placeName ?? options.placeName ?? null,
        rows,
      };
    } catch (err) {
      if (err instanceof PublicDataAuthError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }

  async getTideForecast(options: {
    lat?: number;
    lng?: number;
    obsCode?: string;
    reqDate?: string;
  }) {
    const point =
      options.obsCode != null
        ? (TIDE_FORECAST_POINTS.find((p) => p.obsCode === options.obsCode) ?? null)
        : options.lat != null && options.lng != null
          ? this.khoa.resolveNearestTidePoint(options.lat, options.lng)
          : TIDE_FORECAST_POINTS[1];

    if (!point) {
      throw new ServiceUnavailableException('조석 예보지점을 찾을 수 없습니다.');
    }

    try {
      let rows = await this.khoa.getTideForecast({
        obsCode: point.obsCode,
        reqDate: options.reqDate,
      });
      rows = this.filterTideRowsForPoint(rows, point);
      return {
        source: 'KHOA 조석예보 시계열 (data.go.kr 15156022)',
        point,
        rows,
      };
    } catch (err) {
      if (err instanceof PublicDataAuthError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }

  async searchReservoirs(query: string) {
    try {
      const rows = await this.reservoir.searchReservoirs(query);
      return {
        source: 'KRC 농촌용수 저수지 (data.go.kr 15099919)',
        rows,
      };
    } catch (err) {
      if (err instanceof PublicDataAuthError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }

  async getReservoirsInArea(lat: number, lng: number, queryOverride?: string) {
    const search = await this.resolveReservoirSearch(lat, lng, queryOverride);

    try {
      const deadline = Date.now() + RESERVOIR_AREA_DEADLINE_MS;
      const codes = await this.withTimeout(
        this.searchReservoirCandidates(search),
        900,
        [],
      );
      const candidates = this.rankReservoirCandidates(codes, search.nameHint, search.regionHint)
        .slice(0, RESERVOIR_LIST_LIMIT);
      const enriched = await this.buildReservoirAreaRows(
        candidates.slice(0, RESERVOIR_MAP_ENRICH_LIMIT),
        deadline,
      );
      const enrichedMap = new Map(enriched.map((row) => [row.facCode, row]));
      const rows = candidates.map(
        (code) => enrichedMap.get(code.facCode) ?? this.stubReservoirRow(code),
      );
      return {
        source: 'KRC 농촌용수 저수지 (data.go.kr 15099919)',
        spot: search.spotLabel,
        searchQuery: search.query,
        center: { lat, lng },
        totalCount: candidates.length,
        rows,
      };
    } catch (err) {
      if (err instanceof PublicDataAuthError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }

  async getReservoirNearby(lat: number, lng: number, queryOverride?: string) {
    const search = await this.resolveReservoirSearch(lat, lng, queryOverride);

    try {
      const codes = await this.searchReservoirCandidates(search);
      const candidates = this.rankReservoirCandidates(codes, search.nameHint, search.regionHint);
      for (const candidate of candidates.slice(0, 6)) {
        const levels = await this.reservoir.getWaterLevels({ facCode: candidate.facCode });
        const latest = levels.at(-1);
        if (latest) {
          return {
            source: 'KRC 농촌용수 저수지 (data.go.kr 15099919)',
            spot: search.spotLabel,
            reservoir: latest,
          };
        }
      }

      const fallback = candidates[0];
      return {
        source: 'KRC 농촌용수 저수지 (data.go.kr 15099919)',
        spot: search.spotLabel,
        reservoir: fallback
          ? {
              facCode: fallback.facCode,
              facName: fallback.facName,
              county: fallback.county,
              checkDate: '',
              waterLevelM: null,
              ratePercent: null,
            }
          : null,
      };
    } catch (err) {
      if (err instanceof PublicDataAuthError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }

  async getReservoirLevels(facCode: string, dateStart?: string, dateEnd?: string) {
    try {
      const rows = await this.reservoir.getWaterLevels({ facCode, dateStart, dateEnd });
      const latest = rows.at(-1) ?? null;
      return {
        source: 'KRC 농촌용수 저수지 (data.go.kr 15099919)',
        facCode,
        latest,
        rows,
      };
    } catch (err) {
      if (err instanceof PublicDataAuthError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }

  private async resolveReservoirSearch(lat: number, lng: number, queryOverride?: string) {
    const trimmed = queryOverride?.trim();
    if (trimmed) {
      return {
        spotLabel: trimmed,
        query: trimmed,
        nameHint: trimmed,
        regionHint: trimmed,
      };
    }

    const region = await this.geocode.reverseRegion(lat, lng);
    const district = region.district?.replace(/(시|군|구)$/, '') || '';
    const query = district || region.province.replace(/(특별자치도|특별시|광역시|도)$/, '').slice(0, 2);

    return {
      spotLabel: region.label,
      query,
      nameHint: district || undefined,
      regionHint: district || region.province,
    };
  }

  private async searchReservoirCandidates(search: {
    query: string;
    regionHint: string;
  }): Promise<ReservoirCode[]> {
    let rows = await this.reservoir.searchReservoirs(search.query);
    if (!rows.length && search.regionHint !== search.query) {
      rows = await this.reservoir.searchReservoirs(search.regionHint);
    }
    return rows;
  }

  private stubReservoirRow(candidate: ReservoirCode): ReservoirAreaRow {
    return {
      facCode: candidate.facCode,
      facName: candidate.facName,
      county: candidate.county,
      ratePercent: null,
      waterLevelM: null,
      checkDate: null,
      lat: 0,
      lng: 0,
      geocoded: false,
    };
  }

  private async buildReservoirAreaRows(
    candidates: ReservoirCode[],
    deadline: number,
  ): Promise<ReservoirAreaRow[]> {
    const limited = candidates;
    const remainingMs = () => Math.max(0, deadline - Date.now());
    if (remainingMs() <= 0) return [];

    const settled = await Promise.allSettled(
      limited.map((candidate) =>
        this.withTimeout(
          this.buildOneReservoirRow(candidate),
          Math.min(900, remainingMs()),
          null,
        ),
      ),
    );

    return settled
      .filter((s): s is PromiseFulfilledResult<ReservoirAreaRow | null> => s.status === 'fulfilled')
      .map((s) => s.value)
      .filter((row): row is ReservoirAreaRow => row != null);
  }

  private async buildOneReservoirRow(
    candidate: ReservoirCode,
  ): Promise<ReservoirAreaRow | null> {
    const [levels, coord] = await Promise.all([
      this.withTimeout(
        this.reservoir.getWaterLevels({ facCode: candidate.facCode, latestOnly: true }),
        700,
        [],
      ),
      this.withTimeout(
        this.geocode.geocodeReservoir(candidate.facName, candidate.county),
        700,
        null,
      ),
    ]);

    const latest = levels.at(-1);
    const lat = coord?.lat ?? 0;
    const lng = coord?.lng ?? 0;

    return {
      facCode: candidate.facCode,
      facName: candidate.facName,
      county: candidate.county,
      ratePercent: latest?.ratePercent ?? null,
      waterLevelM: latest?.waterLevelM ?? null,
      checkDate: latest?.checkDate ?? null,
      lat,
      lng,
      geocoded: coord != null,
    };
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => {
        setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  }

  private rankReservoirCandidates(
    rows: ReservoirCode[],
    nameHint?: string,
    regionHint?: string,
  ): ReservoirCode[] {
    if (!rows.length) return [];
    const scored = rows.map((row) => {
      let score = 0;
      if (nameHint && row.facName.includes(nameHint)) score += 10;
      if (regionHint && row.county?.includes(regionHint)) score += 8;
      if (/댐|저수지|호/.test(row.facName)) score += 3;
      return { row, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.row);
  }

  private dedupeFishingRows(
    rows: Awaited<ReturnType<KhoaPublicClient['getSeaFishingIndex']>>,
  ) {
    const seen = new Set<string>();
    return rows.filter((row) => {
      if (!row.fishName || row.fishName === '기타어종') return false;
      const key = row.fishName;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private filterTideRowsForPoint(
    rows: Awaited<ReturnType<KhoaPublicClient['getTideForecast']>>,
    point: (typeof TIDE_FORECAST_POINTS)[number],
  ) {
    const nearPoint = rows.filter((row) => {
      if (row.lat == null || row.lng == null) return true;
      const dLat = Math.abs(row.lat - point.lat);
      const dLng = Math.abs(row.lng - point.lng);
      return dLat < 0.35 && dLng < 0.35;
    });
    return nearPoint.length ? nearPoint : [];
  }

  private sortFishingByDistance(
    rows: Awaited<ReturnType<KhoaPublicClient['getSeaFishingIndex']>>,
    lat: number,
    lng: number,
  ) {
    return [...rows].sort((a, b) => {
      const distA = this.rowDistance(a, lat, lng);
      const distB = this.rowDistance(b, lat, lng);
      return distA - distB;
    });
  }

  private rowDistance(
    row: Awaited<ReturnType<KhoaPublicClient['getSeaFishingIndex']>>[number],
    lat: number,
    lng: number,
  ): number {
    const rLat = Number(row.raw.lat);
    const rLng = Number(row.raw.lot ?? row.raw.lng);
    if (!Number.isFinite(rLat) || !Number.isFinite(rLng)) return Number.POSITIVE_INFINITY;
    return (rLat - lat) ** 2 + (rLng - lng) ** 2;
  }
}
