export const ENCYCLOPEDIA_SORT_OPTIONS = [
  { value: 'name', label: '가나다순' },
  { value: 'popular', label: '많이 잡히는 순' },
] as const;

export const ENCYCLOPEDIA_TECHNIQUE_OPTIONS = [
  { value: 'all', label: '전체 기법' },
  { value: 'lure', label: '루어' },
  { value: 'float', label: '찌낚시' },
  { value: 'bottom', label: '바닥·원투' },
  { value: 'fly', label: '플라이' },
  { value: 'ice', label: '얼음낚시' },
  { value: 'boat', label: '선상·갯바위' },
] as const;

export type EncyclopediaSort = (typeof ENCYCLOPEDIA_SORT_OPTIONS)[number]['value'];
export type EncyclopediaTechnique = (typeof ENCYCLOPEDIA_TECHNIQUE_OPTIONS)[number]['value'];
