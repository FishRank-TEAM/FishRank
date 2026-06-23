'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatTimeAgo } from '@/lib/utils';

const EMPTY = {
  type: 'notice' as 'notice' | 'event',
  title: '',
  content: '',
  linkUrl: '',
  isPinned: false,
  isPublished: true,
  startsAt: '',
  endsAt: '',
};

export default function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [editId, setEditId] = useState<string | null>(null);

  const { data: items } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => (await api.get('/admin/announcements')).data.data,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        type: form.type,
        title: form.title,
        content: form.content,
        linkUrl: form.linkUrl || undefined,
        isPinned: form.isPinned,
        isPublished: form.isPublished,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
      };
      if (editId) return api.patch(`/admin/announcements/${editId}`, payload);
      return api.post('/admin/announcements', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setForm({ ...EMPTY });
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
  });

  const startEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      type: item.type,
      title: item.title,
      content: item.content,
      linkUrl: item.linkUrl || '',
      isPinned: item.isPinned,
      isPublished: item.isPublished,
      startsAt: item.startsAt?.substring(0, 16) || '',
      endsAt: item.endsAt?.substring(0, 16) || '',
    });
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>공지·이벤트</h1>
        <p>서비스 공지와 이벤트를 등록·게시합니다. 상단 고정과 노출 기간을 설정할 수 있습니다.</p>
      </header>

      <div className="admin-announce-grid">
        <section className="admin-panel">
          <h2>등록된 항목</h2>
          {!items?.length ? (
            <p className="admin-muted">등록된 공지·이벤트가 없습니다.</p>
          ) : (
            items.map((item: any) => (
              <div key={item.id} className="admin-announce-row">
                <div>
                  <div className="admin-catch-top">
                    <span className={`admin-badge ${item.type === 'event' ? 'admin-badge-event' : ''}`}>
                      {item.type === 'event' ? '이벤트' : '공지'}
                    </span>
                    {item.isPinned && <span className="admin-badge admin-badge-warn">고정</span>}
                    {!item.isPublished && <span className="admin-badge admin-badge-danger">비공개</span>}
                  </div>
                  <strong>{item.title}</strong>
                  <p className="admin-muted">{formatTimeAgo(item.createdAt)} · {item.author?.nickname}</p>
                  <p className="admin-post-preview">{item.content.slice(0, 100)}{item.content.length > 100 ? '…' : ''}</p>
                </div>
                <div className="admin-row-actions">
                  <button type="button" className="admin-btn-ghost" onClick={() => startEdit(item)}>수정</button>
                  <button type="button" className="admin-btn-danger" onClick={() => {
                    if (window.confirm('삭제할까요?')) deleteMutation.mutate(item.id);
                  }}>삭제</button>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="admin-panel admin-form-panel">
          <h2>{editId ? '항목 수정' : '새 공지·이벤트'}</h2>
          <form className="admin-form" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
            <label className="admin-field">
              <span>유형</span>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'notice' | 'event' }))} className="admin-input">
                <option value="notice">공지</option>
                <option value="event">이벤트</option>
              </select>
            </label>
            <label className="admin-field">
              <span>제목</span>
              <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required className="admin-input" />
            </label>
            <label className="admin-field">
              <span>내용</span>
              <textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={6} required className="admin-input" />
            </label>
            <label className="admin-field">
              <span>링크 URL (선택)</span>
              <input value={form.linkUrl} onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))} placeholder="https://..." className="admin-input" />
            </label>
            <div className="admin-form-row">
              <label className="admin-field">
                <span>노출 시작</span>
                <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))} className="admin-input" />
              </label>
              <label className="admin-field">
                <span>노출 종료</span>
                <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))} className="admin-input" />
              </label>
            </div>
            <label className="admin-check">
              <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm((p) => ({ ...p, isPinned: e.target.checked }))} />
              상단 고정
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))} />
              공개 게시
            </label>
            <div className="admin-form-actions">
              <button type="submit" className="admin-btn-primary" disabled={saveMutation.isPending}>
                {editId ? '수정 저장' : '등록'}
              </button>
              {editId && (
                <button type="button" className="admin-btn-ghost" onClick={() => { setEditId(null); setForm({ ...EMPTY }); }}>취소</button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
