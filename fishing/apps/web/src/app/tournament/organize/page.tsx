'use client';

import { useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/images';
import PageHeader from '@/components/layout/PageHeader';

const STATUS_OPTIONS = [
  { value: 'upcoming', label: '예정' },
  { value: 'active', label: '진행중' },
  { value: 'closed', label: '마감' },
  { value: 'finished', label: '종료' },
] as const;

const NOTE_LABELS: Record<string, string> = {
  date_missing: '촬영 시각 없음',
  gps_missing: 'GPS 없음',
  code_date_unverified: '촬영일을 코드 날짜와 대조하지 못함',
  spot_unverified: '포인트 GPS를 확인하지 못함',
};

function noteLabel(note?: string | null) {
  if (!note) return '';
  return note.split(',').map((part) => NOTE_LABELS[part] ?? part).join(', ');
}

const EMPTY = {
  title: '',
  description: '',
  category: 'freshwater',
  region: '',
  fishSpeciesId: '',
  minLengthCm: '',
  maxLengthCm: '',
  sponsorName: '',
  prize: '',
  prizeAmount: '',
  maxEntries: '',
  startAt: '',
  endAt: '',
  rules: '',
  spotLat: '',
  spotLng: '',
  spotRadiusKm: '',
};

export default function OrganizeTournamentPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['organized-tournaments'],
    queryFn: async () => (await api.get('/tournaments/organized')).data.data,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: form.title,
        description: form.description,
        category: form.category,
        region: form.region || undefined,
        fishSpeciesId: form.fishSpeciesId ? Number(form.fishSpeciesId) : undefined,
        minLengthCm: form.minLengthCm ? Number(form.minLengthCm) : undefined,
        maxLengthCm: form.maxLengthCm ? Number(form.maxLengthCm) : undefined,
        sponsorName: form.sponsorName || undefined,
        prize: form.prize || undefined,
        prizeAmount: form.prizeAmount ? Number(form.prizeAmount) : undefined,
        maxEntries: form.maxEntries ? Number(form.maxEntries) : undefined,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        rules: form.rules || undefined,
        spotLat: form.spotLat ? Number(form.spotLat) : undefined,
        spotLng: form.spotLng ? Number(form.spotLng) : undefined,
        spotRadiusKm: form.spotRadiusKm ? Number(form.spotRadiusKm) : undefined,
        status: 'upcoming',
      };
      return (await api.post('/tournaments/organized', body)).data.data;
    },
    onSuccess: () => {
      setForm(EMPTY);
      setMessage('무료 대회를 만들었습니다. 참가비는 받지 않습니다.');
      queryClient.invalidateQueries({ queryKey: ['organized-tournaments'] });
    },
    onError: (error: { response?: { data?: { message?: string | string[] } } }) => {
      const apiMessage = error.response?.data?.message;
      setMessage(Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage || '대회를 만들지 못했습니다.');
    },
  });

  const { data: participants } = useQuery({
    queryKey: ['tournament-participants', openId],
    queryFn: async () => (await api.get(`/tournaments/organized/${openId}/participants`)).data.data,
    enabled: !!openId,
  });

  const { data: managedCode } = useQuery({
    queryKey: ['tournament-day-code', openId],
    queryFn: async () => (await api.get(`/tournaments/organized/${openId}/day-code`)).data.data as { codeDate: string; code: string | null },
    enabled: !!openId,
  });

  const { data: claims } = useQuery({
    queryKey: ['tournament-day-claims', openId],
    queryFn: async () => (await api.get(`/tournaments/organized/${openId}/day-code-claims`)).data.data,
    enabled: !!openId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/tournaments/organized/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organized-tournaments'] }),
  });

  const codeMutation = useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) => api.post(`/tournaments/${id}/day-code`, { code }),
    onSuccess: (_data, variables) => {
      setMessage('오늘 코드를 저장했습니다. 현장에 있는 참가자에게만 알려 주세요.');
      queryClient.invalidateQueries({ queryKey: ['tournament-day-code', variables.id] });
    },
    onError: (error: { response?: { data?: { message?: string | string[] } } }) => {
      const apiMessage = error.response?.data?.message;
      setMessage(Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage || '코드를 저장하지 못했습니다.');
    },
  });

  const claimMutation = useMutation({
    mutationFn: ({ tournamentId, catchId, status }: { tournamentId: string; catchId: string; status: 'accepted' | 'rejected' }) =>
      api.patch(`/tournaments/organized/${tournamentId}/day-code-claims/${catchId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournament-day-claims', openId] }),
  });

  const disqualifyMutation = useMutation({
    mutationFn: ({ tournamentId, userId, disqualified }: { tournamentId: string; userId: string; disqualified: boolean }) =>
      api.patch(`/tournaments/organized/${tournamentId}/participants/${userId}`, { disqualified }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournament-participants', openId] }),
  });

  async function downloadCsv(id: string) {
    const res = await api.get(`/tournaments/organized/${id}/export`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tournament-${id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const set = (key: keyof typeof EMPTY) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  return (
    <main>
      <PageHeader
        title="대회 운영"
        description="낚시점과 포인트가 여는 대회입니다. 참가비는 없고, 상은 후원으로 안내합니다."
      />
      <div className="site-container site-page-body" style={{ maxWidth: 760 }}>
        <form
          className="admin-panel"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage('');
            createMutation.mutate();
          }}
        >
          <label className="admin-muted">이름<input className="admin-input" value={form.title} onChange={set('title')} required /></label>
          <label className="admin-muted">설명<textarea className="admin-input" rows={3} value={form.description} onChange={set('description')} required /></label>
          <label className="admin-muted">
            구분
            <select className="admin-input" value={form.category} onChange={set('category')}>
              <option value="freshwater">민물</option>
              <option value="saltwater">바다</option>
              <option value="all">전체</option>
            </select>
          </label>
          <label className="admin-muted">지역<input className="admin-input" value={form.region} onChange={set('region')} placeholder="예: 경남 거제" /></label>
          <label className="admin-muted">포인트 위도<input className="admin-input" value={form.spotLat} onChange={set('spotLat')} inputMode="decimal" placeholder="예: 34.88000" /></label>
          <label className="admin-muted">포인트 경도<input className="admin-input" value={form.spotLng} onChange={set('spotLng')} inputMode="decimal" placeholder="예: 128.62100" /></label>
          <label className="admin-muted">현장 반경 km (비우면 5)<input className="admin-input" value={form.spotRadiusKm} onChange={set('spotRadiusKm')} inputMode="decimal" placeholder="0.5~30" /></label>
          <label className="admin-muted">어종 ID (선택)<input className="admin-input" value={form.fishSpeciesId} onChange={set('fishSpeciesId')} inputMode="numeric" /></label>
          <label className="admin-muted">최소 체장 cm<input className="admin-input" value={form.minLengthCm} onChange={set('minLengthCm')} inputMode="decimal" /></label>
          <label className="admin-muted">최대 체장 cm<input className="admin-input" value={form.maxLengthCm} onChange={set('maxLengthCm')} inputMode="decimal" /></label>
          <label className="admin-muted">후원<input className="admin-input" value={form.sponsorName} onChange={set('sponsorName')} /></label>
          <label className="admin-muted">상 안내<input className="admin-input" value={form.prize} onChange={set('prize')} placeholder="예: 1등 상품권" /></label>
          <label className="admin-muted">상 금액(원, 안내)<input className="admin-input" value={form.prizeAmount} onChange={set('prizeAmount')} inputMode="numeric" /></label>
          <label className="admin-muted">시작<input className="admin-input" type="datetime-local" value={form.startAt} onChange={set('startAt')} required /></label>
          <label className="admin-muted">종료<input className="admin-input" type="datetime-local" value={form.endAt} onChange={set('endAt')} required /></label>
          <label className="admin-muted">규칙<textarea className="admin-input" rows={3} value={form.rules} onChange={set('rules')} /></label>
          <button type="submit" className="admin-btn-primary" disabled={createMutation.isPending}>무료 대회 만들기</button>
          {message && <p className="admin-note">{message}</p>}
        </form>

        <section className="admin-panel" style={{ marginTop: 24 }}>
          <h2>내가 연 대회</h2>
          {isLoading ? (
            <p className="admin-muted">불러오는 중...</p>
          ) : !data?.length ? (
            <p className="admin-muted">아직 없습니다.</p>
          ) : (
            data.map((tournament: { id: string; title: string; region?: string | null; sponsorName?: string | null; status: string }) => (
              <div key={tournament.id} style={{ marginBottom: 16 }}>
                <p>
                  <Link href={`/tournament/${tournament.id}`}>{tournament.title}</Link>
                  <span className="admin-muted">
                    {tournament.region ? ` · ${tournament.region}` : ''}
                    {tournament.sponsorName ? ` · ${tournament.sponsorName}` : ''}
                  </span>
                </p>
                <div className="admin-row-actions">
                  <select
                    className="admin-select-sm"
                    value={tournament.status}
                    onChange={(event) => statusMutation.mutate({ id: tournament.id, status: event.target.value })}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button type="button" className="admin-btn-ghost" onClick={() => downloadCsv(tournament.id)}>결과 CSV</button>
                  <button type="button" className="admin-btn-ghost" onClick={() => setOpenId(openId === tournament.id ? null : tournament.id)}>
                    {openId === tournament.id ? '닫기' : '운영'}
                  </button>
                </div>
                {openId === tournament.id && (
                  <div>
                    <div className="admin-row-actions">
                      <input
                        className="admin-input"
                        value={codes[tournament.id] ?? managedCode?.code ?? ''}
                        placeholder="오늘 코드 4~12자"
                        maxLength={12}
                        onChange={(event) => setCodes((prev) => ({ ...prev, [tournament.id]: event.target.value }))}
                      />
                      <button
                        type="button"
                        className="admin-btn-primary"
                        disabled={codeMutation.isPending}
                        onClick={() => codeMutation.mutate({
                          id: tournament.id,
                          code: codes[tournament.id] ?? managedCode?.code ?? '',
                        })}
                      >
                        오늘 코드 저장
                      </button>
                    </div>
                    <p className="admin-muted">
                      {managedCode?.code
                        ? `${managedCode.codeDate} 코드가 등록되어 있습니다. 공개 페이지에는 코드가 나오지 않습니다.`
                        : '오늘 코드가 없으면 순위는 기간 안 인증 기록을 그대로 집계합니다.'}
                    </p>
                    <h3>코드 제출</h3>
                    {!claims?.length ? (
                      <p className="admin-muted">제출이 없습니다.</p>
                    ) : (
                      <ul>
                        {claims.map((claim: {
                          id: string;
                          lengthCm?: string | number | null;
                          status: string;
                          imageUrl?: string | null;
                          claimedDayCode?: string | null;
                          dayCodeStatus?: string | null;
                          integrityNote?: string | null;
                          photoTakenAt?: string | null;
                          spotDistanceKm?: number | null;
                          user: { nickname: string };
                        }) => {
                          const image = getImageUrl(claim.imageUrl);
                          const flags = noteLabel(claim.integrityNote);
                          const taken = claim.photoTakenAt
                            ? new Date(claim.photoTakenAt).toLocaleString('ko-KR')
                            : '';
                          return (
                            <li key={claim.id}>
                              {claim.user.nickname}
                              {' · '}{claim.claimedDayCode}
                              {' · '}{claim.dayCodeStatus}
                              {claim.lengthCm ? ` · ${Number(claim.lengthCm).toFixed(1)}cm` : ''}
                              {' · 인증 '}{claim.status}
                              {taken ? ` · 촬영 ${taken}` : ''}
                              {claim.spotDistanceKm != null ? ` · 포인트 ${claim.spotDistanceKm}km` : ''}
                              {flags ? ` · ${flags}` : ''}
                              {image && (
                                <>
                                  {' '}
                                  <a href={image} target="_blank" rel="noreferrer">사진</a>
                                </>
                              )}
                              <button
                                type="button"
                                className="admin-btn-primary"
                                onClick={() => claimMutation.mutate({ tournamentId: tournament.id, catchId: claim.id, status: 'accepted' })}
                              >
                                수락
                              </button>
                              <button
                                type="button"
                                className="admin-btn-ghost"
                                onClick={() => claimMutation.mutate({ tournamentId: tournament.id, catchId: claim.id, status: 'rejected' })}
                              >
                                거절
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <h3>참가자</h3>
                    <ul>
                      {(participants ?? []).map((entry: { id: string; userId: string; disqualified: boolean; user: { nickname: string } }) => (
                        <li key={entry.id}>
                          {entry.user.nickname}
                          {entry.disqualified ? ' · 실격' : ''}
                          <button
                            type="button"
                            className="admin-btn-ghost"
                            onClick={() => disqualifyMutation.mutate({
                              tournamentId: tournament.id,
                              userId: entry.userId,
                              disqualified: !entry.disqualified,
                            })}
                          >
                            {entry.disqualified ? '복귀' : '실격'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
