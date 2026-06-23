import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import PageBackLink from '@/components/layout/PageBackLink';
import {
  KNOTS,
  KNOT_CATEGORY_LABEL,
  KNOT_DIFFICULTY_LABEL,
  getDifficultyBadgeClass,
  getKnotBySlug,
} from '@/data/knots';

export function generateStaticParams() {
  return KNOTS.map((knot) => ({ slug: knot.slug }));
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

  return (
    <main>
      <PageHeader title="낚시 매듭" description="단계별 매듭 가이드" />

      <div className="site-container site-page-body page-narrow">
        <PageBackLink href="/fishing-info/knots" label="매듭 목록으로" />

        <div className="knot-detail-hero">
          <div className="knot-detail-icon">{knot.icon}</div>
          <div className="knot-detail-head">
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
            <p className="knot-detail-strength">💪 {knot.strength}</p>
          )}
        </div>

        <div className="detail-card" style={{ marginBottom: 16 }}>
          <h2 className="detail-card-title">묶는 방법</h2>
          <ol className="knot-detail-steps">
            {knot.steps.map((step, index) => (
              <li key={step} className="knot-detail-step">
                <span className="knot-detail-step-num">{index + 1}</span>
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
                <Link key={item.slug} href={`/fishing-info/knots/${item.slug}`} className="knot-related-card">
                  <span className="knot-related-icon">{item.icon}</span>
                  <div>
                    <div className="knot-related-name">{item.nameKo}</div>
                    <div className="post-meta-muted">{item.nameEn}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
