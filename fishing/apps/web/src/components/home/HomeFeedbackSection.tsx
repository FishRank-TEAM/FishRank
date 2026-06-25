'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const CATEGORIES = [
  { value: 'bug', label: '버그·오류' },
  { value: 'feature', label: '기능 제안' },
  { value: 'improvement', label: '개선 의견' },
  { value: 'other', label: '기타' },
] as const;

function formatError(error: unknown): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return '피드백 전송에 실패했습니다.';
}

export default function HomeFeedbackSection() {
  const { isLoggedIn } = useAuthStore();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['value']>('improvement');
  const [content, setContent] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/feedbacks', { category, content: content.trim() });
      return res.data.data;
    },
    onSuccess: () => {
      setSubmitted(true);
      setContent('');
      setCategory('improvement');
    },
  });

  return (
    <section className="home-feedback" aria-labelledby="home-feedback-title">
      <div className="home-container">
        <div className="home-feedback-inner">
          <div className="home-feedback-intro">
            <h2 id="home-feedback-title">의견 보내기</h2>
            <p>
              FishRank을 쓰시면서 불편했던 점이나 원하시는 기능을 알려주세요.
              여러분의 의견이 서비스를 더 좋게 만듭니다.
            </p>
          </div>

          {submitted ? (
            <div className="home-feedback-success" role="status">
              <strong>피드백을 보내 주셔서 감사합니다.</strong>
              <p>관리자가 확인 후 반영 여부를 검토합니다.</p>
              <button type="button" className="home-btn home-btn-primary" onClick={() => setSubmitted(false)}>
                추가 의견 보내기
              </button>
            </div>
          ) : !isLoggedIn ? (
            <div className="home-feedback-login">
              <p>피드백을 남기려면 로그인이 필요합니다.</p>
              <Link href="/auth/login" className="home-btn home-btn-primary">
                로그인하기
              </Link>
            </div>
          ) : (
            <form
              className="home-feedback-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (content.trim().length < 10) return;
                mutation.mutate();
              }}
            >
              <label className="home-feedback-field" htmlFor="feedback-category">
                <span>분류</span>
                <select
                  id="feedback-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="home-feedback-field" htmlFor="feedback-content">
                <span>내용</span>
                <textarea
                  id="feedback-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="어떤 점이 불편했는지, 어떤 기능이 있으면 좋을지 자유롭게 적어 주세요. (10자 이상)"
                  rows={5}
                  maxLength={2000}
                  required
                />
              </label>

              <div className="home-feedback-actions">
                <span className="home-feedback-count">{content.length} / 2000</span>
                <button
                  type="submit"
                  className="home-btn home-btn-primary home-feedback-submit"
                  disabled={mutation.isPending || content.trim().length < 10}
                >
                  {mutation.isPending ? '보내는 중…' : '피드백 보내기'}
                </button>
              </div>

              {mutation.isError && (
                <p className="home-feedback-error" role="alert">
                  {formatError(mutation.error)}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
