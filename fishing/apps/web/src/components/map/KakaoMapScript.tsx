'use client';

import { useEffect } from 'react';
import { getKakaoMapKeyMissing, preloadKakaoMap } from '@/lib/kakao-map-loader';

type Props = {
  onReady: () => void;
  onError: (message: string) => void;
};

/** @deprecated RankingShell 프리로더 + preloadKakaoMap() 사용 권장 */
export default function KakaoMapScript({ onReady, onError }: Props) {
  useEffect(() => {
    if (getKakaoMapKeyMissing()) return;

    preloadKakaoMap()
      .then(onReady)
      .catch((err: Error) => onError(err.message));
  }, [onReady, onError]);

  return null;
}

export { getKakaoMapKeyMissing };
