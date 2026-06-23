'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '', nickname: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      return setError('비밀번호는 8자 이상이어야 합니다.');
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'email', label: '이메일', type: 'email', placeholder: '이메일 주소' },
    { name: 'nickname', label: '닉네임', type: 'text', placeholder: '예: 거제바다킹 (2~20자)' },
    { name: 'password', label: '비밀번호', type: 'password', placeholder: '8자 이상' },
  ];

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-icon">🎣</div>
          <h2 className="auth-card-title">FishRank 가입</h2>
          <p className="auth-card-desc">무료로 시작하고 랭킹에 올라보세요</p>
        </div>

        <form onSubmit={handleSubmit}>
          {fields.map((field) => (
            <div key={field.name} className="site-form-field">
              <label className="site-form-label">{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={form[field.name as keyof typeof form]}
                onChange={handleChange}
                placeholder={field.placeholder}
                required
                className="site-form-input"
              />
            </div>
          ))}

          {error && <div className="site-alert-error">⚠️ {error}</div>}

          <button type="submit" disabled={loading} className="site-btn-primary" style={{ marginBottom: 16 }}>
            {loading ? '가입 중...' : '무료 가입하기'}
          </button>
        </form>

        <p style={{ textAlign: 'center', margin: 0, fontSize: '13px', color: 'var(--text-sub)' }}>
          이미 계정이 있으신가요?{' '}
          <Link href="/auth/login" style={{ color: 'var(--ocean-bright)', fontWeight: 700 }}>
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
