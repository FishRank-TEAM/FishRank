'use client';

type Props = {
  count: number;
  onClick: () => void;
};

export default function EncyclopediaEditLogTrigger({ count, onClick }: Props) {
  if (count <= 0) return null;

  return (
    <button
      type="button"
      className="encyclopedia-edit-log-trigger"
      onClick={onClick}
      aria-label={`수정 기록 ${count}건 보기`}
    >
      <span className="encyclopedia-edit-log-trigger-icon" aria-hidden>
        ↺
      </span>
      <span className="encyclopedia-edit-log-trigger-text">기록</span>
      <span className="encyclopedia-edit-log-trigger-badge">{count}</span>
    </button>
  );
}
