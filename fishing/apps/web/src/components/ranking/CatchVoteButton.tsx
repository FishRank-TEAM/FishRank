'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  catchId: string;
  initialVoteCount: number;
  ownerId: string;
}

export default function CatchVoteButton({ catchId, initialVoteCount, ownerId }: Props) {
  const router = useRouter();
  const { isLoggedIn, user } = useAuthStore();
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  const isOwn = user?.id === ownerId;

  const handleVote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }
    if (isOwn) return;

    setLoading(true);
    try {
      const res = await api.post(`/catches/${catchId}/vote`);
      const { voted: nextVoted, voteCount: nextCount } = res.data.data;
      setVoted(nextVoted);
      setVoteCount(nextCount);
    } catch {
      // ignore — user sees unchanged count
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleVote}
      disabled={loading || isOwn}
      title={isOwn ? '본인 기록에는 추천할 수 없어요' : '이 기록 추천하기'}
      className={`catch-vote-btn${voted ? ' catch-vote-btn-active' : ''}${isOwn ? ' catch-vote-btn-disabled' : ''}`}
    >
      <span aria-hidden>{voted ? '👍' : '👍🏻'}</span>
      <span>{voteCount}</span>
    </button>
  );
}
