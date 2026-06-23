'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatLength } from '@/lib/utils';
import RankBadge from '@/components/ranking/RankBadge';
import CatchThumbnail from '@/components/ranking/CatchThumbnail';
import CatchVoteButton from '@/components/ranking/CatchVoteButton';
import GradeBadge from '@/components/ranking/GradeBadge';
import RankingUserAvatar from '@/components/ranking/RankingUserAvatar';
import RankingLocationMeta from '@/components/ranking/RankingLocationMeta';
import ReportButton from '@/components/report/ReportButton';
import BragDetailModal from '@/components/ranking/BragDetailModal';

export interface RankingItem {
  rank: number;
  user: { id: string; nickname: string; profileImage?: string };
  catch: {
    id: string;
    imageUrl: string;
    locationName?: string;
    createdAt: string;
    memo?: string | null;
  };
  fishSpecies?: { id?: number; nameKo: string; rarityWeight?: number };
  lengthCm?: number | null;
  rankScore: number;
  voteCount?: number;
  grade?: string | null;
  verified?: boolean;
  recordType?: 'certified' | 'personal';
}

interface Props {
  item: RankingItem;
  variant?: 'default' | 'national';
}

function shouldIgnoreBragOpen(target: EventTarget | null) {
  return Boolean((target as HTMLElement | null)?.closest('a, button'));
}

export default function RankingCard({ item, variant = 'default' }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const isUnofficial = item.verified === false || item.recordType === 'personal';

  const openDetail = () => {
    if (isUnofficial) setDetailOpen(true);
  };

  if (variant === 'national') {
    return (
      <>
        <article
          className={`ranking-row-national${isUnofficial ? ' ranking-row-unofficial ranking-row-clickable' : ''}`}
          onClick={(event) => {
            if (!isUnofficial || shouldIgnoreBragOpen(event.target)) return;
            openDetail();
          }}
        >
          <RankBadge rank={item.rank} />

          <RankingUserAvatar
            nickname={item.user.nickname}
            profileImage={item.user.profileImage}
            size={36}
          />

          <div className="ranking-row-main">
            <Link href={`/profile/${item.user.nickname}`} className="ranking-row-name">
              {item.user.nickname}
            </Link>
            <RankingLocationMeta
              locationName={item.catch.locationName}
              createdAt={item.catch.createdAt}
            />
          </div>

          {isUnofficial && (
            <div className="ranking-row-badges">
              <button type="button" className="ranking-row-unofficial" onClick={openDetail}>
                자랑 보기
              </button>
            </div>
          )}

          <div className="ranking-row-stats">
            {isUnofficial ? (
              <CatchVoteButton
                catchId={item.catch.id}
                initialVoteCount={item.voteCount ?? Number(item.rankScore) ?? 0}
                ownerId={item.user.id}
              />
            ) : (
              <>
                <GradeBadge grade={item.grade} />
                <div className="ranking-row-cm">{formatLength(item.lengthCm)}</div>
              </>
            )}
            <ReportButton
              targetType="catch"
              targetId={item.catch.id}
              ownerId={item.user.id}
              className="ranking-row-report"
            />
          </div>
        </article>

        {detailOpen && <BragDetailModal item={item} onClose={() => setDetailOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <article
        className={`ranking-card${isUnofficial ? ' ranking-card-unofficial ranking-card-clickable' : ''}`}
        onClick={(event) => {
          if (!isUnofficial || shouldIgnoreBragOpen(event.target)) return;
          openDetail();
        }}
      >
        <RankBadge rank={item.rank} />
        <button
          type="button"
          className="ranking-card-thumb-btn"
          onClick={openDetail}
          disabled={!isUnofficial}
          aria-label={isUnofficial ? '자랑 상세 보기' : undefined}
        >
          <CatchThumbnail imageUrl={item.catch.imageUrl} size={44} />
        </button>

        <div className="ranking-card-body">
          <div className="ranking-card-name-row">
            <Link href={`/profile/${item.user.nickname}`} className="ranking-card-name">
              {item.user.nickname}
            </Link>
            {isUnofficial && (
              <button type="button" className="ranking-card-tag ranking-card-tag-unofficial" onClick={openDetail}>
                자랑 보기
              </button>
            )}
          </div>
          <RankingLocationMeta
            locationName={item.catch.locationName}
            createdAt={item.catch.createdAt}
            className="ranking-card-meta"
          />
        </div>

        <div className="ranking-card-score">
          {isUnofficial ? (
            <CatchVoteButton
              catchId={item.catch.id}
              initialVoteCount={item.voteCount ?? Number(item.rankScore) ?? 0}
              ownerId={item.user.id}
            />
          ) : (
            <>
              <GradeBadge grade={item.grade} className="ranking-card-tag ranking-card-tag-grade" />
              <div className="ranking-card-length">{formatLength(item.lengthCm)}</div>
            </>
          )}
          <ReportButton
            targetType="catch"
            targetId={item.catch.id}
            ownerId={item.user.id}
            className="ranking-card-report"
          />
        </div>
      </article>

      {detailOpen && <BragDetailModal item={item} onClose={() => setDetailOpen(false)} />}
    </>
  );
}
