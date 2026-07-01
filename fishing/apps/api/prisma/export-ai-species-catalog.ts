/**
 * 국내 낚시 대상 어종 전체 → ai/data/species_catalog.json + species-slug.generated.ts
 */
import 'dotenv/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  buildExportedSpeciesCatalog,
  renderSpeciesSlugGeneratedTs,
} from '../src/fish-info/export-species-catalog.util';
import {
  extractOdcloudItems,
  isOdcloudUrl,
} from '../src/fish-info/data-go-kr.util';
import type { MofFishSpeciesRow } from '../src/fish-info/public-data-fish.client';

const prisma = new PrismaClient();

const MOF_FIELD_MAP = {
  nameKo: ['생물종국명', '국명', 'KOR_NM', 'kornNm'],
  nameEn: ['생물종영문명', '영문명', 'ENG_NM', 'engNm'],
  scientificName: ['학명', 'SPECIES_NM', 'speciesNm', 'scientificName'],
  taxonomy: ['생물분류체계', '분류체계', 'CLSS_NM'],
};

function pickField(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const val = item[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return '';
}

function mapMofFishRow(item: Record<string, unknown>): MofFishSpeciesRow | null {
  const nameKo = pickField(item, MOF_FIELD_MAP.nameKo);
  const scientificName = pickField(item, MOF_FIELD_MAP.scientificName);
  if (!nameKo || !scientificName || scientificName.split(/\s+/).length < 2) return null;

  const nameEn = pickField(item, MOF_FIELD_MAP.nameEn) || null;
  const taxonomy = pickField(item, MOF_FIELD_MAP.taxonomy) || null;

  return {
    nameKo,
    nameEn,
    scientificName,
    taxonomy,
    category: 'saltwater',
  };
}

async function fetchMofRows(): Promise<MofFishSpeciesRow[]> {
  const baseUrl = process.env.MOF_MARINE_SPECIES_URL;
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!baseUrl || !serviceKey || !isOdcloudUrl(baseUrl)) {
    console.log('⚠️  MOF 미설정 — 정적 민물·기수 목록만 사용합니다.');
    return [];
  }

  const perPage = 100;
  const rows: MofFishSpeciesRow[] = [];
  const seen = new Set<string>();
  let page = 1;
  let matchCount = Number.POSITIVE_INFINITY;

  console.log('📡 해양수산부 어류 목록 조회 중...');

  while ((page - 1) * perPage < matchCount) {
    const res = await axios
      .get(baseUrl, {
        params: {
          serviceKey,
          page,
          perPage,
          'cond[생물분류중분류::EQ]': 'FI',
          'cond[종동정등급::EQ]': 'species',
        },
        timeout: 30000,
      })
      .catch(() => null);

    if (!res?.data) break;

    matchCount = Number(res.data.matchCount ?? res.data.totalCount ?? 0);
    const items = extractOdcloudItems(res.data);
    if (!items.length) break;

    for (const item of items) {
      const row = mapMofFishRow(item);
      if (!row) continue;
      const key = row.scientificName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }

    if (page % 10 === 0) {
      console.log(`   … ${rows.length}종 (page ${page})`);
    }
    page += 1;
  }

  console.log(`   MOF 원본 ${rows.length}종`);
  return rows;
}

async function loadDbScientificIds(): Promise<Map<string, number> | undefined> {
  try {
    const rows = await prisma.fishSpecies.findMany({
      where: { scientificName: { not: null } },
      select: { id: true, scientificName: true },
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.scientificName) {
        map.set(row.scientificName.toLowerCase(), row.id);
      }
    }
    console.log(`🗄️  DB 어종 ID ${map.size}건 반영`);
    return map;
  } catch {
    console.log('⚠️  DB 미연결 — 합성 ID(100+) 사용');
    return undefined;
  }
}

async function main() {
  const fishingRoot = path.resolve(__dirname, '..', '..', '..');
  const jsonPath = path.join(fishingRoot, 'ai', 'data', 'species_catalog.json');
  const generatedTsPath = path.join(
    fishingRoot,
    'apps',
    'api',
    'src',
    'ai',
    'species-slug.generated.ts',
  );

  const [mofRows, dbIds] = await Promise.all([fetchMofRows(), loadDbScientificIds()]);
  const catalog = buildExportedSpeciesCatalog(mofRows, dbIds);

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(catalog, null, 2), 'utf-8');
  fs.writeFileSync(generatedTsPath, renderSpeciesSlugGeneratedTs(catalog), 'utf-8');

  const extra = catalog.count - catalog.curatedCount;
  console.log('\n✅ AI 어종 카탈로그 동기화 완료');
  console.log(`   핵심 ${catalog.curatedCount}종 + 확장 ${extra}종 = 총 ${catalog.count}종`);
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   TS:   ${generatedTsPath}`);
  console.log('\n다음: npm run ai:crawl  또는  npm run ai:dataset');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
