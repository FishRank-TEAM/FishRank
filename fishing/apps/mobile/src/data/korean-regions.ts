/** API · 웹과 동기화 — apps/api/src/common/constants/korean-regions.ts */
export interface RegionDistrict {
  name: string;
  label: string;
}

export interface RegionProvince {
  label: string;
  fullLabel: string;
  group: 'metro' | 'province';
  districts: RegionDistrict[];
}

const si = (name: string): RegionDistrict => ({ name, label: `${name}시` });
const gun = (name: string): RegionDistrict => ({ name, label: `${name}군` });
const gu = (name: string): RegionDistrict => ({ name, label: `${name}구` });

export const KOREAN_PROVINCES: RegionProvince[] = [
  {
    label: '서울', fullLabel: '서울특별시', group: 'metro',
    districts: [
      gu('강남'), gu('강동'), gu('강북'), gu('강서'), gu('관악'), gu('광진'),
      gu('구로'), gu('금천'), gu('노원'), gu('도봉'), gu('동대문'), gu('동작'),
      gu('마포'), gu('서대문'), gu('서초'), gu('성동'), gu('성북'), gu('송파'),
      gu('양천'), gu('영등포'), gu('용산'), gu('은평'), gu('종로'), gu('중'), gu('중랑'),
    ],
  },
  {
    label: '부산', fullLabel: '부산광역시', group: 'metro',
    districts: [
      gu('중'), gu('서'), gu('동'), gu('영도'), gu('부산진'), gu('동래'),
      gu('남'), gu('북'), gu('해운대'), gu('사하'), gu('금정'), gu('강서'),
      gu('연제'), gu('수영'), gu('사상'), gu('기장'),
    ],
  },
  {
    label: '대구', fullLabel: '대구광역시', group: 'metro',
    districts: [
      gu('중'), gu('동'), gu('서'), gu('남'), gu('북'), gu('수성'), gu('달서'), gu('달성'), gun('군위'),
    ],
  },
  {
    label: '인천', fullLabel: '인천광역시', group: 'metro',
    districts: [
      gu('중'), gu('동'), gu('미추홀'), gu('연수'), gu('남동'), gu('부평'),
      gu('계양'), gu('서'), gu('강화'), gu('옹진'),
    ],
  },
  {
    label: '광주', fullLabel: '광주광역시', group: 'metro',
    districts: [gu('동'), gu('서'), gu('남'), gu('북'), gu('광산')],
  },
  {
    label: '대전', fullLabel: '대전광역시', group: 'metro',
    districts: [gu('동'), gu('중'), gu('서'), gu('유성'), gu('대덕')],
  },
  {
    label: '울산', fullLabel: '울산광역시', group: 'metro',
    districts: [gu('중'), gu('남'), gu('동'), gu('북'), gu('울주')],
  },
  {
    label: '세종', fullLabel: '세종특별자치시', group: 'metro',
    districts: [si('세종')],
  },
  {
    label: '경기', fullLabel: '경기도', group: 'province',
    districts: [
      si('수원'), si('성남'), si('의정부'), si('안양'), si('부천'), si('광명'),
      si('평택'), si('동두천'), si('안산'), si('고양'), si('과천'), si('구리'),
      si('남양주'), si('오산'), si('시흥'), si('군포'), si('의왕'), si('하남'),
      si('용인'), si('파주'), si('이천'), si('안성'), si('김포'), si('화성'),
      si('광주'), si('양주'), si('포천'), si('여주'), gun('연천'), gun('가평'), gun('양평'),
    ],
  },
  {
    label: '강원', fullLabel: '강원특별자치도', group: 'province',
    districts: [
      si('춘천'), si('원주'), si('강릉'), si('동해'), si('태백'), si('속초'), si('삼척'),
      gun('홍천'), gun('횡성'), gun('영월'), gun('평창'), gun('정선'), gun('철원'),
      gun('화천'), gun('양구'), gun('인제'), gun('고성'), gun('양양'),
    ],
  },
  {
    label: '충북', fullLabel: '충청북도', group: 'province',
    districts: [
      si('청주'), si('충주'), si('제천'), gun('보은'), gun('옥천'), gun('영동'),
      gun('증평'), gun('진천'), gun('괴산'), gun('음성'), gun('단양'),
    ],
  },
  {
    label: '충남', fullLabel: '충청남도', group: 'province',
    districts: [
      si('천안'), si('공주'), si('보령'), si('아산'), si('서산'), si('논산'),
      si('계룡'), si('당진'), gun('금산'), gun('부여'), gun('서천'), gun('청양'),
      gun('홍성'), gun('예산'), gun('태안'),
    ],
  },
  {
    label: '전북', fullLabel: '전북특별자치도', group: 'province',
    districts: [
      si('전주'), si('군산'), si('익산'), si('정읍'), si('남원'), si('김제'),
      gun('완주'), gun('진안'), gun('무주'), gun('장수'), gun('임실'), gun('순창'),
      gun('고창'), gun('부안'),
    ],
  },
  {
    label: '전남', fullLabel: '전라남도', group: 'province',
    districts: [
      si('목포'), si('여수'), si('순천'), si('나주'), si('광양'), gun('담양'), gun('곡성'),
      gun('구례'), gun('고흥'), gun('보성'), gun('화순'), gun('장흥'), gun('강진'),
      gun('해남'), gun('영암'), gun('무안'), gun('함평'), gun('영광'), gun('장성'),
      gun('완도'), gun('진도'), gun('신안'),
    ],
  },
  {
    label: '경북', fullLabel: '경상북도', group: 'province',
    districts: [
      si('포항'), si('경주'), si('김천'), si('안동'), si('구미'), si('영주'),
      si('영천'), si('상주'), si('문경'), si('경산'), gun('군위'), gun('의성'),
      gun('청송'), gun('영양'), gun('영덕'), gun('청도'), gun('고령'), gun('성주'),
      gun('칠곡'), gun('예천'), gun('봉화'), gun('울진'), gun('울릉'),
    ],
  },
  {
    label: '경남', fullLabel: '경상남도', group: 'province',
    districts: [
      si('창원'), si('진주'), si('통영'), si('사천'), si('김해'), si('밀양'),
      si('거제'), si('양산'), gun('의령'), gun('함안'), gun('창녕'), gun('고성'),
      gun('남해'), gun('하동'), gun('산청'), gun('함양'), gun('거창'), gun('합천'),
    ],
  },
  {
    label: '제주', fullLabel: '제주특별자치도', group: 'province',
    districts: [si('제주'), si('서귀포')],
  },
];

export const KOREAN_REGION_GROUPS = [
  {
    label: '특별·광역시',
    provinces: KOREAN_PROVINCES.filter((p) => p.group === 'metro'),
  },
  {
    label: '도',
    provinces: KOREAN_PROVINCES.filter((p) => p.group === 'province'),
  },
];

export function formatActivityRegion(province: string, district: string): string {
  return `${province} ${district}`;
}

function normalizeDistrictToken(raw: string): string {
  return raw.trim().replace(/(시|군|구)$/, '');
}

function parseLegacyPipeRegion(value: string): { province: string; district: string } | null {
  const [rawProvince, rawDistrict] = value.split('|');
  if (!rawProvince?.trim() || !rawDistrict?.trim()) return null;

  const province = KOREAN_PROVINCES.find(
    (p) => p.label === rawProvince.trim() || p.fullLabel === rawProvince.trim(),
  );
  if (!province) return null;

  const token = normalizeDistrictToken(rawDistrict);
  const district = province.districts.find(
    (d) => d.name === token || d.label === rawDistrict.trim(),
  );
  if (!district) return null;

  return { province: province.label, district: district.name };
}

export function parseActivityRegion(value?: string | null): { province: string; district: string } | null {
  if (!value) return null;

  const trimmed = value.trim();
  const exact = KOREAN_PROVINCES.find((p) =>
    p.districts.some((d) => formatActivityRegion(p.label, d.name) === trimmed),
  );
  if (exact) {
    const district = exact.districts.find((d) => formatActivityRegion(exact.label, d.name) === trimmed)!;
    return { province: exact.label, district: district.name };
  }

  if (trimmed.includes('|')) {
    return parseLegacyPipeRegion(trimmed);
  }

  const provinceOnly = KOREAN_PROVINCES.find((p) => p.label === trimmed);
  if (provinceOnly) return { province: provinceOnly.label, district: '' };

  return null;
}

export function formatActivityRegionLabel(value?: string | null): string {
  if (!value) return '';
  const parsed = parseActivityRegion(value);
  if (!parsed) return value.replace('|', ' ');

  const province = KOREAN_PROVINCES.find((p) => p.label === parsed.province);
  if (!province) return value;
  if (!parsed.district) return province.fullLabel;

  const district = province.districts.find((d) => d.name === parsed.district);
  return district ? `${province.label} ${district.label}` : value;
}

export function buildActivityRegion(provinceLabel: string, districtName: string): string {
  return formatActivityRegion(provinceLabel, districtName);
}

export function getDistrictsByProvince(provinceLabel: string): RegionDistrict[] {
  return KOREAN_PROVINCES.find((p) => p.label === provinceLabel)?.districts ?? [];
}

/** @deprecated getDistrictsByProvince 사용 */
export function getDistricts(provinceLabel: string): readonly string[] {
  return getDistrictsByProvince(provinceLabel).map((d) => d.label);
}

export function getDistrictLabel(provinceLabel: string, districtName: string): string | undefined {
  return getDistrictsByProvince(provinceLabel).find((d) => d.name === districtName)?.label;
}
