import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { CATCH_UPLOAD_DISABLED_MESSAGE } from '@/lib/platform';

type Props = {
  backHref?: string;
  backLabel?: string;
  title?: string;
  message?: string;
};

export default function UploadDisabledNotice({
  backHref = '/my',
  backLabel = '내 프로필로',
  title = '모바일 앱 전용 기능',
  message,
}: Props) {
  const body = message ?? CATCH_UPLOAD_DISABLED_MESSAGE;
  return (
    <main>
      <PageHeader title="기록 업로드" description="줄자 인증 · AI 분석 · 랭킹 반영" />
      <div className="site-container site-page-body page-narrow">
        <div className="detail-card" style={{ textAlign: 'center', padding: '40px 28px' }}>
          <div className="site-empty-icon">📱</div>
          <h1 className="post-detail-title" style={{ fontSize: 20, marginBottom: 12 }}>
            {title}
          </h1>
          <p className="content-prose-sm" style={{ marginBottom: 28 }}>
            {body}
          </p>
          <Link href={backHref} className="site-btn-sm" style={{ display: 'inline-block', textDecoration: 'none', padding: '12px 24px' }}>
            {backLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}

export function UploadDisabledInline() {
  return (
    <div className="site-alert-error" style={{ marginBottom: 0 }}>
      📱 {CATCH_UPLOAD_DISABLED_MESSAGE}
    </div>
  );
}
