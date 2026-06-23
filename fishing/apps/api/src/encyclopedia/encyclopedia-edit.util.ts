export const ENCYCLOPEDIA_EDIT_FIELDS = [
  'season',
  'bait',
  'technique',
  'habitat',
  'summary',
  'imageUrl',
] as const;

export type EncyclopediaEditField = (typeof ENCYCLOPEDIA_EDIT_FIELDS)[number];

export const ENCYCLOPEDIA_FIELD_LABELS: Record<EncyclopediaEditField, string> = {
  season: '시즌',
  bait: '미끼',
  technique: '기법',
  habitat: '포인트',
  summary: '소개',
  imageUrl: '사진',
};

export type EncyclopediaEditChange = {
  field: EncyclopediaEditField;
  label: string;
  oldValue: string | null;
  newValue: string | null;
};

export function buildEncyclopediaChanges(
  before: Record<EncyclopediaEditField, string | null>,
  after: Record<EncyclopediaEditField, string | null>,
): EncyclopediaEditChange[] {
  const changes: EncyclopediaEditChange[] = [];

  for (const field of ENCYCLOPEDIA_EDIT_FIELDS) {
    const oldValue = before[field]?.trim() || null;
    const newValue = after[field]?.trim() || null;
    if (oldValue === newValue) continue;
    changes.push({
      field,
      label: ENCYCLOPEDIA_FIELD_LABELS[field],
      oldValue,
      newValue,
    });
  }

  return changes;
}
