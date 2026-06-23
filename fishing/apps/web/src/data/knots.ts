export type KnotCategory = 'terminal' | 'connection' | 'loop' | 'reel';

export type KnotDifficulty = 'very-easy' | 'easy' | 'medium' | 'hard';

export type Knot = {
  slug: string;
  nameKo: string;
  nameEn: string;
  category: KnotCategory;
  icon: string;
  summary: string;
  difficulty: KnotDifficulty;
  strength?: string;
  steps: string[];
  tips: string[];
};

export const KNOT_CATEGORIES: { key: KnotCategory | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'terminal', label: '터미널' },
  { key: 'connection', label: '결속' },
  { key: 'loop', label: '고리' },
  { key: 'reel', label: '릴' },
];

export const KNOT_CATEGORY_LABEL: Record<KnotCategory, string> = {
  terminal: '터미널 매듭',
  connection: '결속 매듭',
  loop: '고리 매듭',
  reel: '릴 매듭',
};

export const KNOT_DIFFICULTY_LABEL: Record<KnotDifficulty, string> = {
  'very-easy': '매우 쉬움',
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

export const KNOTS: Knot[] = [
  {
    slug: 'palomar',
    nameKo: '팔로마 매듭',
    nameEn: 'Palomar Knot',
    category: 'terminal',
    icon: '🎣',
    summary: '루어·바늘·스위벨 연결에 가장 많이 쓰이는 강력한 매듭',
    difficulty: 'easy',
    strength: '줄 강도 약 95% 유지',
    steps: [
      '낚싯줄을 15~20cm 정도 접어 이중 고리를 만든다.',
      '고리를 스위벨·바늘·루어 고리에 통과시킨다.',
      '줄 끝을 다시 고리에 넣어 루어(또는 바늘)를 고리 안으로 통과시킨다.',
      '줄을 천천히 당겨 매듭이 형태를 잡게 한 뒤, 남은 줄을 잘라낸다.',
    ],
    tips: [
      'PE 라인은 마찰을 줄이기 위해 침을 바르거나 물에 적신 뒤 조인다.',
      '매듭이 바늘 눈에 걸리지 않도록 고리 크기를 넉넉히 남긴다.',
    ],
  },
  {
    slug: 'uni',
    nameKo: '유니 매듭',
    nameEn: 'Uni Knot',
    category: 'terminal',
    icon: '🔗',
    summary: '릴·루어·플라이 연결에 쓰는 범용 터미널 매듭',
    difficulty: 'easy',
    strength: '줄 강도 약 85~90% 유지',
    steps: [
      '줄 끝을 스냅·스위벨·루어에 통과시킨다.',
      '줄 끝과 본줄 사이에 작은 고리를 만든다.',
      '줄 끝을 고리 주위에 5~7회 감는다.',
      '고리를 잡고 줄 끝을 천천히 당겨 매듭을 조인다.',
      '본줄을 당겨 스냅·루어 쪽으로 매듭을 밀어 붙인다.',
    ],
    tips: [
      '모노·플루oro는 5~6회, PE는 7~8회 감기면 안정적이다.',
      '매듭을 조인 뒤 한 번 더 당겨 풀림 여부를 확인한다.',
    ],
  },
  {
    slug: 'improved-clinch',
    nameKo: '개선된 클린치 매듭',
    nameEn: 'Improved Clinch Knot',
    category: 'terminal',
    icon: '🪝',
    summary: '바늘·스위벨 연결에 적합한 초보자용 매듭',
    difficulty: 'very-easy',
    strength: '줄 강도 약 90% 유지',
    steps: [
      '줄 끝을 바늘 눈(또는 스위벨)에 통과시킨다.',
      '본줄을 따라 5~7회 감는다.',
      '줄 끝을 처음 만든 작은 고리에 넣는다.',
      '줄 끝을 다시 그 고리에 한 번 더 통과시킨다.',
      '본줄과 줄 끝을 동시에 당겨 조인다.',
    ],
    tips: [
      '줄 끝을 15cm 이상 남기면 작업이 편하다.',
      'PE 라인보다 모노·플루oro에 더 잘 맞는다.',
    ],
  },
  {
    slug: 'fg',
    nameKo: 'FG 매듭',
    nameEn: 'FG Knot',
    category: 'connection',
    icon: '⚡',
    summary: 'PE 본줄과 쇼크 리더를 연결하는 고강도 매듭',
    difficulty: 'hard',
    strength: '줄 강도 거의 100%에 가깝게 유지',
    steps: [
      '엄지·검지로 리더를 PE와 45도 각도로 잡는다.',
      'PE를 리더에 20~30회 교차 감는다.',
      '감은 PE 끝을 리더 쪽으로 반대 방향으로 5회 더 감는다.',
      '리더 끝으로 하프 히치 3~4회를 만든다.',
      '양쪽 줄을 천천히 당겨 조인 뒤 여분을 잘라낸다.',
    ],
    tips: [
      '처음엔 두꺼운 줄로 연습한 뒤 PE에 적용하는 것이 좋다.',
      '매듭이 완성되면 PE 쪽과 리더 쪽을 번갈아 당겨 확인한다.',
    ],
  },
  {
    slug: 'alberto',
    nameKo: '알버토 매듭',
    nameEn: 'Alberto Knot',
    category: 'connection',
    icon: '🔀',
    summary: '굵기가 다른 두 줄을 연결할 때 쓰는 매듭',
    difficulty: 'medium',
    strength: '줄 강도 약 90% 유지',
    steps: [
      '굵은 줄(리더) 끝에 작은 고리를 만든다.',
      '가는 줄(PE)을 고리에 통과시킨다.',
      '가는 줄을 굵은 줄을 따라 7~10회 감는다.',
      '가는 줄을 다시 고리에 넣고 반대 방향으로 7~10회 감는다.',
      '양쪽 줄을 동시에 당겨 조인한다.',
    ],
    tips: [
      'FG 매듭이 어렵다면 대안으로 많이 사용한다.',
      '감는 횟수는 줄 굵기 차이에 따라 조절한다.',
    ],
  },
  {
    slug: 'blood',
    nameKo: '블러드 매듭',
    nameEn: 'Blood Knot',
    category: 'connection',
    icon: '🩸',
    summary: '비슷한 굵기의 두 줄을 연결하는 클래식 매듭',
    difficulty: 'medium',
    strength: '줄 강도 약 85% 유지',
    steps: [
      '두 줄을 X자로 교차시킨다.',
      '한쪽 줄 끝을 반대쪽 줄을 따라 5~7회 감는다.',
      '같은 방법으로 다른 줄도 반대 방향으로 5~7회 감는다.',
      '양쪽 줄 끝을 교차된 고리에 넣는다.',
      '네 줄을 동시에 당겨 매듭 중앙으로 모은다.',
    ],
    tips: [
      '플라이 낚시 티펫 연결에 자주 쓰인다.',
      '줄 굵기가 비슷할수록 강도가 잘 나온다.',
    ],
  },
  {
    slug: 'double-uni',
    nameKo: '더블 유니 매듭',
    nameEn: 'Double Uni Knot',
    category: 'connection',
    icon: '⛓️',
    summary: '두 줄을 각각 유니 매듭으로 묶어 연결하는 방법',
    difficulty: 'easy',
    strength: '줄 강도 약 80~85% 유지',
    steps: [
      '두 줄을 15~20cm 겹치게 놓는다.',
      '한쪽 줄로 다른 줄에 유니 매듭을 5~7회 감아 만든다.',
      '반대쪽 줄로도 같은 방식으로 유니 매듭을 만든다.',
      '양쪽 본줄을 동시에 당겨 두 매듭이 맞닿게 한다.',
      '여분 줄을 잘라낸다.',
    ],
    tips: [
      'PE와 모노·플루oro 연결에 실용적이다.',
      '매듭이 서로 밀착될 때까지 천천히 당긴다.',
    ],
  },
  {
    slug: 'surgeons',
    nameKo: '외과 매듭',
    nameEn: 'Surgeon\'s Knot',
    category: 'connection',
    icon: '🪡',
    summary: '빠르게 두 줄을 연결할 때 쓰는 간단한 매듭',
    difficulty: 'easy',
    strength: '줄 강도 약 75~80% 유지',
    steps: [
      '두 줄을 15cm 정도 겹쳐 놓는다.',
      '겹친 부분으로 고리를 하나 만든다.',
      '고리 안으로 두 줄을 함께 2회 통과시킨다.',
      '고리와 줄 끝을 잡고 천천히 당겨 조인다.',
      '남은 줄을 잘라낸다.',
    ],
    tips: [
      '플라이 낚시 리더 연결·임시 수리에 유용하다.',
      '3회 통과하면 더 단단해지지만 줄 두께가 불균일해질 수 있다.',
    ],
  },
  {
    slug: 'perfection-loop',
    nameKo: '퍼펙션 루프',
    nameEn: 'Perfection Loop',
    category: 'loop',
    icon: '⭕',
    summary: '줄 끝에 깔끔한 고정 고리를 만드는 매듭',
    difficulty: 'medium',
    strength: '줄 강도 약 85% 유지',
    steps: [
      '줄 끝으로 작은 고리를 하나 만든다.',
      '줄 끝을 고리 뒤로 감아 두 번째 고리를 만든다.',
      '줄 끝을 두 고리 사이에 통과시킨다.',
      '첫 번째 고리를 잡고 천천히 당겨 고리를 완성한다.',
      '고리 크기를 확인한 뒤 여분을 잘라낸다.',
    ],
    tips: [
      '플라이·루어 연결용 루프를 만들 때 사용한다.',
      '고리 크기는 매듭을 조이기 전에 조절한다.',
    ],
  },
  {
    slug: 'surgeons-loop',
    nameKo: '외과의사 루프',
    nameEn: 'Surgeon\'s Loop',
    category: 'loop',
    icon: '🔁',
    summary: '줄 중간이나 끝에 고리를 빠르게 만드는 매듭',
    difficulty: 'easy',
    strength: '줄 강도 약 80% 유지',
    steps: [
      '줄을 접어 이중 고리를 만든다.',
      '고리 아래 부분으로 작은 고리를 하나 더 만든다.',
      '이중 줄 전체를 작은 고리에 2~3회 통과시킨다.',
      '고리와 본줄을 잡고 천천히 당겨 조인다.',
      '고리 크기를 확인한다.',
    ],
    tips: [
      '드로퍼 리그·멀티 훅 낚시에 활용한다.',
      'PE보다 모노·플루oro에서 더 안정적이다.',
    ],
  },
  {
    slug: 'dropper-loop',
    nameKo: '드로퍼 루프',
    nameEn: 'Dropper Loop',
    category: 'loop',
    icon: '📎',
    summary: '본줄에 직각으로 가지줄을 달 때 쓰는 매듭',
    difficulty: 'medium',
    strength: '줄 강도 약 75% 유지',
    steps: [
      '본줄에 20cm 정도의 여유 구간을 만든다.',
      '여유 구간을 여러 번 감아 작은 코일을 만든다.',
      '감은 코일 중간에 손가락으로 고리를 만든다.',
      '코일 한쪽 끝을 고리에 넣고 당긴다.',
      '고리가 직각으로 나오도록 천천히 조인다.',
    ],
    tips: [
      '원투·바다낚시에서 추가 바늘을 달 때 사용한다.',
      '고리 방향이 틀어지면 다시 묶는 것이 안전하다.',
    ],
  },
  {
    slug: 'arbor',
    nameKo: '축 매듭',
    nameEn: 'Arbor Knot',
    category: 'reel',
    icon: '🎯',
    summary: '낚싯줄을 릴 스풀(축)에 고정하는 매듭',
    difficulty: 'very-easy',
    strength: '릴 고정용 (낚시 중 풀림 방지)',
    steps: [
      '줄 끝을 릴 축에 한 바퀴 감는다.',
      '줄 끝으로 본줄 주위에 오버핸드 매듭을 만든다.',
      '본줄 쪽 매듭을 릴 축 쪽으로, 줄 끝 매듭을 바깥쪽으로 배치한다.',
      '본줄을 당겨 축에 줄이 닿게 조인다.',
      '릴에 줄을 감기 전에 매듭이 단단히 고정됐는지 확인한다.',
    ],
    tips: [
      'PE 라인은 스풀에 테이프를 붙인 뒤 매듭을 하면 미끄럼을 줄일 수 있다.',
      '릴 감기 전에 줄이 스풀에 밀착되도록 약간의 장력을 준다.',
    ],
  },
];

export function getKnotBySlug(slug: string): Knot | undefined {
  return KNOTS.find((k) => k.slug === slug);
}

export function getDifficultyBadgeClass(difficulty: KnotDifficulty): string {
  if (difficulty === 'very-easy' || difficulty === 'easy') return 'site-badge-green';
  if (difficulty === 'hard') return 'site-badge-amber';
  return 'site-badge-muted';
}
