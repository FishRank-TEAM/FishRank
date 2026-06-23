'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/images';

export type UserGear = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
};

type Props = {
  gears: UserGear[];
  maxGears?: number;
};

const emptyForm = { title: '', description: '', image: null as File | null };

export default function ProfileGearEditor({ gears, maxGears = 6 }: Props) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setPreviewUrl(null);
    setError('');
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('title', form.title.trim());
      if (form.description.trim()) formData.append('description', form.description.trim());
      if (form.image) formData.append('image', form.image);

      if (editingId) {
        const res = await api.patch(`/users/me/gears/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data.data;
      }
      const res = await api.post('/users/me/gears', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      resetForm();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? '저장에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (gearId: string) => {
      await api.delete(`/users/me/gears/${gearId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const startEdit = (gear: UserGear) => {
    setEditingId(gear.id);
    setForm({ title: gear.title, description: gear.description ?? '', image: null });
    setPreviewUrl(getImageUrl(gear.imageUrl));
    setShowForm(true);
    setError('');
  };

  const onImageChange = (file: File | null) => {
    setForm((prev) => ({ ...prev, image: file }));
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      setError('장비 이름을 입력해 주세요.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#546e7a' }}>
          낚싯대, 릴, 루어 등 자주 쓰는 장비를 사진과 함께 소개해 보세요. (최대 {maxGears}개)
        </p>
        {!showForm && gears.length < maxGears && (
          <button type="button" className="site-btn-sm" onClick={() => { setShowForm(true); setError(''); }}>
            + 장비 추가
          </button>
        )}
      </div>

      {gears.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: showForm ? '16px' : 0 }}>
          {gears.map((gear) => (
            <div key={gear.id} style={{ border: '1px solid #dde3ea', borderRadius: '10px', overflow: 'hidden', background: '#fff' }}>
              <div style={{ height: '120px', background: '#f5f7fa' }}>
                {gear.imageUrl ? (
                  <img src={getImageUrl(gear.imageUrl)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🎣</div>
                )}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a2332', marginBottom: '4px' }}>{gear.title}</div>
                {gear.description && (
                  <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#546e7a', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {gear.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" onClick={() => startEdit(gear)} className="site-btn-sm" style={{ flex: 1 }}>
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(gear.id)}
                    disabled={deleteMutation.isPending}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ffcdd2', background: '#fff', color: '#c62828', cursor: 'pointer', fontSize: '12px' }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ border: '1px solid #dde3ea', borderRadius: '10px', padding: '16px', background: '#fafbfc' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>{editingId ? '장비 수정' : '장비 추가'}</h4>
          <div style={{ display: 'grid', gap: '10px' }}>
            <input
              type="text"
              placeholder="장비 이름 (예: 시마노 2500SHG)"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              maxLength={80}
              className="site-form-input"
            />
            <textarea
              placeholder="간단한 설명 (선택)"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              maxLength={500}
              rows={3}
              className="site-form-input"
              style={{ resize: 'vertical' }}
            />
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#546e7a', marginBottom: '6px' }}>사진 (선택)</label>
              <input type="file" accept="image/*" onChange={(e) => onImageChange(e.target.files?.[0] ?? null)} />
              {previewUrl && (
                <img src={previewUrl} alt="" style={{ marginTop: '8px', width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px' }} />
              )}
            </div>
          </div>
          {error && <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#c62828' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="site-btn-sm" onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? '저장 중...' : '저장'}
            </button>
            <button type="button" onClick={resetForm} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #dde3ea', background: '#fff', cursor: 'pointer' }}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
