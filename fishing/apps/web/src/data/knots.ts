export type {
  Knot,
  KnotCategory,
  KnotDifficulty,
  KnotSort,
} from '@fishrank/shared';

export {
  KNOTS,
  KNOT_CATEGORIES,
  KNOT_CATEGORY_LABEL,
  KNOT_DIFFICULTY_LABEL,
  KNOT_DIFFICULTY_ORDER,
  KNOT_SORT_OPTIONS,
  KNOTS_DISCLAIMER,
  getKnotBySlug,
  getAdjacentKnots,
  getFeaturedKnots,
  sortKnots,
  filterKnots,
} from '@fishrank/shared';

import type { KnotDifficulty } from '@fishrank/shared';

/** 웹 CSS 배지 클래스 — 앱 전용 */
export function getDifficultyBadgeClass(difficulty: KnotDifficulty): string {
  if (difficulty === 'very-easy' || difficulty === 'easy') return 'site-badge-green';
  if (difficulty === 'hard') return 'site-badge-amber';
  return 'site-badge-muted';
}
