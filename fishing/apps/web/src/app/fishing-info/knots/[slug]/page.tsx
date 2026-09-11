import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import PageBackLink from '@/components/layout/PageBackLink';
import {
  KNOTS,
  KNOT_CATEGORY_LABEL,
  KNOT_DIFFICULTY_LABEL,
  KNOTS_DISCLAIMER,
  getAdjacentKnots,
  getDifficultyBadgeClass,
  getKnotBySlug,
} from '@/data/knots';

export function generateStaticParams() {
  return KNOTS.map((knot) => ({ slug: knot.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const knot = getKnotBySlug(slug);
  if (!knot) return { title: '매듭을 찾을 수 없습니다' };
  return {
    title: `${knot.nameKo} (${knot.nameEn}) | FishRank`,
    description: `${knot.summary} — ${KNOT_DIFFICULTY_LABEL[knot.difficulty]}, ${KNOT_CATEGORY_LABEL[knot.category]}`,
  };
}

export default async function KnotDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const knot = getKnotBySlug(slug);
  if (!knot) notFound();

  const related = KNOTS.filter(
    (item) => item.category === knot.category && item.slug !== knot.slug,
  ).slice(0, 3);
  const { prev, next } = getAdjacentKnots(knot.slug);

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: knot.nameKo,
    alternateName: knot.nameEn,
    description: knot.summary,
    step: knot.steps.map((text, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      text,
    })),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <PageHeader title="낚시 매듭" description="단계별 매듭 가이드" />

      <div className="site-container site-page-body page-narrow">
        <PageBackLink href="/fishing-info/knots" label="매듭 목록으로" />

        <div className="knot-detail-hero">
          <div className="knot-detail-icon" aria-hidden>
            {knot.icon}
          </div>
          <div>
            <h1 className="knot-detail-name">{knot.nameKo}</h1>
            <p className="knot-detail-en">{knot.nameEn}</p>
            <div className="knot-detail-badges">
              <span className={`site-badge ${getDifficultyBadgeClass(knot.difficulty)}`}>
                {KNOT_DIFFICULTY_LABEL[knot.difficulty]}
              </span>
              <span className="site-badge site-badge-muted">
                {KNOT_CATEGORY_LABEL[knot.category]}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-card" style={{ marginBottom: 16 }}>
          <h2 className="detail-card-title">용도</h2>
          <p className="content-prose-sm">{knot.summary}</p>
          {knot.strength && (
            <p className="knot-detail-strength">{knot.strength}</p>
          )}
          {knot.tags && knot.tags.length > 0 && (
            <div className="knot-detail-tags">
              {knot.tags.map((tag) => (
                <span key={tag} className="site-badge site-badge-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="detail-card" style={{ marginBottom: 16 }}>
          <h2 className="detail-card-title">묶는 방법</h2>
          <ol className="knot-detail-steps">
            {knot.steps.map((step, index) => (
              <li key={`${index}-${step}`} className="knot-detail-step">
                <span className="knot-detail-step-num" aria-hidden>
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {knot.tips.length > 0 && (
          <div className="detail-card" style={{ marginBottom: 16 }}>
            <h2 className="detail-card-title">팁</h2>
            <ul className="knot-detail-tips">
              {knot.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {related.length > 0 && (
          <section className="knot-related">
            <h2 className="info-section-title">같은 유형 매듭</h2>
            <div className="knot-related-grid">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/fishing-info/knots/${item.slug}`}
                  className="knot-related-card"
                >
                  <span className="knot-related-icon" aria-hidden>
                    {item.icon}
                  </span>
                  <div>
                    <div className="knot-related-name">{item.nameKo}</div>
                    <div className="post-meta-muted">{item.nameEn}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {(prev || next) && (
          <nav className="knot-adjacent" aria-label="이전·다음 매듭">
            {prev ? (
              <Link href={`/fishing-info/knots/${prev.slug}`} className="knot-adjacent-link">
                <span className="post-meta-muted">← 이전</span>
                <span className="knot-adjacent-name">{prev.nameKo}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/fishing-info/knots/${next.slug}`}
                className="knot-adjacent-link knot-adjacent-link--next"
              >
                <span className="post-meta-muted">다음 →</span>
                <span className="knot-adjacent-name">{next.nameKo}</span>
              </Link>
            ) : null}
          </nav>
        )}

        <div className="knots-disclaimer">{KNOTS_DISCLAIMER}</div>
      </div>
    </main>
  );
}
