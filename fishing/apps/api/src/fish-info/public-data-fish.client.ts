import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  extractOdcloudItems,
  extractPublicDataItems,
  getPublicDataResultCode,
  isOdcloudUrl,
  pickField,
} from './data-go-kr.util';
import { extractNifsItems, getNifsResultCode } from './nifs.util';

export type PublicFishRecord = {
  nameKo: string | null;
  nameEn: string | null;
  scientificName: string | null;
  taxonomy: string | null;
  habitat: string | null;
  distribution: string | null;
  ecology: string | null;
  morphology: string | null;
  source: 'mbris' | 'mof' | 'nifs' | 'nakdong';
  matched: boolean;
};

/** 해양수산부 해양생물종기본정보(odcloud) 어류 행 */
export type MofFishSpeciesRow = {
  nameKo: string;
  nameEn: string | null;
  scientificName: string;
  taxonomy: string | null;
  category: 'freshwater' | 'saltwater' | 'brackish';
};

type FieldMap = [string[], string[], string[], string[], string[], string[], string[], string[]];

@Injectable()
export class PublicDataFishClient {
  constructor(private config: ConfigService) {}

  private get serviceKey(): string | null {
    return this.config.get<string>('DATA_GO_KR_SERVICE_KEY') ?? null;
  }

  private get nifsApiKey(): string | null {
    return this.config.get<string>('NIFS_API_KEY') ?? null;
  }

  async searchMarineSpecies(nameKo: string, scientificName?: string): Promise<PublicFishRecord | null> {
    const baseUrl = this.config.get<string>('MBRIS_MARINE_SPECIES_URL');
    if (!baseUrl || !this.serviceKey) return null;

    return this.fetchDataGoKrBestMatch(
      baseUrl,
      { korNm: nameKo },
      'mbris',
      nameKo,
      scientificName,
      this.marineFieldMap(),
    );
  }

  async searchMarineBasicInfo(nameKo: string, scientificName?: string): Promise<PublicFishRecord | null> {
    const baseUrl = this.config.get<string>('MOF_MARINE_SPECIES_URL');
    if (!baseUrl || !this.serviceKey) return null;

    return this.fetchDataGoKrBestMatch(
      baseUrl,
      { korNm: nameKo, speciesNm: nameKo },
      'mof',
      nameKo,
      scientificName,
      this.marineFieldMap(),
    );
  }

  /** 국립수산과학원 생물종정보 (nifs.go.kr 별도 키) */
  async searchNifsSpecies(nameKo: string, scientificName?: string): Promise<PublicFishRecord | null> {
    if (!this.nifsApiKey) return null;

    const baseUrl =
      this.config.get<string>('NIFS_API_URL') ?? 'https://www.nifs.go.kr/OpenAPI_json';
    const apiId = this.config.get<string>('NIFS_SPECIES_API_ID') ?? 'speciesList';
    const nameParam = this.config.get<string>('NIFS_SPECIES_NAME_PARAM') ?? 'spcsKrnNm';

    const [koKeys, enKeys, sciKeys, taxKeys, habKeys, distKeys, ecoKeys, morphKeys] =
      this.nifsFieldMap();

    return axios
      .get(baseUrl, {
        params: {
          id: apiId,
          key: this.nifsApiKey,
          [nameParam]: nameKo,
          pageNo: 1,
          numOfRows: 20,
        },
        timeout: 15000,
      })
      .then((res) => {
        const code = getNifsResultCode(res.data);
        if (code && code !== '00') return null;

        const items = extractNifsItems(res.data);
        if (!items.length) return null;

        const item = this.pickBestItem(items, nameKo, scientificName, koKeys, sciKeys);
        if (!item) return null;

        const foundKo = pickField(item, koKeys);
        const foundSci = pickField(item, sciKeys);

        return {
          nameKo: foundKo,
          nameEn: pickField(item, enKeys),
          scientificName: foundSci,
          taxonomy: pickField(item, taxKeys),
          habitat: pickField(item, habKeys),
          distribution: pickField(item, distKeys),
          ecology: pickField(item, ecoKeys),
          morphology: pickField(item, morphKeys),
          source: 'nifs' as const,
          matched: this.isNameMatch(foundKo, nameKo, foundSci, scientificName),
        };
      })
      .catch(() => null);
  }

  /** 국립낙동강생물자원관 담수생물자원 조회 (15139801) — /bioresource */
  async searchFreshwaterBioResource(
    nameKo: string,
    scientificName?: string,
  ): Promise<PublicFishRecord | null> {
    const baseUrl = this.config.get<string>('NAKDONG_FRESHWATER_URL');
    if (!baseUrl || !this.serviceKey) return null;

    const fieldMap = this.freshwaterFieldMap();
    const [koKeys, , sciKeys] = fieldMap;

    // 서버 검색 파라미터 미지원 → 여러 페이지를 훑으며 클라이언트 매칭
    for (let pageNo = 1; pageNo <= 3; pageNo++) {
      const items = await this.fetchNakdongPage(baseUrl, pageNo, 100);
      const item = this.pickBestItem(items, nameKo, scientificName, koKeys, sciKeys, false);
      if (!item) continue;

      const record = this.buildRecord([item], nameKo, scientificName, 'nakdong', fieldMap);
      if (record?.matched) return record;
    }

    return null;
  }

  async searchByCategory(
    nameKo: string,
    category: 'freshwater' | 'saltwater' | 'brackish',
    scientificName?: string,
  ): Promise<PublicFishRecord | null> {
    const isMarine = category === 'saltwater' || category === 'brackish';

    if (isMarine) {
      return (
        (await this.searchMarineSpecies(nameKo, scientificName)) ??
        (await this.searchMarineBasicInfo(nameKo, scientificName)) ??
        (await this.searchNifsSpecies(nameKo, scientificName))
      );
    }

    return (
      (await this.searchNifsSpecies(nameKo, scientificName)) ??
      (await this.searchMarineBasicInfo(nameKo, scientificName)) ??
      (await this.searchFreshwaterBioResource(nameKo, scientificName))
    );
  }

  /** 해양수산부 DB에서 어류(FI)·종(species) 전체 목록 수집 */
  async fetchAllMofFishSpecies(): Promise<MofFishSpeciesRow[]> {
    const baseUrl = this.config.get<string>('MOF_MARINE_SPECIES_URL');
    if (!baseUrl || !this.serviceKey || !isOdcloudUrl(baseUrl)) return [];

    const perPage = 100;
    const rows: MofFishSpeciesRow[] = [];
    const seen = new Set<string>();
    let page = 1;
    let matchCount = Number.POSITIVE_INFINITY;

    while ((page - 1) * perPage < matchCount) {
      const res = await axios
        .get(baseUrl, {
          params: {
            serviceKey: this.serviceKey,
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
        const row = this.mapMofFishRow(item);
        if (!row) continue;
        const key = row.scientificName.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(row);
      }

      page += 1;
    }

    return rows;
  }

  private mapMofFishRow(item: Record<string, unknown>): MofFishSpeciesRow | null {
    const nameKo = pickField(item, ['국명', 'korNm', 'koreanName']);
    const scientificName = pickField(item, ['학명', 'sciNm', 'scientificName']);
    if (!nameKo || !scientificName) return null;

    const taxonomy = ['생물분류대분류', '생물분류중분류', '생물분류소분류']
      .map((key) => pickField(item, [key]))
      .filter(Boolean)
      .join(' > ');

    return {
      nameKo,
      nameEn: pickField(item, ['영명', 'engNm', 'englishName']),
      scientificName,
      taxonomy: taxonomy || null,
      category: 'saltwater',
    };
  }

  private marineFieldMap(): FieldMap {
    return [
      ['korNm', 'koreanName', 'spcsKrnNm', 'speciesNm', '국명'],
      ['engNm', 'englishName', 'spcsEngNm', '영명'],
      ['sciNm', 'scientificName', 'spcsScinNm', 'stnmItl', '학명'],
      ['taxonFullNm', 'clsFullNm', 'classification', 'bioClsFullNm'],
      ['habitat', 'habitats', 'hab'],
      ['rgnDist', 'distribution', 'distrib', 'domesticDist'],
      ['ecology', 'ecoInfo', 'ecologicalInfo'],
      ['morph', 'morphology', 'formInfo'],
    ];
  }

  private nifsFieldMap(): FieldMap {
    return [
      ['spcsKrnNm', 'speciesNm', 'korNm', 'koreanName', 'commNm'],
      ['spcsEngNm', 'englishNm', 'engNm', 'englishName'],
      ['spcsScinNm', 'scientificNm', 'sciNm', 'scientificName'],
      ['bioClsFullNm', 'classification', 'taxonFullNm', 'clsFullNm'],
      ['livingEnv', 'habitat', 'habitats', 'hab'],
      ['distribution', 'rgnDist', 'distrib'],
      ['ecology', 'ecoInfo'],
      ['morphology', 'morph', 'formInfo'],
    ];
  }

  private freshwaterFieldMap(): FieldMap {
    return [
      ['korean_name', 'korNm', 'koreanName', 'taxonKnm', 'commNm', 'speciesNm'],
      ['engNm', 'englishName'],
      ['scientific_name', 'sciNm', 'scientificName', 'taxonNm'],
      ['taxonomy', 'taxonFullNm', 'classification', 'clsFullNm', 'taxon'],
      ['habitat', 'habitats'],
      ['distribution', 'rgnDist', 'institution'],
      ['ecology', 'ecoInfo', 'category1', 'category2'],
      ['morphology', 'morph'],
    ];
  }

  private fetchNakdongPage(
    baseUrl: string,
    pageNo: number,
    numOfRows: number,
  ): Promise<Record<string, unknown>[]> {
    return axios
      .get(baseUrl, {
        params: {
          serviceKey: this.serviceKey,
          pageNo,
          numOfRows,
          resultType: 'json',
        },
        timeout: 20000,
      })
      .then((res) => {
        const code = getPublicDataResultCode(res.data);
        if (code && code !== '00') return [];
        return extractPublicDataItems(res.data);
      })
      .catch(() => []);
  }

  private fetchDataGoKrBestMatch(
    baseUrl: string,
    queryParams: Record<string, string>,
    source: PublicFishRecord['source'],
    expectedNameKo: string,
    expectedScientific: string | undefined,
    fieldMap: FieldMap,
  ): Promise<PublicFishRecord | null> {
    if (!this.serviceKey) return Promise.resolve(null);

    if (isOdcloudUrl(baseUrl)) {
      return this.fetchOdcloudBestMatch(baseUrl, expectedNameKo, expectedScientific, source, fieldMap);
    }

    const [koKeys, enKeys, sciKeys, taxKeys, habKeys, distKeys, ecoKeys, morphKeys] = fieldMap;

    return axios
      .get(baseUrl, {
        params: {
          serviceKey: this.serviceKey,
          pageNo: 1,
          numOfRows: 20,
          resultType: 'json',
          type: 'json',
          ...queryParams,
        },
        timeout: 15000,
      })
      .then((res) => {
        const code = getPublicDataResultCode(res.data);
        if (code && code !== '00') return null;

        const items = extractPublicDataItems(res.data);
        if (!items.length) return null;

        return this.buildRecord(
          items,
          expectedNameKo,
          expectedScientific,
          source,
          fieldMap,
        );
      })
      .catch(() => null);
  }

  private fetchOdcloudBestMatch(
    baseUrl: string,
    expectedNameKo: string,
    expectedScientific: string | undefined,
    source: PublicFishRecord['source'],
    fieldMap: FieldMap,
  ): Promise<PublicFishRecord | null> {
    return axios
      .get(baseUrl, {
        params: {
          serviceKey: this.serviceKey,
          page: 1,
          perPage: 20,
          'cond[국명::LIKE]': expectedNameKo,
        },
        timeout: 15000,
      })
      .then((res) => {
        const items = extractOdcloudItems(res.data);
        if (!items.length) return null;

        return this.buildRecord(items, expectedNameKo, expectedScientific, source, fieldMap);
      })
      .catch(() => null);
  }

  private buildRecord(
    items: Record<string, unknown>[],
    expectedNameKo: string,
    expectedScientific: string | undefined,
    source: PublicFishRecord['source'],
    fieldMap: FieldMap,
  ): PublicFishRecord | null {
    const [koKeys, enKeys, sciKeys, taxKeys, habKeys, distKeys, ecoKeys, morphKeys] = fieldMap;

    const item = this.pickBestItem(items, expectedNameKo, expectedScientific, koKeys, sciKeys);
    if (!item) return null;

    const nameKo = pickField(item, koKeys);
    const scientificName = pickField(item, sciKeys);

    return {
      nameKo,
      nameEn: pickField(item, enKeys),
      scientificName,
      taxonomy: this.composeTaxonomy(item, taxKeys),
      habitat: pickField(item, habKeys),
      distribution: pickField(item, distKeys),
      ecology: pickField(item, ecoKeys),
      morphology: pickField(item, morphKeys),
      source,
      matched: this.isNameMatch(nameKo, expectedNameKo, scientificName, expectedScientific),
    };
  }

  private composeTaxonomy(item: Record<string, unknown>, taxKeys: string[]): string | null {
    const odcloudParts = ['생물분류대분류', '생물분류중분류', '생물분류소분류']
      .map((key) => pickField(item, [key]))
      .filter(Boolean);
    if (odcloudParts.length) return odcloudParts.join(' > ');

    return pickField(item, taxKeys);
  }

  private pickBestItem(
    items: Record<string, unknown>[],
    expectedNameKo: string,
    expectedScientific: string | undefined,
    koKeys: string[],
    sciKeys: string[],
    allowFallback = true,
  ): Record<string, unknown> | null {
    for (const item of items) {
      const ko = pickField(item, koKeys);
      const sci = pickField(item, sciKeys);
      if (this.isNameMatch(ko, expectedNameKo, sci, expectedScientific)) return item;
    }

    for (const item of items) {
      const ko = pickField(item, koKeys);
      if (ko && (ko.includes(expectedNameKo) || expectedNameKo.includes(ko.replace(/\(.*\)/, '').trim()))) {
        return item;
      }
    }

    if (!allowFallback) return null;
    return items[0] ?? null;
  }

  private isNameMatch(
    foundKo: string | null,
    expectedKo: string,
    foundSci: string | null,
    expectedSci?: string,
  ): boolean {
    if (expectedSci && foundSci) {
      const a = expectedSci.toLowerCase();
      const b = foundSci.toLowerCase();
      if (b === a || b.startsWith(`${a} `) || b.includes(a)) return true;
    }
    if (!foundKo) return false;
    const a = expectedKo.replace(/\s/g, '');
    const b = foundKo.replace(/\s/g, '').replace(/\(.*\)/, '');
    return b.includes(a) || a.includes(b);
  }
}
