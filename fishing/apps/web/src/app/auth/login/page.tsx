'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken } = res.data.data;

      const meRes = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setAuth(meRes.data.data, accessToken, refreshToken);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-icon">🎣</div>
          <h2 className="auth-card-title">FishRank 로그인</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="site-form-field">
            <label className="site-form-label">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소"
              required
              className="site-form-input"
            />
          </div>

          <div className="site-form-field">
            <label className="site-form-label">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
              className="site-form-input"
            />
          </div>

          {error && <div className="site-alert-error">⚠️ {error}</div>}

          <button type="submit" disabled={loading} className="site-btn-primary" style={{ marginBottom: 16 }}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p style={{ textAlign: 'center', margin: 0, fontSize: '13px', color: 'var(--text-sub)' }}>
          계정이 없으신가요?{' '}
          <Link href="/auth/register" style={{ color: 'var(--ocean-bright)', fontWeight: 700 }}>
            무료 가입하기
          </Link>
        </p>
      </div>
    </main>
  );
}
