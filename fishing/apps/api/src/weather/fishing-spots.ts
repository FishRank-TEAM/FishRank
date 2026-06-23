export type FishingSpot = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  type: 'sea' | 'fresh' | 'mixed';
};

export const PRESET_FISHING_SPOTS: FishingSpot[] = [
  { id: 'seoul', name: '서울 (한강)', region: '서울', lat: 37.5665, lng: 126.978, type: 'fresh' },
  { id: 'incheon', name: '인천 영종도', region: '인천', lat: 37.492, lng: 126.493, type: 'sea' },
  { id: 'ganghwa', name: '강화도', region: '인천', lat: 37.707, lng: 126.486, type: 'sea' },
  { id: 'daepo', name: '양양 대포항', region: '강원', lat: 38.078, lng: 128.624, type: 'sea' },
  { id: 'sokcho', name: '속초', region: '강원', lat: 38.207, lng: 128.592, type: 'sea' },
  { id: 'gangneung', name: '강릉 경포대', region: '강원', lat: 37.805, lng: 128.896, type: 'sea' },
  { id: 'pohang', name: '포항 구룡포', region: '경북', lat: 36.008, lng: 129.555, type: 'sea' },
  { id: 'busan', name: '부산 해운대', region: '부산', lat: 35.1588, lng: 129.1603, type: 'sea' },
  { id: 'yeosu', name: '여수 돌산도', region: '전남', lat: 34.739, lng: 127.745, type: 'sea' },
  { id: 'mokpo', name: '목포', region: '전남', lat: 34.792, lng: 126.382, type: 'sea' },
  { id: 'wando', name: '완도', region: '전남', lat: 34.315, lng: 126.755, type: 'sea' },
  { id: 'jeju', name: '제주 서귀포', region: '제주', lat: 33.254, lng: 126.560, type: 'sea' },
  { id: 'namhan', name: '남한강', region: '경기', lat: 37.517, lng: 127.523, type: 'fresh' },
  { id: 'paldang', name: '팔당댐', region: '경기', lat: 37.539, lng: 127.279, type: 'fresh' },
  { id: 'chungju', name: '충주호', region: '충북', lat: 36.971, lng: 127.933, type: 'fresh' },
];
