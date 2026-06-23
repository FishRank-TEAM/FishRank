type Props = {
  grade?: string | null;
  className?: string;
};

const GRADE_LABELS: Record<string, string> = {
  S: 'S등급 — 최고 신뢰도',
  A: 'A등급 — 인증 반영',
  B: 'B등급 — 검수 대기',
};

export default function GradeBadge({ grade, className = 'ranking-row-grade' }: Props) {
  if (!grade) return null;
  const normalized = grade.toUpperCase();
  const gradeClass =
    normalized === 'S' || normalized === 'A' || normalized === 'B'
      ? `grade-badge-${normalized.toLowerCase()}`
      : '';
  return (
    <span className={`${className} ${gradeClass}`.trim()} title={GRADE_LABELS[normalized] ?? undefined}>
      {grade}
    </span>
  );
}
