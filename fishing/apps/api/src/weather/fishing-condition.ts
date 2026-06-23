export type FishingCondition = {
  label: string;
  color: string;
  desc: string;
  score: number;
};

export function getFishingCondition(input: {
  temp: number;
  windSpeed: number;
  precipitation: number;
  precipitationType: number;
  precipitationProb?: number | null;
}): FishingCondition {
  const { temp, windSpeed, precipitation, precipitationType, precipitationProb } = input;

  if (precipitation > 5 || [1, 2, 3, 4].includes(precipitationType) || (precipitationProb ?? 0) >= 70) {
    return { label: '낚시 비추천', color: '#e57373', desc: '강수·악천후로 위험할 수 있습니다', score: 1 };
  }
  if (windSpeed > 8) {
    return { label: '주의 필요', color: '#ffb74d', desc: '바람이 강해 원투·보트 낚시에 불리합니다', score: 2 };
  }
  if (temp < 5) {
    return { label: '한냉기 낚시', color: '#90caf9', desc: '저체온 주의. 방어·대구 등 겨울 어종 시즌', score: 3 };
  }
  if (temp > 28) {
    return { label: '혹서기 낚시', color: '#ff8a65', desc: '새벽·저녁 시간대 출조를 권장합니다', score: 3 };
  }
  if (windSpeed > 5 || (precipitationProb ?? 0) >= 40) {
    return { label: '보통', color: '#4caf50', desc: '바람·강수 가능성이 있으나 출조 가능합니다', score: 4 };
  }
  return { label: '낚시 최적', color: '#2e7d32', desc: '기온·바람·강수 조건이 양호합니다', score: 5 };
}
