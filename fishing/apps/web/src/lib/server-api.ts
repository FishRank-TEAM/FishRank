const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json;
  } catch {
    return null;
  }
}

export type HomeRankingItem = {
  rank: number;
  user: { id: string; nickname: string; profileImage?: string | null };
  catch: { id: string; imageUrl?: string; locationName?: string; createdAt: string };
  fishSpecies?: { nameKo: string };
  lengthCm: number;
  rankScore: number;
  grade: string | null;
};

export type HomeTournament = {
  id: string;
  title: string;
  status: string;
  prizeAmount?: number | null;
  prize?: string | null;
  endAt: string;
  _count?: { entries: number };
};

export type HomePost = {
  id: string;
  title: string;
  createdAt: string;
  user: { nickname: string };
  _count?: { comments: number };
};

export type HomeAnnouncement = {
  id: string;
  type: 'notice' | 'event';
  title: string;
  content: string;
  linkUrl?: string | null;
  isPinned: boolean;
  createdAt: string;
};

export async function fetchHomeData() {
  const [rankingsData, tournaments, postsData, announcements] = await Promise.all([
    getJson<{ rankings: HomeRankingItem[] }>('/rankings?periodType=weekly&limit=8'),
    getJson<HomeTournament[]>('/tournaments?status=active'),
    getJson<{ items: HomePost[] }>('/posts?limit=5'),
    getJson<HomeAnnouncement[]>('/announcements?limit=3'),
  ]);

  return {
    rankings: rankingsData?.rankings ?? [],
    tournaments: Array.isArray(tournaments) ? tournaments : [],
    posts: postsData?.items ?? [],
    announcements: Array.isArray(announcements) ? announcements : [],
  };
}
