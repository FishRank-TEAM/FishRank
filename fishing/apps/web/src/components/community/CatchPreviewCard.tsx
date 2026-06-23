'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatLength } from '@/lib/utils';
import { getImageUrl } from '@/lib/images';

export default function CatchPreviewCard({ catchId }: { catchId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['catch-preview', catchId],
    queryFn: async () => {
      const res = await api.get(`/catches/${catchId}`);
      return res.data.data;
    },
  });

  if (isLoading || !data) {
    return <div className="catch-preview-loading">불러오는 중...</div>;
  }

  return (
    <div className="catch-preview">
      <div className="catch-preview-thumb">
        {data.imageUrl ? (
          <img src={getImageUrl(data.imageUrl) ?? ''} alt="낚시 기록" />
        ) : (
          <span>🐟</span>
        )}
      </div>
      <div>
        <div className="catch-preview-tags">
          {data.fishSpecies && (
            <span className="site-badge site-badge-blue">{data.fishSpecies.nameKo}</span>
          )}
          {data.certification?.grade && (
            <span className="site-badge site-badge-green">AI {data.certification.grade}</span>
          )}
        </div>
        <div className="catch-preview-length">{formatLength(data.lengthCm)}</div>
      </div>
    </div>
  );
}
