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
/** 지도 마커용 지오코딩 대상 수 — 너무 크면 공공API 한도에 걸림 */
const RESERVOIR_MAP_ENRICH_LIMIT = 20;
const RESERVOIR_AREA_DEADLINE_MS = 9000;
const GEOCODE_CONCURRENCY = 4;

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
      const bias = { lat, lng };

      // KRC 목록 + 카카오 주변 저수지 POI를 병렬로 (지도에 물이 보이는데 마커가 비는 경우 보강)
      const [codes, kakaoNearby] = await Promise.all([
        this.withTimeout(this.searchReservoirCandidates(search), 2500, []),
        this.withTimeout(this.geocode.searchNearbyReservoirs(lat, lng, 15000), 3500, []),
      ]);

      const candidates = this.rankReservoirCandidates(codes, search.nameHint, search.regionHint)
        .slice(0, RESERVOIR_LIST_LIMIT);
      const enriched = await this.buildReservoirAreaRows(
        candidates.slice(0, RESERVOIR_MAP_ENRICH_LIMIT),
        deadline,
        bias,
      );
      const enrichedMap = new Map(enriched.map((row) => [row.facCode, row]));
      const rows = candidates.map(
        (code) => enrichedMap.get(code.facCode) ?? this.stubReservoirRow(code),
      );

      this.mergeKakaoNearbyReservoirs(rows, kakaoNearby, candidates);

      rows.sort((a, b) => Number(b.geocoded) - Number(a.geocoded));
      return {
        source: 'KRC 농촌용수 저수지 + 카카오 주변 저수지',
        spot: search.spotLabel,
        searchQuery: search.query,
        center: { lat, lng },
        totalCount: rows.length,
        geocodedCount: rows.filter((r) => r.geocoded).length,
        rows,
      };
    } catch (err) {
      if (err instanceof PublicDataAuthError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }

  /** 카카오 지도 POI로 좌표 없는 KRC 행을 채우고, 매칭 안 되면 새 마커로 추가 */
  private mergeKakaoNearbyReservoirs(
    rows: ReservoirAreaRow[],
    kakaoNearby: Array<{ id: string; name: string; address: string; lat: number; lng: number }>,
    candidates: ReservoirCode[],
  ) {
    if (!kakaoNearby.length) return;

    const normalize = (s: string) =>
      s.replace(/\s+/g, '').replace(/(저수지|저수면|저류지|유수지|배수지|댐|호수)$/g, '');

    const usedKakao = new Set<string>();

    // 1) 아직 좌표 없는 KRC 행에 이름 비슷한 카카오 POI 좌표 부여
    for (const row of rows) {
      if (row.geocoded) continue;
      const base = normalize(row.facName);
      if (base.length < 2) continue;
      const hit = kakaoNearby.find((k) => {
        if (usedKakao.has(k.id)) return false;
        const kn = normalize(k.name);
        return kn.includes(base) || base.includes(kn) || k.name.includes(row.facName);
      });
      if (!hit) continue;
      row.lat = hit.lat;
      row.lng = hit.lng;
      row.geocoded = true;
      usedKakao.add(hit.id);
    }

    // 2) 기존 마커와 멀리 떨어진 카카오 저수지는 추가 (지도에만 있는 소규모 저수지)
    const nearExisting = (lat: number, lng: number) =>
      rows.some(
        (r) =>
          r.geocoded
          && Math.abs(r.lat - lat) < 0.004
          && Math.abs(r.lng - lng) < 0.004,
      );

    const candidateNames = new Set(candidates.map((c) => normalize(c.facName)));

    for (const k of kakaoNearby) {
      if (usedKakao.has(k.id)) continue;
      if (nearExisting(k.lat, k.lng)) continue;
      const kn = normalize(k.name);
      // 이미 KRC 목록에 이름만 있는 경우 stub를 좌표만 채운 것으로 충분
      if (candidateNames.has(kn) && rows.some((r) => normalize(r.facName) === kn && r.geocoded)) {
        continue;
      }
      rows.push({
        facCode: k.id,
        facName: k.name,
        county: k.address || null,
        ratePercent: null,
        waterLevelM: null,
        checkDate: null,
        lat: k.lat,
        lng: k.lng,
        geocoded: true,
      });
      usedKakao.add(k.id);
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
    bias?: { lat: number; lng: number },
  ): Promise<ReservoirAreaRow[]> {
    const remainingMs = () => Math.max(0, deadline - Date.now());
    if (remainingMs() <= 0) {
      return candidates.map((c) => this.stubReservoirRow(c));
    }

    // 동시 요청을 제한해 카카오·공공데이터 한도(코드 16) 폭주를 줄임
    const results: ReservoirAreaRow[] = [];
    for (let i = 0; i < candidates.length; i += GEOCODE_CONCURRENCY) {
      if (remainingMs() <= 200) {
        for (const left of candidates.slice(i)) {
          results.push(this.stubReservoirRow(left));
        }
        break;
      }
      const chunk = candidates.slice(i, i + GEOCODE_CONCURRENCY);
      const settled = await Promise.all(
        chunk.map((candidate) =>
          this.withTimeout(
            this.buildOneReservoirRow(candidate, bias),
            Math.min(2500, Math.max(1200, remainingMs())),
            this.stubReservoirRow(candidate),
          ),
        ),
      );
      results.push(...settled);
    }
    return results;
  }

  private async buildOneReservoirRow(
    candidate: ReservoirCode,
    bias?: { lat: number; lng: number },
  ): Promise<ReservoirAreaRow> {
    // 지도 표시는 좌표가 핵심 — 수위는 실패해도 마커는 유지
    const coord = await this.withTimeout(
      this.geocode.geocodeReservoir(candidate.facName, candidate.county, bias),
      2000,
      null,
    );

    const levels = await this.withTimeout(
      this.reservoir.getWaterLevels({ facCode: candidate.facCode, latestOnly: true }),
      900,
      [],
    );

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
