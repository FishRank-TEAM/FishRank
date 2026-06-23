import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import {
  APP_CERTIFIED_REASONS,
  CATCH_UPLOAD_DISABLED_MESSAGE,
} from '@/lib/platform';

type Props = {
  backHref?: string;
  backLabel?: string;
  title?: string;
  message?: string;
  showReasons?: boolean;
};

export default function UploadDisabledNotice({
  backHref = '/ranking',
  backLabel = '랭킹으로',
  title = '모바일 앱 전용 — 공식 인증',
  message,
  showReasons = true,
}: Props) {
  const body = message ?? CATCH_UPLOAD_DISABLED_MESSAGE;
  return (
    <main>
      <PageHeader title="인증 기록 업로드" description="AR + AI 실시간 촬영 · 공식 랭킹" />
      <div className="site-container site-page-body page-narrow">
        <div className="upload-app-only-card">
          <div className="site-empty-icon">📱</div>
          <h1 className="upload-app-only-title">{title}</h1>
          <p className="upload-app-only-desc">{body}</p>

          {showReasons && (
            <ul className="upload-app-only-reasons">
              {APP_CERTIFIED_REASONS.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}

          <div className="upload-app-only-actions">
            <Link href="/upload/personal" className="site-btn site-btn-ghost">
              웹에서 자랑 기록 올리기
            </Link>
            <Link href={backHref} className="site-btn site-btn-primary">
              {backLabel}
            </Link>
          </div>

          <p className="upload-app-only-foot">
            FishRank 모바일 앱은 준비 중입니다. 출시 후 앱 스토어에서 설치할 수 있습니다.
          </p>
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
