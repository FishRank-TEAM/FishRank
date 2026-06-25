'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/images';

const STATUS_OPTIONS = ['upcoming', 'active', 'closed', 'finished'];
const STATUS_LABELS: Record<string, string> = { upcoming: '예정', active: '진행중', closed: '마감', finished: '종료' };

const EMPTY_FORM = {
  title: '', description: '', category: 'freshwater', isFree: true,
  entryFee: 0, prize: '', prizeAmount: 0, maxEntries: 100,
  startAt: '', endAt: '', rules: '', status: 'upcoming',
};

export default function AdminTournamentsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const { data: tournaments } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: async () => (await api.get('/tournaments')).data.data,
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/tournaments', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => api.patch(`/tournaments/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] });
      resetForm();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/tournaments/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tournaments/${id}`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      if (editId === id) resetForm();
    },
  });

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setBannerFile(null);
    setBannerPreview(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked
        : type === 'number' ? Number(value) : value,
    }));
  };

  const buildFormData = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) => fd.append(key, String(value)));
    if (bannerFile) fd.append('banner', bannerFile);
    return fd;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildFormData();
    if (editId) updateMutation.mutate({ id: editId, data: payload });
    else createMutation.mutate(payload);
  };

  const startEdit = (t: any) => {
    setEditId(t.id);
    setBannerFile(null);
    setBannerPreview(t.bannerUrl ? getImageUrl(t.bannerUrl) : null);
    setForm({
      title: t.title, description: t.description, category: t.category,
      isFree: t.isFree, entryFee: t.entryFee, prize: t.prize || '',
      prizeAmount: t.prizeAmount || 0, maxEntries: t.maxEntries || 100,
      startAt: t.startAt?.substring(0, 16) || '', endAt: t.endAt?.substring(0, 16) || '',
      rules: t.rules || '', status: t.status,
    });
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>대회 관리</h1>
        <p>대회를 생성·수정·삭제하고 진행 상태를 변경합니다.</p>
      </header>

      <div className="admin-tournament-grid">
        <section className="admin-panel">
          <h2>대회 목록</h2>
          {!tournaments?.length ? (
            <p className="admin-muted">등록된 대회가 없습니다.</p>
          ) : (
            tournaments.map((t: any) => (
              <div key={t.id} className="admin-tournament-row">
                <div>
                  <strong>{t.title}</strong>
                  <p className="admin-muted">
                    {t.category === 'saltwater' ? '바다' : t.category === 'all' ? '전체' : '민물'}
                    {' · '}{t.isFree ? '무료' : `${t.entryFee.toLocaleString()}원`}
                    {' · '}참가 {t._count?.entries ?? 0}명
                  </p>
                </div>
                <div className="admin-row-actions">
                  <select
                    value={t.status}
                    onChange={(e) => statusMutation.mutate({ id: t.id, status: e.target.value })}
                    className="admin-select-sm"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                  <button type="button" className="admin-btn-ghost" onClick={() => startEdit(t)}>수정</button>
                  <button
                    type="button"
                    className="admin-btn-danger"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      const entryCount = t._count?.entries ?? 0;
                      const msg = entryCount > 0
                        ? `"${t.title}" 대회를 삭제할까요?\n참가자 ${entryCount}명의 기록도 함께 삭제됩니다.`
                        : `"${t.title}" 대회를 삭제할까요?`;
                      if (!window.confirm(msg)) return;
                      deleteMutation.mutate(t.id);
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="admin-panel admin-form-panel">
          <h2>{editId ? '대회 수정' : '새 대회 만들기'}</h2>
          <form onSubmit={handleSubmit} className="admin-form">
            <label className="admin-field">
              <span>대회 이름</span>
              <input name="title" value={form.title} onChange={handleChange} required className="admin-input" />
            </label>
            <label className="admin-field">
              <span>설명</span>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} required className="admin-input" />
            </label>
            <div className="admin-form-row">
              <label className="admin-field">
                <span>분류</span>
                <select name="category" value={form.category} onChange={handleChange} className="admin-input">
                  <option value="freshwater">민물낚시</option>
                  <option value="saltwater">바다낚시</option>
                  <option value="all">전체</option>
                </select>
              </label>
              <label className="admin-field">
                <span>참가 유형</span>
                <select value={form.isFree.toString()} onChange={(e) => setForm((p) => ({ ...p, isFree: e.target.value === 'true' }))} className="admin-input">
                  <option value="true">무료</option>
                  <option value="false">유료</option>
                </select>
              </label>
            </div>
            {!form.isFree && (
              <div className="admin-form-row">
                <label className="admin-field">
                  <span>참가비 (원)</span>
                  <input name="entryFee" type="number" value={form.entryFee} onChange={handleChange} className="admin-input" />
                </label>
                <label className="admin-field">
                  <span>총 상금 (원)</span>
                  <input name="prizeAmount" type="number" value={form.prizeAmount} onChange={handleChange} className="admin-input" />
                </label>
              </div>
            )}
            <label className="admin-field">
              <span>상금 설명</span>
              <input name="prize" value={form.prize} onChange={handleChange} placeholder="1위 30만원 / 2위 15만원" className="admin-input" />
            </label>
            <div className="admin-form-row">
              <label className="admin-field">
                <span>시작일시</span>
                <input name="startAt" type="datetime-local" value={form.startAt} onChange={handleChange} required className="admin-input" />
              </label>
              <label className="admin-field">
                <span>종료일시</span>
                <input name="endAt" type="datetime-local" value={form.endAt} onChange={handleChange} required className="admin-input" />
              </label>
            </div>
            <label className="admin-field">
              <span>최대 참가 인원</span>
              <input name="maxEntries" type="number" value={form.maxEntries} onChange={handleChange} className="admin-input" />
            </label>
            <label className="admin-field">
              <span>대회 규정</span>
              <textarea name="rules" value={form.rules} onChange={handleChange} rows={4} className="admin-input" />
            </label>
            <label className="admin-field">
              <span>배너 이미지 (선택)</span>
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBannerFile(file);
                setBannerPreview(URL.createObjectURL(file));
              }} />
              {bannerPreview && <img src={bannerPreview} alt="" className="admin-banner-preview" />}
            </label>
            <div className="admin-form-actions">
              <button type="submit" className="admin-btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                {editId ? '수정 완료' : '대회 생성'}
              </button>
              {editId && <button type="button" className="admin-btn-ghost" onClick={resetForm}>취소</button>}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
