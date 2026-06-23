const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
const SCRIPT_ID = 'kakao-maps-sdk';

let loadPromise: Promise<void> | null = null;
let ready = false;

export function getKakaoMapKeyMissing(): boolean {
  return !KAKAO_KEY;
}

export function isKakaoMapReady(): boolean {
  return ready;
}

/** 카 SDK를 한 번만 로드합니다. 여러 컴포넌트에서 동시 호출해도 안전합니다. */
export function preloadKakaoMap(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (ready) {
    return Promise.resolve();
  }

  if (!KAKAO_KEY) {
    return Promise.reject(new Error('NEXT_PUBLIC_KAKAO_MAP_API_KEY가 설정되지 않았습니다.'));
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const finish = () => {
      ready = true;
      resolve();
    };

    const initFromWindow = () => {
      if (typeof window.kakao?.maps?.load === 'function') {
        window.kakao.maps.load(finish);
        return true;
      }
      return false;
    };

    if (initFromWindow()) {
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => {
        if (!initFromWindow()) {
          reject(new Error('카카오맵 SDK 초기화 함수를 찾을 수 없습니다.'));
        }
      }, { once: true });
      existing.addEventListener('error', () => {
        reject(new Error('카카오맵 SDK 스크립트를 불러오지 못했습니다.'));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;
    script.onload = () => {
      if (!initFromWindow()) {
        reject(new Error('카카오맵 SDK 초기화 함수를 찾을 수 없습니다.'));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('카카오맵 SDK 스크립트를 불러오지 못했습니다.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
