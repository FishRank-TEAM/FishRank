import type { FishCategory } from './fish-species-catalog';
import { FISH_CATALOG } from './fish-species-catalog';

const CURATED_MARINE_BINOMIALS = new Set(
  FISH_CATALOG.filter((s) => s.scientificName && s.category !== 'freshwater').map((s) =>
    s.scientificName.toLowerCase().split(/\s+/).slice(0, 2).join(' '),
  ),
);

/** 국내 연안·근해 어획·낚시 대상 어류 속 */
const ANGLING_GENERA = new Set([
  'pagrus', 'pagellus', 'acanthopagrus', 'rhabdosargus', 'argyrops', 'sparodon', 'dentex',
  'lateolabrax', 'seriola', 'seriolina', 'decapterus', 'caranx', 'trachurus', 'carangoides',
  'atule', 'gnathanodon', 'alectis', 'serioloides', 'pseudocaranx',
  'scomber', 'scomberomorus', 'rastrelliger', 'sarda', 'auxis', 'euthynnus', 'thunnus',
  'katsuwonus', 'istiophorus', 'makaira', 'tetrapturus',
  'paralichthys', 'platichthys', 'kareius', 'limanda', 'pleuronichthys', 'verasper',
  'pseudopleuronectes', 'pleuronectes', 'reinhardtius', 'glyptocephalus', 'hippoglossoides',
  'gadus', 'microgadus', 'merlangius', 'molva',
  'mugil', 'planiliza', 'liza', 'chelon',
  'trichiurus', 'lepturacanthus',
  'muraenesox', 'conger', 'anguilla', 'ophichthus', 'echelus',
  'plectorhinchus', 'diagramma', 'haemulopsis', 'plectorhynchus', 'pomadasys',
  'nemipterus', 'pentapodus', 'scolopsis',
  'pennahia', 'johnius', 'miichthys', 'larimichthys', 'collichthys', 'nibea', 'otolithoides',
  'oplegnathus', 'girella', 'kyphosus', 'kyphosoides',
  'sillago', 'sillaginopsis',
  'hexagrammos', 'oxylebius', 'ophiodon',
  'takifugu', 'lagocephalus', 'torquigener', 'takifugu',
  'epinephelus', 'variola', 'cephalopholis', 'anyperodon', 'gracila',
  'sebastes', 'sebastiscus', 'sebastolobus',
  'scorpaena', 'sebastapistes', 'inimicus', 'centropogon',
  'platycephalus', 'kumococi', 'inegocia',
  'synodus', 'trachinocephalus', 'saurida',
  'priacanthus', 'hozukius',
  'konosirus', 'atropus',
  'rachycentron', 'remora', 'echeneis',
  'siganus', 'siganaus',
  'cheilinus', 'choerodon', 'halichoeres', 'thalassoma', 'coris', 'pseudolabrus',
  'apogon', 'amphiprion', 'sargocentron',
  'centracanthus', 'scombrops',
  'cynoglossus', 'paraplagusia',
  'bregmaceros', 'uranoscopus',
  'trachinus', 'echiichthys',
  'lepidotrigla', 'chelidonichthys', 'prionotus',
  'pampus', 'stromateoides',
  'brama', 'taractes',
  'istiophorus', 'xiphias',
  'albula', 'elops', 'megalops',
  'hiodon', 'engraulis', 'coilia',
  'clupea', 'sardinops', 'sardinella', 'hilsa',
  'aristichthys', 'hypophthalmichthys', 'ctenopharyngodon',
  'mustelus', 'hemigaleus', 'carcharhinus', 'sphyrna', 'prionace', 'isurus', 'lamna',
  'raja', 'okamejei', 'dasyatis', 'gymnura', 'myliobatis', 'aetobatus', 'rhinobatos',
  'squatina', 'heterodontus',
  'hippocampus', 'syngnathus', 'entelurus',
  'trachipterus', 'regalecus',
  'zeus', 'psenopsis',
]);

/** 국내 민물·기수 낚시 대상 (학명 기준 분류) */
export const FISHING_SPECIES_BY_SCIENTIFIC: Record<
  string,
  { nameKo: string; nameEn?: string; category: FishCategory }
> = {
  // ── 민물 낚시 대상 ──
  'micropterus salmoides': { nameKo: '배스', nameEn: 'Largemouth Bass', category: 'freshwater' },
  'micropterus dolomieu': { nameKo: '스몰마우스배스', nameEn: 'Smallmouth Bass', category: 'freshwater' },
  'lepomis macrochirus': { nameKo: '블루길', nameEn: 'Bluegill', category: 'freshwater' },
  'siniperca scherzeri': { nameKo: '쏘가리', nameEn: 'Mandarin Fish', category: 'freshwater' },
  'siniperca coreensis': { nameKo: '토종쏘가리', nameEn: 'Korean Perch', category: 'freshwater' },
  'siniperca kawamebari': { nameKo: '푸른쏘가리', category: 'freshwater' },
  'coreoperca herzi': { nameKo: '엉겅이', category: 'freshwater' },
  'coreoperca kawamebari': { nameKo: '쑥갓', category: 'freshwater' },
  'channa argus': { nameKo: '가물치', nameEn: 'Snakehead', category: 'freshwater' },
  'carassius carassius': { nameKo: '붕어', nameEn: 'Crucian Carp', category: 'freshwater' },
  'carassius auratus': { nameKo: '금붕어', nameEn: 'Goldfish', category: 'freshwater' },
  'carassius cuvieri': { nameKo: '남방붕어', category: 'freshwater' },
  'cyprinus carpio': { nameKo: '잉어', nameEn: 'Common Carp', category: 'freshwater' },
  'silurus asotus': { nameKo: '메기', nameEn: 'Amur Catfish', category: 'freshwater' },
  'silurus microdorsalis': { nameKo: '참메기', category: 'freshwater' },
  'misgurnus mizolepis': { nameKo: '미꾸라지', nameEn: 'Korean Loach', category: 'freshwater' },
  'misgurnus anguillicaudatus': { nameKo: '동양미꾸라지', category: 'freshwater' },
  'plecoglossus altivelis': { nameKo: '향어', nameEn: 'Ayu', category: 'freshwater' },
  'oncorhynchus mykiss': { nameKo: '송어', nameEn: 'Rainbow Trout', category: 'freshwater' },
  'oncorhynchus masou': { nameKo: '산천어', nameEn: 'Masu Salmon', category: 'freshwater' },
  'zacco platypus': { nameKo: '피라미', category: 'freshwater' },
  'zacco koreanus': { nameKo: '한국피라미', category: 'freshwater' },
  'hemiculter eigenmanni': { nameKo: '메운', category: 'freshwater' },
  'hemiculter leucisculus': { nameKo: '참메운', category: 'freshwater' },
  'salangichthys microdon': { nameKo: '빙어', category: 'freshwater' },
  'hypophthalmichthys molitrix': { nameKo: '백련어', category: 'freshwater' },
  'aristichthys nobilis': { nameKo: '떡붕어', category: 'freshwater' },
  'ctenopharyngodon idella': { nameKo: '초어', category: 'freshwater' },
  'mylopharyngodon piceus': { nameKo: '돌고기', category: 'freshwater' },
  'rhodeus ocellatus': { nameKo: '납줄개', category: 'freshwater' },
  'rhodeus uyekii': { nameKo: '참납줄개', category: 'freshwater' },
  'acheilognathus signifer': { nameKo: '참마자', category: 'freshwater' },
  'acheilognathus koreensis': { nameKo: '남방마자', category: 'freshwater' },
  'acheilognathus yamatsutae': { nameKo: '흑줄납자', category: 'freshwater' },
  'squalidus chankaensis': { nameKo: '눈볼대', category: 'freshwater' },
  'squalidus multimaculatus': { nameKo: '줄볼대', category: 'freshwater' },
  'pseudogobio esocinus': { nameKo: '버들치', category: 'freshwater' },
  'coreoleuciscus splendidus': { nameKo: '참마자', category: 'freshwater' },
  'cobitis tetralineata': { nameKo: '모래무지', category: 'freshwater' },
  'cobitis luteroides': { nameKo: '한국종개', category: 'freshwater' },
  'cobitis striata': { nameKo: '참종개', category: 'freshwater' },
  'koreocobitis naktongensis': { nameKo: '두볼찻고기', category: 'freshwater' },
  'odontobutis interrupta': { nameKo: '자가사', category: 'freshwater' },
  'odontobutis platycephala': { nameKo: '능성어', category: 'freshwater' },
  'pelteobagrus fulvidraco': { nameKo: '메기자라', category: 'freshwater' },
  'pseudobagrus koreanus': { nameKo: '동자개', category: 'freshwater' },
  'pseudobagrus brevicorpus': { nameKo: '줄동자개', category: 'freshwater' },
  'pseudobagrus emarginatus': { nameKo: '얼록동자개', category: 'freshwater' },
  'gymnocypris przewalskii': { nameKo: '만우어', category: 'freshwater' },
  'opsariichthys uncirostris': { nameKo: '참얼록쉬리', category: 'freshwater' },
  'opsariichthys evolans': { nameKo: '얼록쉬리', category: 'freshwater' },
  'luciobarbus longiceps': { nameKo: '참마자', category: 'freshwater' },
  'gobiobotia macrocephala': { nameKo: '얼굴마자', category: 'freshwater' },
  'gobiobotia brevibarba': { nameKo: '수염마자', category: 'freshwater' },
  'erythroculter erythropterus': { nameKo: '강준치', nameEn: 'Skygazer', category: 'freshwater' },
  'erythroculter hypselonotus': { nameKo: '남방강준치', nameEn: 'Southern Skygazer', category: 'freshwater' },
  'rhinogobius brunneus': { nameKo: '납자리', category: 'freshwater' },
  'rhinogobius giurinus': { nameKo: '쉬리', category: 'freshwater' },
  'tridentiger brevispinis': { nameKo: '날자리고기', category: 'brackish' },
  'tridentiger trigonocephalus': { nameKo: '망둑어', category: 'brackish' },
  'lates japonicus': { nameKo: '민물농어', category: 'freshwater' },

  // ── 기수 (하구·호수) ──
  'anguilla japonica': { nameKo: '뱀장어', nameEn: 'Japanese Eel', category: 'brackish' },
  'mugil cephalus': { nameKo: '숭어', nameEn: 'Flathead Mullet', category: 'brackish' },
  'lateolabrax japonicus': { nameKo: '농어', nameEn: 'Japanese Seabass', category: 'brackish' },
  'seriola quinqueradiata': { nameKo: '방어', category: 'brackish' },
  'konosirus punctatus': { nameKo: '전갱이', category: 'brackish' },
  'tribolodon hakonensis': { nameKo: '은어', category: 'freshwater' },
  'tribolodon brandtii': { nameKo: '산은어', category: 'freshwater' },
  'pseudorasbora parva': { nameKo: '참붕어', category: 'freshwater' },
  'parabramis pekinensis': { nameKo: '백련', category: 'freshwater' },
  'hemibarbus mylodon': { nameKo: '토종마자', category: 'freshwater' },
  'hemibarbus longipinnis': { nameKo: '긴지느러미마자', category: 'freshwater' },
  'hemibarbus labeo': { nameKo: '늪마자', category: 'freshwater' },
  'candidia temminckii': { nameKo: '줄모기', category: 'freshwater' },
  'sarcocheilichthys variegatus': { nameKo: '바늘고기', category: 'freshwater' },
  'sarcocheilichthys sinensis': { nameKo: '대모풍어', category: 'freshwater' },
  'squalidus atromaculatus': { nameKo: '등줄무지', category: 'freshwater' },
  'squalidus gracilis': { nameKo: '긴꼬리볼대', category: 'freshwater' },
  'acanthogobio guentheri': { nameKo: '봉어', category: 'freshwater' },
  'pseudogobio vaillanti': { nameKo: '큰눈버들치', category: 'freshwater' },
  'pseudogobio nudus': { nameKo: '큰눈마루', category: 'freshwater' },
  'coreoleuciscus aeruginosus': { nameKo: '토종마자', category: 'freshwater' },
  'rhodeus fangi': { nameKo: '줄납자', category: 'freshwater' },
  'acheilognathus rhombeus': { nameKo: '연등어', category: 'freshwater' },
  'niwaella multifasciata': { nameKo: '참종개', category: 'freshwater' },
  'niwaella brevifasciata': { nameKo: '줄무지종개', category: 'freshwater' },
  'cobitis zanclaeus': { nameKo: '뿔종개', category: 'freshwater' },
  'lepidochephalichthys togoensis': { nameKo: '춘양고기', category: 'freshwater' },
  'parabotia mantschurica': { nameKo: '자루', category: 'freshwater' },
  'leptobotia mantschurica': { nameKo: '참줄미꾸라지', category: 'freshwater' },
  'saurogobio dabryi': { nameKo: '둥근코망둑', category: 'freshwater' },
  'rhodeus oxycephalus': { nameKo: '납자', category: 'freshwater' },
  'botia macrolineata': { nameKo: '여우꼬치', category: 'freshwater' },
  'coreius heterodon': { nameKo: '중국참쏘가리', category: 'freshwater' },
  'oreochromis niloticus': { nameKo: '나일틸라피아', category: 'freshwater' },
  'leuciscus waleckii': { nameKo: '톱우', category: 'freshwater' },
  'gobiobotia abbreviata': { nameKo: '줄마자', category: 'freshwater' },
  'gobiobotia naktongensis': { nameKo: '낙동마자', category: 'freshwater' },
  'pseudobagrus ussuriensis': { nameKo: '우수리동자개', category: 'freshwater' },
  'pseudobagrus fulviguttatus': { nameKo: '얼록동자개', category: 'freshwater' },
  'silurus glanis': { nameKo: '메기', category: 'freshwater' },
  'clarias gariepinus': { nameKo: '아프리카메기', category: 'freshwater' },
  'hypophthalmichthys nobilis': { nameKo: '떡붕어', category: 'freshwater' },
  'megalobrama terminalis': { nameKo: '눈볼대', category: 'freshwater' },
  'megalobrama skolkovii': { nameKo: '눈볼대', category: 'freshwater' },
  'isonychodon acutus': { nameKo: '참마자', category: 'freshwater' },
  'opsariichthys pachycephalus': { nameKo: '얼록쉬리', category: 'freshwater' },
  'rhinogobius similis': { nameKo: '쉬리', category: 'freshwater' },
  'tridentiger obscurus': { nameKo: '망둑어', category: 'brackish' },
  'platichthys stellatus': { nameKo: '별가자미', category: 'brackish' },
  'coilia nasus': { nameKo: '참칼치', category: 'brackish' },
};

/** 심해·비대상 어류 속 (해양 MOF 필터) */
const NON_ANGLING_GENERA = new Set([
  'myctophum', 'diaphus', 'benthosema', 'symbolophorus', 'hygophum', 'lampanyctus',
  'notoscopelus', 'electrona', 'triphoturus', 'vinciguerria', 'cyclothone', 'gonostoma',
  'stomias', 'chauliodus', 'malacosteus', 'bathophilus', 'paralepis', 'argyropelecus',
  'mauricea', 'storiestomias', 'eustomias', 'melanostomias', 'tactostoma', 'bathylagus',
  'macroparalepis', 'alepocephalus', 'rouleina', 'xenophthalmichthys', 'photostomias',
  'stomiatichthys', 'bathylaco', 'melanocetus', 'ceratias', 'linophryne', 'oneirodes',
  'gigantactis', 'rhynchactis', 'leptacanthichthys', 'centrophryne', 'cryptopsaras',
  'photoblepharon', 'anoplogaster', 'scopelarchus', 'scopelosaurus', 'bathypterois',
  'chiasmodon', 'pseudoscopelus', 'arctozenus', 'luciosudis', 'evermannella',
  'argentinoides', 'nansenia', 'argentina', 'bathylagoides', 'dolichopteryx',
]);

const EXCLUDE_NAME_KO = [
  '바이러스',
  '미생물',
  '원생',
  '조류',
  '해조',
  '곤충',
  '패류',
  '다모',
  '섬모',
  '종충',
  '고래',
  '돌고래',
  '물개',
  '거북',
  '해달',
  '복족류',
  '두족류',
  '왕족류',
  '등불',
  '심해',
  '발광',
  '미기록',
  '미확인',
  '미상',
  '불명',
  '유생',
  '기생충',
  '아종',
  '교잡',
];

const EXCLUDE_NAME_EN = ['virus', 'bacterium', 'protozoa', 'algae', 'nematode', 'copepod'];

/** 바다 어종 이름 패턴(…치 등)과 겹치는 민물 대상 */
const FRESHWATER_NAME_KO = new Set(['강준치', '남방강준치']);

/** 낚시 대상이 아닌 종 제외 (병원체·분류군 상위·비어종) */
export function isFishableSpecies(nameKo: string, nameEn: string | null, scientificName: string): boolean {
  const ko = nameKo.trim();
  const sci = scientificName.trim().toLowerCase();
  const en = (nameEn ?? '').toLowerCase();

  if (ko.length < 2) return false;
  if (/속$|과$|강$|문$|아속$|류$/.test(ko)) return false;
  if (sci.split(/\s+/).length < 2) return false;
  if (/\bsp\.?\b|cf\.|aff\.|virus/i.test(sci)) return false;

  if (EXCLUDE_NAME_KO.some((p) => ko.includes(p))) return false;
  if (EXCLUDE_NAME_EN.some((p) => en.includes(p) || sci.includes(p))) return false;

  // 학명만 있고 국명이 영문·라틴인 비정상 항목
  if (/^[a-z\s().,-]+$/i.test(ko) && !/[가-힣]/.test(ko)) return false;

  return true;
}

/** 해양 MOF 항목 중 낚시·어획 대상 여부 (민물·기수는 정적 목록으로 별도 처리) */
export function isMarineAnglingSpecies(
  nameKo: string,
  scientificName: string,
  nameEn?: string | null,
): boolean {
  const sci = scientificName.trim().toLowerCase();
  const binomial = sci.split(/\s+/).slice(0, 2).join(' ');
  const mapped = FISHING_SPECIES_BY_SCIENTIFIC[binomial];
  if (mapped?.category === 'freshwater') return false;
  if (mapped) return true;
  if (CURATED_MARINE_BINOMIALS.has(binomial)) return true;

  const genus = sci.split(/\s+/)[0] ?? '';
  if (NON_ANGLING_GENERA.has(genus)) return false;

  const ko = nameKo.trim();
  if (FRESHWATER_NAME_KO.has(ko)) return false;
  if (EXCLUDE_NAME_KO.some((p) => ko.includes(p))) return false;

  const en = (nameEn ?? '').toLowerCase();
  if (/(lantern|bristle|snailfish|deepsea|abyssal|mesopelagic|bathypelagic|viperfish|dragonfish)/i.test(en)) {
    return false;
  }

  if (ANGLING_GENERA.has(genus)) return true;

  // 국내 어장에서 쓰이는 짧은 국명 (참돔·고등어·갈치 등)
  if (/^[가-힣]{2,6}(어|돔|치|삼|생|복|너|대|조|갱|미|살|장|살)$/.test(ko)) return true;
  if (/^(갈치|고등어|광어|가자미|넙치|민어|조기|숭어|전갱이|학공치|삼치|명태|대구|붕장어|도다리|백조기|범돔|돌돔|농어|방어|우럭|볼락|참돔|감성돔)$/.test(ko)) {
    return true;
  }

  return false;
}

export function resolveFishingCategory(
  nameKo: string,
  scientificName: string,
): FishCategory {
  const ko = nameKo.trim();
  if (FRESHWATER_NAME_KO.has(ko)) return 'freshwater';

  const binomial = scientificName.trim().toLowerCase().split(/\s+/).slice(0, 2).join(' ');
  const mapped = FISHING_SPECIES_BY_SCIENTIFIC[binomial];
  if (mapped) return mapped.category;

  // MOF 기본값: 해양 어류 DB
  return 'saltwater';
}

export function resolveFishingNames(
  nameKo: string,
  nameEn: string | null,
  scientificName: string,
): { nameKo: string; nameEn: string | null } {
  const binomial = scientificName.trim().toLowerCase().split(/\s+/).slice(0, 2).join(' ');
  const mapped = FISHING_SPECIES_BY_SCIENTIFIC[binomial];
  if (mapped) {
    return { nameKo: mapped.nameKo, nameEn: mapped.nameEn ?? nameEn };
  }
  return { nameKo, nameEn };
}

/** MOF에 없을 수 있는 국내 민물·기수 낚시 어종 (정적 보강) */
export function getStaticFishingSpecies(): Array<{
  nameKo: string;
  nameEn: string | null;
  scientificName: string;
  category: FishCategory;
  taxonomy: string | null;
}> {
  return Object.entries(FISHING_SPECIES_BY_SCIENTIFIC).map(([sci, meta]) => ({
    nameKo: meta.nameKo,
    nameEn: meta.nameEn ?? null,
    scientificName: sci
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    category: meta.category,
    taxonomy: meta.category === 'freshwater' ? '민물 어류' : '기수 어류',
  }));
}
