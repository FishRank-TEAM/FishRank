import { getMobileQueryClient } from '@/lib/query-client';
import { api } from '@/lib/api';
import {
  DEFAULT_RANKING_SPECIES_ID,
  ALL_RANKING_SPECIES_ID,
} from '@fishrank/shared';

export function prefetchCatch(catchId: string) {
  return getMobileQueryClient().prefetchQuery({
    queryKey: ['catch', catchId],
    queryFn: async () => (await api.get(`/catches/${catchId}`)).data.data,
    staleTime: 5 * 60_000,
  });
}

export function prefetchProfile(nickname: string) {
  return getMobileQueryClient().prefetchQuery({
    queryKey: ['profile', nickname],
    queryFn: async () => (await api.get(`/users/profile/${nickname}`)).data.data,
    staleTime: 5 * 60_000,
  });
}

export function prefetchPost(postId: string) {
  return getMobileQueryClient().prefetchQuery({
    queryKey: ['post', postId],
    queryFn: async () => (await api.get(`/posts/${postId}`)).data.data,
    staleTime: 3 * 60_000,
  });
}

export function prefetchRankings(period = 'weekly', rankingType = 'official') {
  const speciesId = rankingType === 'unofficial' ? ALL_RANKING_SPECIES_ID : DEFAULT_RANKING_SPECIES_ID;
  return getMobileQueryClient().prefetchQuery({
    queryKey: ['rankings', period, rankingType, speciesId],
    queryFn: async () => {
      const res = await api.get('/rankings', {
        params: { periodType: period, limit: 30, rankingType, speciesId: speciesId || undefined },
      });
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

export function prefetchPosts() {
  return getMobileQueryClient().prefetchQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const res = await api.get('/posts', { params: { limit: 30 } });
      const payload = res.data.data;
      return payload?.items ?? payload ?? [];
    },
    staleTime: 60_000,
  });
}

export function prefetchWeather(lat: number, lng: number, label: string) {
  return getMobileQueryClient().prefetchQuery({
    queryKey: ['weather', lat, lng],
    queryFn: async () => {
      const res = await api.get('/weather', { params: { lat, lng, label } });
      return res.data.data;
    },
    staleTime: 3 * 60_000,
  });
}

export function prefetchAnnouncements() {
  return getMobileQueryClient().prefetchQuery({
    queryKey: ['announcements', 'latest'],
    queryFn: async () => {
      const res = await api.get('/announcements', { params: { limit: 1 } });
      const list = res.data.data;
      const item = Array.isArray(list) ? list[0] : list?.items?.[0];
      return item ?? null;
    },
    staleTime: 5 * 60_000,
  });
}

export function prefetchTournaments() {
  return getMobileQueryClient().prefetchQuery({
    queryKey: ['tournaments'],
    queryFn: async () => (await api.get('/tournaments')).data.data,
    staleTime: 5 * 60_000,
  });
}

export function prefetchEncyclopedia() {
  return getMobileQueryClient().prefetchQuery({
    queryKey: ['species'],
    queryFn: async () => (await api.get('/species')).data.data,
    staleTime: 30 * 60_000,
  });
}
