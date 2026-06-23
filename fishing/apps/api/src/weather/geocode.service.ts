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
    const fromKakao = await this.reverseKakaoRegion(lat, lng);
    if (fromKakao) return fromKakao;
    return this.defaultRegionAnchor();
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
    };
  }

  private async searchKakao(query: string): Promise<PlaceResult[]> {
    const key = this.config.get<string>('KAKAO_REST_API_KEY');
    if (!key) return [];

    try {
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=10`;
      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${key}` },
      });
      if (!res.ok) return [];

      const data = await res.json();
      return (data.documents ?? []).map((doc: { id: string; place_name: string; address_name: string; y: string; x: string }) => ({
        id: `kakao-${doc.id}`,
        name: doc.place_name,
        address: doc.address_name,
        lat: Number(doc.y),
        lng: Number(doc.x),
        source: 'kakao' as const,
      }));
    } catch {
      return [];
    }
  }
}
