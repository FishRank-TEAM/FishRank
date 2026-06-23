import { getImageUrl } from '@/lib/images';
import type { UserGear } from './ProfileGearEditor';

type Props = {
  bio?: string | null;
  gears?: UserGear[];
};

export default function ProfileBioGearSection({ bio, gears = [] }: Props) {
  if (!bio && gears.length === 0) return null;

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #dde3ea', padding: '24px 28px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {bio && (
          <section style={{ marginBottom: gears.length > 0 ? '24px' : 0 }}>
            <h2 style={{ margin: '0 0 10px', fontSize: '16px' }}>🙋 자기소개</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#37474f', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {bio}
            </p>
          </section>
        )}

        {gears.length > 0 && (
          <section>
            <h2 style={{ margin: '0 0 14px', fontSize: '16px' }}>🎣 내 장비</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {gears.map((gear) => (
                <div key={gear.id} style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #dde3ea', background: '#fff' }}>
                  <div style={{ height: '130px', background: '#f5f7fa' }}>
                    {gear.imageUrl ? (
                      <img src={getImageUrl(gear.imageUrl)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>🎣</div>
                    )}
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a2332', marginBottom: '4px' }}>{gear.title}</div>
                    {gear.description && (
                      <p style={{ margin: 0, fontSize: '12px', color: '#546e7a', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {gear.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
