import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  fetchPublicDataXml,
  PublicDataAuthError,
} from '../common/public-data-request.util';

export type FishingBanKind = 'prohibit' | 'restrict' | 'protect';

export type FishingBanZoneDto = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  kind: FishingBanKind;
  reason: string;
  sido?: string;
  address?: string;
  source: string;
  sourceDate?: string;
  path?: Array<{ lat: number; lng: number }>;
};

type CuratedFile = {
  updatedAt?: string;
  disclaimer?: string;
  zones: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    radiusM: number;
    kind: string;
    reason: string;
    sido?: string;
    address?: string;
    source: string;
    sourceDate?: string;
  }>;
};

@Injectable()
export class FishingBanService {
  private readonly logger = new Logger(FishingBanService.name);
  private mofCache: { at: number; zones: FishingBanZoneDto[] } | null = null;
  private curatedCache: CuratedFile | null = null;

  constructor(private config: ConfigService) {}

  async getNearby(lat: number, lng: number, radiusKm = 80): Promise<{
    zones: FishingBanZoneDto[];
    disclaimer: string;
    sources: string[];
    updatedAt: string | null;
  }> {
    const file = this.loadCuratedFile();
    const curatedZones = this.mapCurated(file).filter((z) => {
      const d = haversineKm(lat, lng, z.lat, z.lng);
      return d <= radiusKm + z.radiusM / 1000;
    });

    const mofZones = await this.fetchMofProtectZonesSafe(lat, lng, radiusKm);
    const merged = dedupeZones([...mofZones, ...curatedZones]);

    return {
      zones: merged.sort(
        (a, b) => haversineKm(lat, lng, a.lat, a.lng) - haversineKm(lat, lng, b.lat, b.lng),
      ),
      disclaimer:
        file.disclaimer
        ?? '공개 지정구역 기반 안내입니다. 정확한 경계는 관할 지자체 고시를 확인하세요.',
      sources: [...new Set(merged.map((z) => z.source))],
      updatedAt: file.updatedAt ?? null,
    };
  }

  private loadCuratedFile(): CuratedFile {
    if (this.curatedCache) return this.curatedCache;
    const path = join(__dirname, 'data', 'fishing-ban-zones.json');
    this.curatedCache = JSON.parse(readFileSync(path, 'utf8')) as CuratedFile;
    return this.curatedCache;
  }

  private mapCurated(file: CuratedFile): FishingBanZoneDto[] {
    return (file.zones ?? []).map((z) => ({
      id: z.id,
      name: z.name,
      lat: z.lat,
      lng: z.lng,
      radiusM: z.radiusM,
      kind: (z.kind === 'prohibit' || z.kind === 'restrict' || z.kind === 'protect'
        ? z.kind
        : 'restrict') as FishingBanKind,
      reason: z.reason,
      sido: z.sido,
      address: z.address,
      source: z.source,
      sourceDate: z.sourceDate,
    }));
  }

  private async fetchMofProtectZonesSafe(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<FishingBanZoneDto[]> {
    const serviceKey = this.config.get<string>('DATA_GO_KR_SERVICE_KEY');
    const baseUrl = this.config.get<string>('MOF_FISHERY_PROTECT_WFS_URL');
    if (!serviceKey || !baseUrl) return [];

    const now = Date.now();
    if (this.mofCache && now - this.mofCache.at < 6 * 60 * 60 * 1000) {
      return this.mofCache.zones.filter((z) => {
        const d = haversineKm(lat, lng, z.lat, z.lng);
        return d <= radiusKm + z.radiusM / 1000;
      });
    }

    try {
      const xml = await fetchPublicDataXml(baseUrl, serviceKey, { maxFeatures: 100 });
      const zones = parseMofWfs(xml);
      this.mofCache = { at: now, zones };
      return zones.filter((z) => {
        const d = haversineKm(lat, lng, z.lat, z.lng);
        return d <= radiusKm + z.radiusM / 1000;
      });
    } catch (err) {
      if (err instanceof PublicDataAuthError) {
        this.logger.warn(`수산자원보호구역 WFS 미승인/키오류: ${err.message}`);
      } else {
        this.logger.warn(`수산자원보호구역 WFS 조회 실패: ${(err as Error).message}`);
      }
      return [];
    }
  }
}

function dedupeZones(zones: FishingBanZoneDto[]): FishingBanZoneDto[] {
  const seen = new Set<string>();
  const out: FishingBanZoneDto[] = [];
  for (const z of zones) {
    const key = `${z.name}|${z.lat.toFixed(3)}|${z.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(z);
  }
  return out;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function parseMofWfs(xml: string): FishingBanZoneDto[] {
  const zones: FishingBanZoneDto[] = [];
  const members = xml.match(/<(?:\w+:)?member[\s>][\s\S]*?<\/(?:\w+:)?member>/gi)
    ?? xml.match(/<(?:\w+:)?featureMember[\s>][\s\S]*?<\/(?:\w+:)?featureMember>/gi)
    ?? [];

  let i = 0;
  for (const block of members) {
    const name =
      pickXml(block, 'fshrsrc_pzn_nm')
      ?? pickXml(block, 'fshrsr_pzn_nm')
      ?? pickXml(block, 'name')
      ?? `수산자원보호구역 ${i + 1}`;
    const code = pickXml(block, 'fshrsrc_pzn_cd') ?? pickXml(block, 'fshrsr_pzn_cd') ?? `mof-${i}`;
    const coordsText =
      block.match(/<(?:\w+:)?posList[^>]*>([\s\S]*?)<\/(?:\w+:)?posList>/i)?.[1]
      ?? block.match(/<(?:\w+:)?coordinates[^>]*>([\s\S]*?)<\/(?:\w+:)?coordinates>/i)?.[1]
      ?? '';

    const nums = coordsText.trim().split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
    if (nums.length < 2) continue;

    const pairs: Array<[number, number]> = [];
    for (let k = 0; k + 1 < nums.length; k += 2) {
      pairs.push([nums[k], nums[k + 1]]);
    }
    if (!pairs.length) continue;

    const sample = pairs[0];
    const isProjected = Math.abs(sample[0]) > 180 || Math.abs(sample[1]) > 90;
    const wgsPairs = isProjected
      ? pairs.map(([x, y]) => epsg5179ToWgs84(x, y))
      : pairs.map(([a, b]) => {
          if (Math.abs(a) <= 90 && Math.abs(b) > 90) return { lat: a, lng: b };
          return { lat: b, lng: a };
        });

    const lat = wgsPairs.reduce((s, p) => s + p.lat, 0) / wgsPairs.length;
    const lng = wgsPairs.reduce((s, p) => s + p.lng, 0) / wgsPairs.length;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    zones.push({
      id: `mof-${code}`,
      name,
      lat,
      lng,
      radiusM: estimateRadiusM(wgsPairs),
      kind: 'protect',
      reason: '수산자원보호구역 (해양수산부)',
      source: '해양수산부 수산자원보호구역 WFS (data.go.kr 15097317)',
      path: wgsPairs.length >= 3 ? wgsPairs : undefined,
    });
    i += 1;
  }
  return zones;
}

function pickXml(block: string, tag: string): string | null {
  const re = new RegExp(`<(?:\\w+:)?${tag}[^>]*>([^<]*)</(?:\\w+:)?${tag}>`, 'i');
  const m = block.match(re);
  return m?.[1]?.trim() || null;
}

function estimateRadiusM(path: Array<{ lat: number; lng: number }>): number {
  if (path.length < 2) return 3000;
  let max = 0;
  const cLat = path.reduce((s, p) => s + p.lat, 0) / path.length;
  const cLng = path.reduce((s, p) => s + p.lng, 0) / path.length;
  for (const p of path) {
    max = Math.max(max, haversineKm(cLat, cLng, p.lat, p.lng) * 1000);
  }
  return Math.min(Math.max(Math.round(max), 800), 25000);
}

function epsg5179ToWgs84(x: number, y: number): { lat: number; lng: number } {
  const lng = (x - 1_000_000) / 88_000 + 127.5;
  const lat = (y - 2_000_000) / 110_000 + 38.0;
  return { lat, lng };
}
