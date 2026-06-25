import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { ALL_FISH_CATALOG } from '../src/fish-info/fish-species-catalog';
import { SEED_SPECIES_IDS, uploadsDir } from './seed-fish-images';

const INAT_BASE = 'https://api.inaturalist.org/v1';
const MAX_VARIANTS = 3;
const DELAY_MS = 350;

type DownloadResult = { key: string; status: 'ok' | 'skip' | 'fail'; bytes?: number };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function seedFileName(speciesId: number, variant: number): string {
  if (variant <= 0) return `seed-${speciesId}.jpg`;
  return `seed-${speciesId}-v${variant}.jpg`;
}

async function resolveTaxonId(
  scientificName: string | undefined,
  taxonId?: number,
): Promise<number | null> {
  if (taxonId) return taxonId;
  if (!scientificName?.trim()) return null;

  const res = await axios.get(`${INAT_BASE}/taxa`, {
    params: { q: scientificName, rank: 'species', per_page: 20, locale: 'ko' },
    timeout: 15_000,
  });
  const results = (res.data?.results ?? []) as { id: number; name: string; rank: string }[];
  const exact = results.find(
    (r) => r.rank === 'species' && r.name.toLowerCase() === scientificName.toLowerCase(),
  );
  return exact?.id ?? results.find((r) => r.rank === 'species')?.id ?? null;
}

async function fetchPhotoUrls(taxonId: number): Promise<string[]> {
  const res = await axios.get(`${INAT_BASE}/taxa/${taxonId}`, {
    params: { locale: 'ko' },
    timeout: 15_000,
  });
  const taxon = res.data?.results?.[0] as Record<string, unknown> | undefined;
  if (!taxon) return [];

  const urls: string[] = [];
  const push = (photo: Record<string, unknown> | null | undefined) => {
    const url =
      (photo?.large_url as string | undefined) ??
      (photo?.medium_url as string | undefined) ??
      (photo?.original_url as string | undefined);
    if (url && !urls.includes(url)) urls.push(url);
  };

  push(taxon.default_photo as Record<string, unknown> | undefined);

  const taxonPhotos = (taxon.taxon_photos ?? []) as { photo?: Record<string, unknown> }[];
  for (const tp of taxonPhotos) {
    push(tp.photo);
    if (urls.length >= MAX_VARIANTS) break;
  }

  return urls.slice(0, MAX_VARIANTS);
}

async function downloadOne(key: string, url: string, force = false): Promise<DownloadResult> {
  const dest = path.join(uploadsDir(), key);
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 8_000) {
    return { key, status: 'skip' };
  }
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30_000,
      headers: { 'User-Agent': 'FishRank-Seed/1.0 (local dev)' },
      maxRedirects: 5,
    });
    fs.writeFileSync(dest, Buffer.from(res.data));
    return { key, status: 'ok', bytes: res.data.byteLength };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('   ⚠️  %s 다운로드 실패: %s', key, message);
    return { key, status: 'fail' };
  }
}

export async function ensureSeedFishImages(force = false) {
  fs.mkdirSync(uploadsDir(), { recursive: true });

  const catalogById = new Map(ALL_FISH_CATALOG.map((e) => [e.speciesId, e]));
  const targets = SEED_SPECIES_IDS.map((id) => catalogById.get(id)).filter(Boolean);

  console.log('\n🖼️  어종별 시드 사진 다운로드 (iNaturalist · %d종)...', targets.length);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const entry of targets) {
    if (!entry) continue;

    let photoUrls: string[] = [];

    if (entry.speciesId === 99) {
      // 기타 — 일반 어류 대표 사진
      const fallbackTaxon = await resolveTaxonId('Actinopterygii');
      if (fallbackTaxon) photoUrls = await fetchPhotoUrls(fallbackTaxon);
    } else {
      const taxonId = await resolveTaxonId(entry.scientificName, entry.iNaturalistTaxonId);
      if (taxonId) {
        photoUrls = await fetchPhotoUrls(taxonId);
      }
    }

    if (photoUrls.length === 0) {
      console.warn('   ⚠️  어종 %d (%s) — 사진 없음', entry.speciesId, entry.nameKo);
      fail++;
      await sleep(DELAY_MS);
      continue;
    }

    for (let v = 0; v < photoUrls.length; v++) {
      const key = seedFileName(entry.speciesId, v);
      const result = await downloadOne(key, photoUrls[v], force);
      if (result.status === 'ok') ok++;
      else if (result.status === 'skip') skip++;
      else fail++;
    }

    console.log('   · %s (%d) — %d장', entry.nameKo, entry.speciesId, photoUrls.length);
    await sleep(DELAY_MS);
  }

  console.log('   ✅ 완료: 신규 %d · 기존 %d · 실패 %d', ok, skip, fail);
  if (fail > 0) {
    console.log('   💡 실패한 사진은 npm run seed:images -- --force 로 다시 시도하세요.');
  }
}

if (require.main === module) {
  const force = process.argv.includes('--force');
  ensureSeedFishImages(force).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
