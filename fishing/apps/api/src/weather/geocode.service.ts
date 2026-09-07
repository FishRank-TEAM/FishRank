import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  formatActivityRegion,
  formatActivityRegionLabel,
  KOREAN_PROVINCES,
} from '../common/constants/korean-regions';
import { PRESET_FISHING_SPOTS, type FishingSpot } from './fishing-spots';

export type PlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  source: 'preset' | 'kakao';
  spotType?: 'sea' | 'fresh' | 'mixed';
};

export type RegionAnchorResult = {
  province: string;
  district: string;
  activityRegion: string;
  label: string;
  lat: number;
  lng: number;
};

@Injectable()
export class GeocodeService {
  private readonly geocodeCache = new Map<string, { lat: number; lng: number } | null>();
  private readonly reverseCache = new Map<string, RegionAnchorResult>();
  private readonly nearbyReservoirCache = new Map<
    string,
    { at: number; rows: Array<{ id: string; name: string; address: string; lat: number; lng: number }> }
  >();

  constructor(private config: ConfigService) {}

  search(query: string): Promise<PlaceResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return Promise.resolve(PRESET_FISHING_SPOTS.slice(0, 8).map((s) => this.presetToResult(s)));

    const presetMatches = PRESET_FISHING_SPOTS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.region.toLowerCase().includes(q),
    ).map((s) => this.presetToResult(s));

    return this.searchKakao(query).then((kakao) => {
      const seen = new Set<string>();
      const merged: PlaceResult[] = [];
      for (const item of [...presetMatches, ...kakao]) {
        const key = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }
      return merged.slice(0, 15);
    });
  }

  getPresets(): PlaceResult[] {
    return PRESET_FISHING_SPOTS.map((s) => this.presetToResult(s));
  }

  async reverseRegion(lat: number, lng: number): Promise<RegionAnchorResult> {
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const cached = this.reverseCache.get(key);
    if (cached) return cached;

    const fromKakao = await this.reverseKakaoRegion(lat, lng);
    const result = fromKakao ?? this.defaultRegionAnchor();
    this.reverseCache.set(key, result);
    return result;
  }

  /**
   * 지도 중심 주변 저수지·댐 POI (카카오 키워드 + 반경).
   * KRC 지오코딩이 비는 지역을 메우기 위한 보강용.
   */
  async searchNearbyReservoirs(
    lat: number,
    lng: number,
    radiusM = 15000,
  ): Promise<Array<{ id: string; name: string; address: string; lat: number; lng: number }>> {
    const cacheKey = `near|${lat.toFixed(2)}|${lng.toFixed(2)}|${radiusM}`;
    const cached = this.nearbyReservoirCache.get(cacheKey);
    if (cached && Date.now() - cached.at < 20 * 60 * 1000) {
      return cached.rows;
    }

    const queries = ['저수지', '댐', '호수'];
    const byId = new Map<string, { id: string; name: string; address: string; lat: number; lng: number }>();

    for (const q of queries) {
      const docs = await this.searchKakaoRaw(q, { lat, lng, radiusM, size: 15 });
      for (const doc of docs) {
        const name = doc.place_name ?? '';
        if (!WATER_PLACE_RE.test(name)) continue;
        if (REJECT_PLACE_RE.test(name)) continue;
        const id = String(doc.id);
        if (byId.has(id)) continue;
        byId.set(id, {
          id: `kakao-${id}`,
          name,
          address: doc.address_name ?? '',
          lat: Number(doc.y),
          lng: Number(doc.x),
        });
      }
    }

    const rows = [...byId.values()];
    this.nearbyReservoirCache.set(cacheKey, { at: Date.now(), rows });
    return rows;
  }

  /** 저수지·댐만 매칭. 동명 건물/학교/공장은 제외 */
  async geocodeReservoir(
    facName: string,
    county: string | null,
    bias?: { lat: number; lng: number },
  ): Promise<{ lat: number; lng: number } | null> {
    const cacheKey = `v3|${facName}|${county ?? ''}|${bias ? `${bias.lat.toFixed(2)},${bias.lng.toFixed(2)}` : ''}`;
    if (this.geocodeCache.has(cacheKey)) {
      return this.geocodeCache.get(cacheKey) ?? null;
    }

    const baseName = normalizeReservoirName(facName);
    const countyHint = (county ?? '').replace(/(특별자치시|광역시|특별시|시|군|구)$/, '').trim();

    const queries = [
      `${countyHint} ${baseName} 저수지`.trim(),
      `${countyHint} ${baseName} 댐`.trim(),
      `${baseName} 저수지`,
      `${baseName} 댐`,
      `${facName} 저수지`,
    ].filter((q, i, arr) => q.length >= 3 && arr.indexOf(q) === i);

    let best: { lat: number; lng: number; score: number } | null = null;
    const biasOpts = bias ? { lat: bias.lat, lng: bias.lng, radiusM: 40000, size: 15 } : { size: 15 };

    for (const query of queries) {
      const docs = await this.searchKakaoRaw(query, biasOpts);
      for (const doc of docs) {
        const score = scoreReservoirMatch(doc, baseName, facName, countyHint);
        if (score < 35) continue;
        if (!best || score > best.score) {
          best = { lat: Number(doc.y), lng: Number(doc.x), score };
        }
      }
      if (best && best.score >= 75) break;
    }

    const hit = best ? { lat: best.lat, lng: best.lng } : null;
    this.geocodeCache.set(cacheKey, hit);
    return hit;
  }

  async geocodeKeyword(query: string): Promise<{ lat: number; lng: number } | null> {
    const results = await this.searchKakao(query);
    const first = results[0];
    if (!first) return null;
    return { lat: first.lat, lng: first.lng };
  }

  private defaultRegionAnchor(): RegionAnchorResult {
    return {
      province: '서울',
      district: '강남',
      activityRegion: formatActivityRegion('서울', '강남'),
      label: formatActivityRegionLabel(formatActivityRegion('서울', '강남')),
      lat: 37.5172,
      lng: 127.0473,
    };
  }

  private matchProvince(depth1: string) {
    const normalized = depth1.replace(/\s+/g, '');
    return KOREAN_PROVINCES.find(
      (p) =>
        normalized.includes(p.label) ||
        normalized.includes(p.fullLabel.replace(/\s+/g, '')) ||
        p.fullLabel.includes(depth1),
    );
  }

  private matchDistrict(province: (typeof KOREAN_PROVINCES)[number], depth2: string) {
    const normalized = depth2.replace(/(시|군|구)$/, '');
    return province.districts.find(
      (d) => d.name === normalized || depth2.includes(d.name) || depth2.includes(d.label),
    );
  }

  private async reverseKakaoRegion(lat: number, lng: number): Promise<RegionAnchorResult | null> {
    const key = this.config.get<string>('KAKAO_REST_API_KEY');
    if (!key) return null;

    try {
      const url = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`;
      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${key}` },
      });
      if (!res.ok) return null;

      const data = await res.json();
      const doc = (data.documents ?? []).find((d: { region_type: string }) => d.region_type === 'H') ??
        data.documents?.[0];
      if (!doc) return null;

      const province = this.matchProvince(doc.region_1depth_name ?? '');
      if (!province) return null;

      const district = this.matchDistrict(province, doc.region_2depth_name ?? '');
      const districtName = district?.name ?? province.districts[0]?.name ?? '';
      const activityRegion = districtName
        ? formatActivityRegion(province.label, districtName)
        : province.label;

      return {
        province: province.label,
        district: districtName,
        activityRegion,
        label: formatActivityRegionLabel(activityRegion),
        lat,
        lng,
      };
    } catch {
      return null;
    }
  }

  private presetToResult(spot: FishingSpot): PlaceResult {
    return {
      id: spot.id,
      name: spot.name,
      address: spot.region,
      lat: spot.lat,
      lng: spot.lng,
      source: 'preset',
      spotType: spot.type,
    };
  }

  private async searchKakao(query: string): Promise<PlaceResult[]> {
    const docs = await this.searchKakaoRaw(query);
    return docs.map((doc) => ({
      id: `kakao-${doc.id}`,
      name: doc.place_name,
      address: doc.address_name,
      lat: Number(doc.y),
      lng: Number(doc.x),
      source: 'kakao' as const,
    }));
  }

  private async searchKakaoRaw(
    query: string,
    opts?: { lat?: number; lng?: number; radiusM?: number; size?: number },
  ): Promise<KakaoPlaceDoc[]> {
    const key = this.config.get<string>('KAKAO_REST_API_KEY');
    if (!key) return [];

    try {
      const params = new URLSearchParams({
        query,
        size: String(opts?.size ?? 15),
      });
      if (
        opts?.lat != null
        && opts?.lng != null
        && Number.isFinite(opts.lat)
        && Number.isFinite(opts.lng)
      ) {
        params.set('y', String(opts.lat));
        params.set('x', String(opts.lng));
        params.set('radius', String(Math.min(Math.max(opts.radiusM ?? 15000, 1000), 20000)));
        params.set('sort', 'distance');
      }

      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${key}` },
      });
      if (!res.ok) return [];

      const data = await res.json();
      return (data.documents ?? []) as KakaoPlaceDoc[];
    } catch {
      return [];
    }
  }
}

type KakaoPlaceDoc = {
  id: string;
  place_name: string;
  address_name: string;
  category_name?: string;
  category_group_name?: string;
  y: string;
  x: string;
};

const WATER_PLACE_RE = /저수지|저수면|저류지|유수지|배수지|댐|호수|(^|[^가-힣])호([^가-힣]|$)|reservoir/i;
const WATER_CATEGORY_RE = /저수지|호수|댐|하천|강|바다|섬|산|관광|명소|여행/i;
const REJECT_PLACE_RE =
  /서당|학교|학원|유치원|어린이집|정밀|공장|공단|주식회사|㈜|\(주\)|아파트|오피스텔|빌딩|카페|식당|병원|교회|마트|편의점|주유소|주차장|PC방|노래방|은행|관공서|시청|동사무소|우체국|헬스|미용|부동산|모텔|호텔|펜션(?!.*호수)/i;

function normalizeReservoirName(facName: string): string {
  return facName
    .replace(/\(.*?\)/g, '')
    .replace(/저수지|저수면|댐|호수/g, '')
    .trim() || facName.trim();
}

function scoreReservoirMatch(
  doc: KakaoPlaceDoc,
  baseName: string,
  facName: string,
  countyHint: string,
): number {
  const name = doc.place_name ?? '';
  const cat = `${doc.category_name ?? ''} ${doc.category_group_name ?? ''}`;
  const addr = doc.address_name ?? '';

  if (REJECT_PLACE_RE.test(name)) return -1;
  if (REJECT_PLACE_RE.test(cat) && !WATER_PLACE_RE.test(name)) return -1;

  const hasWaterInName = WATER_PLACE_RE.test(name);
  const hasWaterInCat = WATER_CATEGORY_RE.test(cat) && /저수지|호수|댐|하천|강/.test(cat);
  if (!hasWaterInName && !hasWaterInCat) return -1;

  let score = 0;
  if (hasWaterInName) score += 50;
  if (/저수지|댐/.test(name)) score += 25;
  if (hasWaterInCat) score += 15;

  const compactName = name.replace(/\s+/g, '');
  const compactBase = baseName.replace(/\s+/g, '');
  const compactFac = facName.replace(/\s+/g, '');
  if (compactBase.length >= 2 && compactName.includes(compactBase)) score += 35;
  if (compactFac.length >= 2 && compactName.includes(compactFac)) score += 20;
  if (countyHint && addr.includes(countyHint)) score += 25;

  // 이름에 물 관련 키워드가 없고 카테고리만 관광/산이면 약함
  if (!hasWaterInName && /산|관광|명소/.test(cat)) score -= 20;

  return score;
}
