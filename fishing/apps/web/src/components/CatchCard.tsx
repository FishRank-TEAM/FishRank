import { formatLength, formatTimeAgo } from '@/lib/utils';
import { getImageUrl } from '@/lib/images';

export default function CatchCard({ item, compact }: { item: any; compact?: boolean }) {
  const imgUrl = getImageUrl(item.imageUrl);

  return (
    <div style={{
      background: '#fff', border: '1px solid #dde3ea', borderRadius: '8px',
      padding: compact ? '12px 14px' : '14px 16px',
      display: 'flex', alignItems: 'center', gap: compact ? '12px' : '14px',
    }}>
      <div style={{
        width: compact ? '52px' : '60px', height: compact ? '52px' : '60px',
        borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#e3f2fd',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {imgUrl ? (
          <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: compact ? '20px' : '24px' }}>🐟</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
          {item.fishSpecies && (
            <span style={{ background: '#e3f2fd', color: '#0d47a1', fontSize: '10px', fontWeight: 500, borderRadius: '3px', padding: '2px 7px' }}>
              {item.fishSpecies.nameKo}
            </span>
          )}
          {item.certification?.grade && (
            <span style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: '10px', fontWeight: 500, borderRadius: '3px', padding: '2px 7px' }}>
              인증 {item.certification.grade}
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: '#546e7a' }}>
          {item.locationName && `📍 ${item.locationName} · `}
          {formatTimeAgo(item.createdAt)}
        </div>
      </div>
      <div style={{ fontSize: compact ? '18px' : '20px', fontWeight: 900, color: '#0b1f3a', letterSpacing: '-0.5px', flexShrink: 0 }}>
        {formatLength(item.lengthCm)}
      </div>
    </div>
  );
}
